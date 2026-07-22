/**
 * Camada genérica de acesso a um provedor de IA.
 *
 * Não amarra o projeto a nenhuma IA específica: qualquer serviço compatível
 * com o formato "chat completions" (OpenAI, Groq, OpenRouter, Together,
 * DeepSeek, Ollama, etc.) funciona apenas configurando as variáveis de
 * ambiente abaixo — nenhuma mudança de código é necessária para trocar de IA.
 *
 * Variáveis de ambiente (definir no .env da raiz):
 *   AI_API_URL   - URL base do provedor, ex: https://api.openai.com/v1
 *   AI_API_KEY   - chave de API do provedor
 *   AI_MODEL     - identificador do modelo, ex: gpt-4o-mini
 *
 * Fila de concorrência: quando vários clientes conversam ao mesmo tempo, as
 * chamadas ao provedor de IA são enfileiradas (em memória, FIFO) em vez de
 * disparadas todas em paralelo — evita estourar rate limit/custo do
 * provedor. Ajustável via AI_MAX_CONCURRENT (padrão 5).
 */
import PQueue from "p-queue";

const aiQueue = new PQueue({ concurrency: Number(process.env.AI_MAX_CONCURRENT) || 5 });

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("Assistente de IA não configurado");
    this.name = "AiNotConfiguredError";
  }
}

export const isAiConfigured = () =>
  Boolean(process.env.AI_API_URL && process.env.AI_API_KEY && process.env.AI_MODEL);

export const callAiProvider = async (
  systemPrompt: string,
  history: ChatMessage[]
): Promise<string> => {
  if (!isAiConfigured()) {
    throw new AiNotConfiguredError();
  }

  // Enfileira: no máximo `concurrency` chamadas ao provedor rodando ao mesmo
  // tempo; o resto espera a vez (FIFO) em vez de disparar tudo em paralelo.
  return aiQueue.add(async () => {
    const baseUrl = process.env.AI_API_URL!.replace(/\/+$/, "");

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...history],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Provedor de IA retornou ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("Resposta da IA em formato inesperado");
    }

    return reply.trim();
  }) as Promise<string>;
};
