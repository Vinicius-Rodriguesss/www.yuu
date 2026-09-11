// Services/AdvanceOffers/config.ts
// Parâmetros do fluxo de antecipação de horário. Centralizados pra facilitar ajuste.

/** Só oferece antecipação se o profissional terminou pelo menos isto antes do fim previsto. */
export const EARLY_FINISH_MIN = 15;

/** Só oferece a um cliente se o horário dele adiantar pelo menos isto. */
export const MIN_GAIN_MIN = 15;

/** Prazo (real, em minutos) pra o cliente responder antes de contar como recusa. */
export const RESPONSE_WINDOW_MIN = 10;

/** Fuso do negócio (Brasil) em minutos a leste de UTC — mesmo padrão do reminderJob. */
export const appTzOffsetMin = () => {
  const v = Number(process.env.APP_TZ_OFFSET_MIN);
  return isNaN(v) ? -180 : v;
};

/** "Agora" como hora de parede local, no frame UTC (mesmo frame dos agendamentos). */
export const wallNow = () => new Date(Date.now() + appTzOffsetMin() * 60 * 1000);

/**
 * Base pública da API pra montar os links dos e-mails de antecipação — as
 * páginas de aceite/recusa são servidas pelo próprio backend. Configure
 * PUBLIC_API_URL em produção (ex: https://api.seudominio.com).
 */
export const publicApiBaseUrl = () => {
  const raw = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`;
  return raw.split(",")[0]!.trim().replace(/\/+$/, "");
};
