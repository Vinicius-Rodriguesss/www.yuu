// Auth/Middleware/rateLimit.ts
//
// Rate limiters por IP para rotas públicas sensíveis a brute-force e spam
// (login, cadastro, recuperação de senha, contato). Cada rota usa o limiter
// que combina com o risco: login/código aceitam mais tentativas em janelas
// curtas (erro de digitação é comum), cadastro e contato são mais restritos
// por janela mais longa (custo de abuso é maior: emails, contas fake).

import rateLimit from "express-rate-limit";

const jsonRateLimitHandler = (message: string) => (_req: unknown, res: any) => {
  res.status(429).json({ error: message });
};

// Login e verificação de código 2FA — 10 tentativas / 15 min por IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler("Muitas tentativas de login. Tente novamente em alguns minutos."),
});

// Esqueci minha senha / redefinição — 5 tentativas / 15 min por IP.
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler("Muitas tentativas. Tente novamente em alguns minutos."),
});

// Criação de conta (profissional ou cliente final) — 10 / hora por IP.
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler("Muitas contas criadas a partir deste endereço. Tente novamente mais tarde."),
});

// Formulário de contato — 5 / hora por IP.
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler("Muitas mensagens enviadas. Tente novamente mais tarde."),
});
