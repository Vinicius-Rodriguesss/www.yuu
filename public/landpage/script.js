// YuU — Landing page (HTML/CSS/JS puro)

// TODO: atualizar para o domínio de produção da API quando publicar
const API_URL = "http://localhost:3000";

// Header muda de estilo ao rolar: transparente sobre o hero escuro, claro sobre o resto da página
(function headerScroll() {
  const header = document.getElementById("site-header");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 64);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

// Ano corrente no footer
(function footerYear() {
  const el = document.getElementById("footer-year");
  if (el) {
    el.textContent = `© ${new Date().getFullYear()} YuU. Todos os direitos reservados.`;
  }
})();

// Formulário de contato — POST /contact (público, sem autenticação)
(function contactForm() {
  const form = document.getElementById("contact-form");
  const errorEl = document.getElementById("contact-error");
  const successEl = document.getElementById("contact-success");
  const submitBtn = document.getElementById("contact-submit");
  const btnLabel = submitBtn ? submitBtn.querySelector(".btn-label") : null;
  if (!form || !errorEl || !successEl || !submitBtn) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const showError = (message) => {
    errorEl.textContent = message;
    errorEl.hidden = false;
  };

  const clearError = () => {
    errorEl.hidden = true;
    errorEl.textContent = "";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const message = form.message.value.trim();

    if (!name) {
      showError("Informe seu nome");
      return;
    }
    if (!emailRegex.test(email)) {
      showError("Informe um email válido");
      return;
    }
    if (!message) {
      showError("Informe sua mensagem");
      return;
    }

    submitBtn.disabled = true;
    if (btnLabel) btnLabel.textContent = "Enviando...";

    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          message,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data && data.error) || "Erro ao enviar mensagem");
      }

      form.hidden = true;
      successEl.hidden = false;
      form.reset();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erro ao enviar mensagem");
      submitBtn.disabled = false;
      if (btnLabel) btnLabel.textContent = "Enviar mensagem";
    }
  });
})();
