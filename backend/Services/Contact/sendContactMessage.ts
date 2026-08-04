/**
 * Service: SendContactMessage
 *
 * Responsabilidade:
 * Receber uma mensagem do formulário de contato da landing page (endpoint
 * público, sem autenticação) e encaminhar por email para o admin do
 * sistema (CONTACT_ADMIN_EMAIL), com replyTo apontando pro remetente.
 */

import type { Request, Response } from "express";
import { sendMail, SmtpNotConfiguredError } from "../Email/mailer.js";
import { contactMessageEmailTemplate } from "../Email/templates.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const SendContactMessage = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Informe o nome" });
    }
    if (!email || !emailRegex.test(String(email).trim())) {
      return res.status(400).json({ error: "Informe um email válido" });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Informe a mensagem" });
    }

    const adminEmail = process.env.CONTACT_ADMIN_EMAIL || process.env.SMTP_USER;
    if (!adminEmail) {
      console.error("CONTACT_ADMIN_EMAIL/SMTP_USER não configurado");
      return res.status(500).json({ error: "Erro ao enviar mensagem" });
    }

    const trimmedEmail = String(email).trim();
    const { subject, html } = contactMessageEmailTemplate({
      name: escapeHtml(String(name).trim()),
      email: escapeHtml(trimmedEmail),
      phone: phone ? escapeHtml(String(phone).trim()) : null,
      message: escapeHtml(String(message).trim()),
    });

    await sendMail(adminEmail, subject, html, undefined, trimmedEmail);

    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) {
      console.error("SMTP não configurado — não é possível enviar email de contato");
      return res.status(500).json({ error: "Erro ao enviar mensagem" });
    }
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
};

export default SendContactMessage;
