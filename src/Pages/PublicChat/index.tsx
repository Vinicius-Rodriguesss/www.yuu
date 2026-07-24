import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { FiSend, FiCalendar, FiLogOut } from "react-icons/fi";
import { apiFetch, clientApiFetch, getClientSession, clearClientSession } from "@/api/client";
import ClientAuthGate from "@/Components/ClientAuthGate";
import "./index.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PublicProfile {
  name: string;
  businessType: string;
  homeService: boolean;
  services: { id: number; title: string; description: string | null; duration: number; price: string; category: string | null }[];
}

const PublicChatInner = ({ profile, slug }: { profile: PublicProfile | null; slug: string }) => {
  const client = getClientSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !slug || sending) return;

    setError(null);
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setSending(true);

    try {
      const data = await clientApiFetch(`/public/${slug}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: text, history: messages }),
      });
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }, [input, slug, sending, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="pchat-page">
      <header className="pchat-header">
        <div className="pchat-avatar">{profile?.name?.[0]?.toUpperCase() ?? "?"}</div>
        <div className="pchat-header-info">
          <strong>{profile?.name ?? "Carregando..."}</strong>
          <small>{profile?.businessType ?? ""}</small>
        </div>
        {slug && (
          <Link to={`/p/${slug}/agendar`} className="pchat-header-link">
            <FiCalendar size={13} /> Agendar direto
          </Link>
        )}
        <button
          className="pchat-logout"
          onClick={() => { clearClientSession(); window.location.reload(); }}
          title="Sair da conta"
        >
          <FiLogOut size={13} /> Sair
        </button>
      </header>

      <div className="pchat-messages">
        {messages.length === 0 && (
          <div className="pchat-empty">
            <p>
              {client ? `Olá, ${client.name.split(" ")[0]}! ` : ""}
              Diga olá para começar a conversar com o assistente de {profile?.name ?? "este profissional"}.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`pchat-bubble pchat-bubble-${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="pchat-bubble pchat-bubble-assistant pchat-typing">
            <span />
            <span />
            <span />
          </div>
        )}
        {error && <div className="pchat-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="pchat-inputbar">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          rows={1}
          disabled={sending}
        />
        <button onClick={sendMessage} disabled={sending || !input.trim()} aria-label="Enviar">
          <FiSend size={18} />
        </button>
      </div>
    </div>
  );
};

const PublicChat = () => {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    apiFetch(`/public/${slug}`)
      .then((data) => setProfile(data))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="pchat-page pchat-center">
        <p>Página não encontrada.</p>
      </div>
    );
  }

  return (
    <ClientAuthGate businessName={profile?.name}>
      <PublicChatInner profile={profile} slug={slug ?? ""} />
    </ClientAuthGate>
  );
};

export default PublicChat;
