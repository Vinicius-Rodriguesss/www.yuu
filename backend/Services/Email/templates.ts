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
