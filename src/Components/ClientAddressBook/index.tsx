/**
 * ClientAddressBook — lista de endereços da conta do CLIENTE FINAL, com
 * criar/editar/excluir e seleção do endereço principal. Usado na etapa de
 * atendimento a domicílio (PublicBooking): o cliente escolhe entre os
 * salvos ou cadastra um novo, sem perder os anteriores.
 */
import { useState, useEffect, useCallback } from "react";
import { FiHome, FiEdit2, FiTrash2, FiPlus, FiStar, FiX } from "react-icons/fi";
import { clientApiFetch, type ClientAddress } from "@/api/client";
import { formatCEP, type ViaCEPResponse } from "../../SignUp/passwordValidation";
import "./index.css";

const emptyForm = { label: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

interface ClientAddressBookProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const ClientAddressBook = ({ selectedId, onSelect }: ClientAddressBookProps) => {
  const [addresses, setAddresses] = useState<ClientAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cepStatus, setCepStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data: ClientAddress[] = await clientApiFetch("/client/addresses");
      setAddresses(data);
      if (data.length > 0 && !selectedId) {
        const primary = data.find((a) => a.isPrimary) ?? data[0];
        onSelect(primary.id);
      }
      if (data.length === 0) setEditingId("new");
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Busca o endereço automaticamente quando o CEP tem 8 dígitos (só ao criar/editar)
  useEffect(() => {
    if (editingId === null) return;
    const numbers = form.cep.replace(/\D/g, "");
    if (numbers.length !== 8) {
      setCepStatus(numbers.length > 0 ? { type: "error", message: "CEP deve conter 8 dígitos." } : null);
      return;
    }
    setCepStatus({ type: "loading", message: "Buscando endereço..." });
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
        const data: ViaCEPResponse & { erro?: boolean } = await response.json();
        if (data.erro) {
          setCepStatus({ type: "error", message: "CEP não encontrado." });
          return;
        }
        setForm((p) => ({
          ...p,
          street: data.logradouro || p.street,
          neighborhood: data.bairro || p.neighborhood,
          city: data.localidade || p.city,
          state: data.uf || p.state,
        }));
        setCepStatus({ type: "success", message: "Endereço encontrado!" });
      } catch {
        setCepStatus({ type: "error", message: "Erro ao buscar CEP." });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.cep, editingId]);

  const startCreate = () => {
    setForm({ ...emptyForm });
    setError("");
    setCepStatus(null);
    setEditingId("new");
  };

  const startEdit = (a: ClientAddress) => {
    setForm({
      label: a.label ?? "",
      cep: a.cep,
      street: a.street,
      number: a.number,
      complement: a.complement ?? "",
      neighborhood: a.neighborhood,
      city: a.city,
      state: a.state,
    });
    setError("");
    setCepStatus(null);
    setEditingId(a.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError("");
  };

  const save = async () => {
    if (!form.cep || !form.street || !form.number || !form.neighborhood || !form.city || !form.state) {
      setError("Preencha o endereço completo");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId === "new") {
        const created: ClientAddress = await clientApiFetch("/client/addresses", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setAddresses((prev) => [...prev, created]);
        onSelect(created.id);
      } else if (typeof editingId === "number") {
        const updated: ClientAddress = await clientApiFetch(`/client/addresses/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar endereço");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Remover este endereço?")) return;
    try {
      await clientApiFetch(`/client/addresses/${id}`, { method: "DELETE" });
      const remaining = addresses.filter((a) => a.id !== id);
      setAddresses(remaining);
      if (selectedId === id) {
        const nextPrimary = remaining.find((a) => a.isPrimary) ?? remaining[0];
        if (nextPrimary) onSelect(nextPrimary.id);
      }
      if (remaining.length === 0) setEditingId("new");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover endereço");
    }
  };

  const makePrimary = async (a: ClientAddress) => {
    try {
      const updated: ClientAddress = await clientApiFetch(`/client/addresses/${a.id}`, {
        method: "PUT",
        body: JSON.stringify({
          label: a.label ?? "",
          cep: a.cep,
          street: a.street,
          number: a.number,
          complement: a.complement ?? "",
          neighborhood: a.neighborhood,
          city: a.city,
          state: a.state,
          isPrimary: true,
        }),
      });
      setAddresses((prev) => prev.map((x) => (x.id === updated.id ? updated : { ...x, isPrimary: false })));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao definir endereço principal");
    }
  };

  if (loading) return <p className="cab-empty">Carregando endereços...</p>;

  return (
    <div className="cab">
      {addresses.length > 0 && (
        <div className="cab-list">
          {addresses.map((a) => (
            <div key={a.id} className={`cab-item ${selectedId === a.id ? "selected" : ""}`}>
              <button className="cab-item-select" onClick={() => onSelect(a.id)}>
                <span className="cab-item-icon"><FiHome size={13} /></span>
                <span className="cab-item-info">
                  <strong>
                    {a.label || "Endereço"} {a.isPrimary && <span className="cab-primary-tag">Principal</span>}
                  </strong>
                  <small>{a.street}, {a.number} — {a.neighborhood}, {a.city}/{a.state}</small>
                </span>
              </button>
              <div className="cab-item-actions">
                {!a.isPrimary && (
                  <button title="Tornar principal" onClick={() => makePrimary(a)}>
                    <FiStar size={13} />
                  </button>
                )}
                <button title="Editar" onClick={() => startEdit(a)}>
                  <FiEdit2 size={13} />
                </button>
                <button title="Excluir" onClick={() => remove(a.id)} className="cab-item-delete">
                  <FiTrash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId === null && (
        <button className="cab-add" onClick={startCreate}>
          <FiPlus size={13} /> Adicionar endereço
        </button>
      )}

      {editingId !== null && (
        <div className="cab-form">
          <div className="cab-form-head">
            <strong>{editingId === "new" ? "Novo endereço" : "Editar endereço"}</strong>
            {addresses.length > 0 && (
              <button className="cab-form-close" onClick={cancelEdit} aria-label="Cancelar">
                <FiX size={16} />
              </button>
            )}
          </div>

          {error && <div className="cab-error">{error}</div>}

          <div className="cab-field">
            <label>Nome do endereço (opcional)</label>
            <input value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} placeholder="Casa, Trabalho..." />
          </div>
          <div className="cab-field-row">
            <div className="cab-field">
              <label>CEP</label>
              <input value={form.cep} onChange={(e) => setForm((p) => ({ ...p, cep: formatCEP(e.target.value) }))} placeholder="00000-000" />
              {cepStatus && (
                <small className={`cab-cep-status cab-cep-status-${cepStatus.type}`}>
                  {cepStatus.type === "loading" ? "Buscando..." : cepStatus.message}
                </small>
              )}
            </div>
            <div className="cab-field">
              <label>Número</label>
              <input value={form.number} onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))} />
            </div>
          </div>
          <div className="cab-field">
            <label>Rua</label>
            <input value={form.street} onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))} />
          </div>
          <div className="cab-field">
            <label>Complemento (opcional)</label>
            <input value={form.complement} onChange={(e) => setForm((p) => ({ ...p, complement: e.target.value }))} />
          </div>
          <div className="cab-field-row">
            <div className="cab-field">
              <label>Bairro</label>
              <input value={form.neighborhood} onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))} />
            </div>
            <div className="cab-field">
              <label>Cidade</label>
              <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            </div>
          </div>
          <div className="cab-field">
            <label>UF</label>
            <input maxLength={2} value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))} />
          </div>

          <button className="cab-save" disabled={saving} onClick={save}>
            {saving ? "Salvando..." : "Salvar endereço"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientAddressBook;
