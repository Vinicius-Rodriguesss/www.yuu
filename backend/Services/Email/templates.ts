/**
 * Templates de email — um por tipo de chamada do SMTP.
 * Layout simples e consistente, sem dependências externas.
 */

const layout = (title: string, bodyHtml: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececec;">
            <tr>
              <td style="background:#000000;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.02em;">ai.yuu</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #ececec;">
                <span style="font-size:12px;color:#9b9b9b;">Se você não reconhece esta ação, ignore este email.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const codeBlock = (code: string) => `
  <div style="margin:24px 0;text-align:center;">
    <span style="display:inline-block;padding:14px 28px;background:#f1f1ef;border-radius:8px;font-size:28px;font-weight:700;letter-spacing:8px;color:#1a1a1a;">${code}</span>
  </div>
  <p style="margin:0;font-size:13px;color:#6b6b6b;">Este código expira em 10 minutos.</p>
`;

export const welcomeEmailTemplate = (name: string) => ({
  subject: "Bem-vindo(a) ao ai.yuu!",
  html: layout(
    "Cadastro concluído",
    `<p style="margin:0 0 12px;font-size:14px;color:#37352f;">Olá, <strong>${name}</strong>! Sua conta no ai.yuu foi criada com sucesso.</p>
     <p style="margin:0;font-size:14px;color:#37352f;">Agora você já pode configurar seus serviços, sua agenda e gerar seu link público de agendamento.</p>`
  ),
});

export const loginCodeEmailTemplate = (name: string, code: string) => ({
  subject: "Seu código de acesso — ai.yuu",
  html: layout(
    "Confirme seu login",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Olá, <strong>${name}</strong>! Use o código abaixo para concluir seu login:</p>
     ${codeBlock(code)}`
  ),
});

export const passwordResetCodeEmailTemplate = (name: string, code: string) => ({
  subject: "Código para redefinir sua senha — ai.yuu",
  html: layout(
    "Redefinição de senha",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Olá, <strong>${name}</strong>! Recebemos um pedido para redefinir sua senha. Use o código abaixo:</p>
     ${codeBlock(code)}`
  ),
});

export const passwordChangeCodeEmailTemplate = (name: string, code: string) => ({
  subject: "Código para alterar sua senha — ai.yuu",
  html: layout(
    "Confirmar troca de senha",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Olá, <strong>${name}</strong>! Confirme a troca da sua senha com o código abaixo:</p>
     ${codeBlock(code)}`
  ),
});

// ===================== Antecipação de horário =====================

export interface AdvanceOfferEmailInfo {
  clientName: string;
  professionalName: string;
  serviceTitle: string;
  currentLabel: string; // "sexta-feira, 24 de julho às 15:00"
  newLabel: string; // "sexta-feira, 24 de julho às 14:35"
  respondUrl: string; // página com os botões Aceitar / Manter (GET, seguro contra pré-carregamento)
  unsubscribeUrl: string;
}

export const advanceOfferEmailTemplate = (info: AdvanceOfferEmailInfo) => ({
  subject: `Dá pra adiantar seu horário com ${info.professionalName}?`,
  html: layout(
    "Seu horário pode ser adiantado",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Olá, <strong>${info.clientName}</strong>! ${info.professionalName} terminou um atendimento mais cedo e o seu horário pode ser adiantado:</p>
     <table cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fafafa;border-radius:8px;width:100%;">
       <tr><td style="padding:14px 18px;">
         <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Serviço</p>
         <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;font-weight:700;">${info.serviceTitle}</p>
         <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Horário atual</p>
         <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;text-transform:capitalize;">${info.currentLabel}</p>
         <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Novo horário proposto</p>
         <p style="margin:0;font-size:15px;color:#1a1a1a;font-weight:700;text-transform:capitalize;">${info.newLabel}</p>
       </td></tr>
     </table>
     <p style="margin:0 0 16px;font-size:13px;color:#6b6b6b;">Seu horário atual continua garantido — só muda se você confirmar. <strong>Responda em até 10 minutos.</strong></p>
     <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
       <td style="padding:0 6px;"><a href="${info.respondUrl}" style="display:inline-block;padding:12px 26px;background:#000000;color:#ffffff;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">Ver e responder</a></td>
     </tr></table>
     <p style="margin:20px 0 0;font-size:11px;color:#9b9b9b;">Não quer mais receber ofertas para antecipar seus horários? <a href="${info.unsubscribeUrl}" style="color:#9b9b9b;">Desativar</a>.</p>`
  ),
});

/** Página (GET) com os botões que fazem POST de aceite/recusa — evita que scanners de e-mail "cliquem" sozinhos. */
export const advanceOfferDecisionPage = (info: {
  title: string;
  clientName: string;
  serviceTitle: string;
  currentLabel: string;
  newLabel: string;
  acceptAction: string;
  declineAction: string;
}) => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${info.title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;"><tr><td align="center">
    <table width="460" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #ececec;">
      <tr><td style="background:#000000;padding:20px 32px;"><span style="color:#ffffff;font-size:18px;font-weight:700;">ai.yuu</span></td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">Adiantar seu horário</h1>
        <p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">Serviço</p>
        <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;font-weight:700;">${info.serviceTitle}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">Horário atual</p>
        <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;text-transform:capitalize;">${info.currentLabel}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#6b6b6b;">Novo horário proposto</p>
        <p style="margin:0 0 24px;font-size:15px;color:#1a1a1a;font-weight:700;text-transform:capitalize;">${info.newLabel}</p>
        <form method="POST" action="${info.acceptAction}" style="display:inline-block;margin-right:8px;">
          <button type="submit" style="padding:12px 22px;background:#000000;color:#ffffff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Quero adiantar</button>
        </form>
        <form method="POST" action="${info.declineAction}" style="display:inline-block;">
          <button type="submit" style="padding:12px 22px;background:#ffffff;color:#1a1a1a;border:1px solid #d0d0d0;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Manter meu horário</button>
        </form>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

export const advanceOfferAcceptedProfessionalTemplate = (info: {
  clientName: string;
  serviceTitle: string;
  newLabel: string;
}) => ({
  subject: `${info.clientName} aceitou adiantar o horário`,
  html: layout(
    "Horário adiantado",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;"><strong>${info.clientName}</strong> aceitou adiantar o atendimento:</p>
     <table cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fafafa;border-radius:8px;width:100%;">
       <tr><td style="padding:14px 18px;">
         <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Serviço</p>
         <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;font-weight:700;">${info.serviceTitle}</p>
         <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Novo horário</p>
         <p style="margin:0;font-size:15px;color:#1a1a1a;font-weight:700;text-transform:capitalize;">${info.newLabel}</p>
       </td></tr>
     </table>`
  ),
});

/** Página HTML simples de resultado (aceite / recusa / opt-out) para abrir no navegador. */
export const advanceOfferResultPage = (title: string, message: string, tone: "ok" | "info" | "error" = "info") => {
  const color = tone === "ok" ? "#0f7b3f" : tone === "error" ? "#b3261e" : "#1a1a1a";
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;"><tr><td align="center">
    <table width="440" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #ececec;">
      <tr><td style="background:#000000;padding:20px 32px;"><span style="color:#ffffff;font-size:18px;font-weight:700;">ai.yuu</span></td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:18px;color:${color};">${title}</h1>
        <p style="margin:0;font-size:14px;color:#37352f;line-height:1.5;">${message}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
};

// ===================== Agendamentos =====================

export interface AppointmentEmailInfo {
  clientName: string;
  professionalName: string;
  serviceTitle: string;
  /** ex: "sexta-feira, 24 de julho" */
  dateLabel: string;
  /** ex: "14:30" */
  timeLabel: string;
  isHomeService?: boolean;
  cancellationReason?: string | null;
}

const appointmentDetails = (info: AppointmentEmailInfo) => `
  <table cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fafafa;border-radius:8px;width:100%;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Serviço</p>
      <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;font-weight:700;">${info.serviceTitle}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Quando</p>
      <p style="margin:0;font-size:15px;color:#1a1a1a;font-weight:700;text-transform:capitalize;">${info.dateLabel} às ${info.timeLabel}</p>
      ${info.isHomeService ? `<p style="margin:12px 0 0;font-size:13px;color:#6b6b6b;">🏠 Atendimento a domicílio</p>` : ""}
    </td></tr>
  </table>
`;

export const appointmentConfirmedClientTemplate = (info: AppointmentEmailInfo) => ({
  subject: `Agendamento confirmado com ${info.professionalName} — ai.yuu`,
  html: layout(
    "Agendamento confirmado ✅",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Olá, <strong>${info.clientName}</strong>! Seu horário com <strong>${info.professionalName}</strong> está confirmado:</p>
     ${appointmentDetails(info)}
     <p style="margin:0;font-size:13px;color:#6b6b6b;">Se precisar remarcar ou cancelar, entre em contato com o profissional.</p>`
  ),
});

export const appointmentConfirmedProfessionalTemplate = (info: AppointmentEmailInfo) => ({
  subject: `Novo agendamento: ${info.clientName} — ai.yuu`,
  html: layout(
    "Você tem um novo agendamento",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;"><strong>${info.clientName}</strong> agendou um horário com você:</p>
     ${appointmentDetails(info)}`
  ),
});

export const appointmentReminderClientTemplate = (info: AppointmentEmailInfo) => ({
  subject: `Lembrete: seu horário com ${info.professionalName} é daqui a pouco — ai.yuu`,
  html: layout(
    "Seu atendimento está chegando ⏰",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Olá, <strong>${info.clientName}</strong>! Passando pra lembrar do seu horário daqui a ~20 minutos:</p>
     ${appointmentDetails(info)}`
  ),
});

// ===================== Contato (landing page) =====================

export interface ContactMessageInfo {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}

export const contactMessageEmailTemplate = (info: ContactMessageInfo) => ({
  subject: `Nova mensagem de contato — ${info.name}`,
  html: layout(
    "Nova mensagem pelo formulário de contato",
    `<p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Nome</p>
     <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;font-weight:700;">${info.name}</p>
     <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Email</p>
     <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;font-weight:700;">${info.email}</p>
     ${
       info.phone
         ? `<p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Telefone</p>
     <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;font-weight:700;">${info.phone}</p>`
         : ""
     }
     <p style="margin:0 0 6px;font-size:13px;color:#6b6b6b;">Mensagem</p>
     <p style="margin:0;font-size:14px;color:#37352f;white-space:pre-wrap;">${info.message}</p>`
  ),
});

export const appointmentScheduleChangedClientTemplate = (info: AppointmentEmailInfo) => ({
  subject: `Atenção: horário de atendimento de ${info.professionalName} mudou — ai.yuu`,
  html: layout(
    "Seu agendamento pode precisar ser remarcado ⚠️",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Olá, <strong>${info.clientName}</strong>! <strong>${info.professionalName}</strong> alterou os horários de atendimento e o seu agendamento abaixo não está mais dentro da nova jornada:</p>
     ${appointmentDetails(info)}
     <p style="margin:0;font-size:13px;color:#6b6b6b;">Entre em contato com o profissional para confirmar ou remarcar esse horário.</p>`
  ),
});

export const appointmentCancelledClientTemplate = (info: AppointmentEmailInfo) => ({
  subject: `Agendamento cancelado — ${info.professionalName} — ai.yuu`,
  html: layout(
    "Seu agendamento foi cancelado ❌",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Olá, <strong>${info.clientName}</strong>! <strong>${info.professionalName}</strong> cancelou o horário abaixo:</p>
     ${appointmentDetails(info)}
     ${
       info.cancellationReason
         ? `<p style="margin:12px 0 0;font-size:13px;color:#6b6b6b;">Motivo: ${info.cancellationReason}</p>`
         : ""
     }
     <p style="margin:12px 0 0;font-size:13px;color:#6b6b6b;">Entre em contato com o profissional para remarcar.</p>`
  ),
});

export const appointmentCancelledProfessionalTemplate = (info: AppointmentEmailInfo) => ({
  subject: `${info.clientName} cancelou o agendamento — ai.yuu`,
  html: layout(
    "Um agendamento foi cancelado",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;"><strong>${info.clientName}</strong> cancelou o horário abaixo:</p>
     ${appointmentDetails(info)}`
  ),
});

export const appointmentRescheduledClientTemplate = (info: AppointmentEmailInfo) => ({
  subject: `Seu horário com ${info.professionalName} foi remarcado — ai.yuu`,
  html: layout(
    "Agendamento remarcado 🔄",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Olá, <strong>${info.clientName}</strong>! <strong>${info.professionalName}</strong> alterou seu horário. O novo agendamento é:</p>
     ${appointmentDetails(info)}
     <p style="margin:0;font-size:13px;color:#6b6b6b;">Se precisar remarcar ou cancelar, entre em contato com o profissional.</p>`
  ),
});

export const appointmentReminderProfessionalTemplate = (info: AppointmentEmailInfo) => ({
  subject: `Lembrete: ${info.clientName} daqui a ~20 min — ai.yuu`,
  html: layout(
    "Próximo atendimento chegando ⏰",
    `<p style="margin:0 0 8px;font-size:14px;color:#37352f;">Seu atendimento com <strong>${info.clientName}</strong> começa daqui a ~20 minutos:</p>
     ${appointmentDetails(info)}`
  ),
});
