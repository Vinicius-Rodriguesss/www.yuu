/**
 * Transporte SMTP genérico (funciona com Gmail e qualquer outro provedor
 * SMTP padrão). Configurado via variáveis de ambiente no .env da raiz:
 *
 *   SMTP_HOST   - padrão: smtp.gmail.com
 *   SMTP_PORT   - padrão: 587
 *   SMTP_SECURE - padrão: false (STARTTLS na porta 587)
 *   SMTP_USER   - endereço de email (ex: seuapp@gmail.com)
 *   SMTP_PASS   - senha de app do Gmail (não é a senha normal da conta —
 *                 veja https://myaccount.google.com/apppasswords, exige
 *                 verificação em duas etapas ativada na conta Google)
 *   SMTP_FROM   - remetente exibido, ex: "ai.yuu <seuapp@gmail.com>"
 */

import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

export const isSmtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

export class SmtpNotConfiguredError extends Error {
  constructor() {
    super("SMTP não configurado");
    this.name = "SmtpNotConfiguredError";
  }
}

// E-mails só-HTML (sem versão texto) são um sinal clássico de spam para
// filtros como o do Gmail. Gera uma versão texto automaticamente a partir
// do HTML quando não for informada explicitamente.
const htmlToText = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|td|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const sendMail = async (to: string, subject: string, html: string, text?: string) => {
  if (!isSmtpConfigured()) {
    throw new SmtpNotConfiguredError();
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await getTransporter().sendMail({
    from,
    replyTo: from,
    to,
    subject,
    html,
    text: text || htmlToText(html),
  });
};
