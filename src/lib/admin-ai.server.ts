import { z } from "zod";
import { adminSnapshot, type AdminWorkspace } from "./admin-workspace.ts";
export const adminAiOutput = z.object({
  summary: z.string().min(1).max(2000),
  strengths: z.array(z.string().max(600)).max(5),
  concerns: z.array(z.string().max(600)).max(5),
  recommendations: z
    .array(
      z.object({
        reference: z.string().max(10),
        reason: z.string().max(700),
        action: z.string().max(700),
      }),
    )
    .max(12),
  limitations: z.array(z.string().max(600)).min(1).max(5),
});
export async function generateAdminSummary(
  data: AdminWorkspace,
  options: { key: string; model: string; fetcher?: typeof fetch },
) {
  if (!options.key) throw new Error("Gemini não configurado no servidor.");
  if (!/^[a-zA-Z0-9._-]+$/.test(options.model)) throw new Error("Modelo inválido.");
  const snapshot = adminSnapshot(data);
  if (!snapshot.users.length) throw new Error("Nenhum usuário disponível para resumir.");
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(
      `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": options.key },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "Você é um assistente de gestão do INOVA, em português. Todos os dados são fictícios de demonstração. Analise SOMENTE o snapshot fornecido. Nunca invente métricas, receitas, causas de inatividade ou intenção de cancelamento. Uso recente e status de conta são conceitos distintos. Em uso=até 7 dias; Atenção=8 a 30 dias; Sem uso recente=mais de 30 dias, apenas em contas habilitadas. Não afirmar abandono: pouco uso é um sinal para investigar. Satisfação vem APENAS da última nota registrada: 4/5 positivo, 3 neutro, 1/2 negativo, sem nota desconhecido. Ausência de uso não determina satisfação. mrrMonthlyBRL já está em REAIS (BRL), não em centavos: 249 significa R$ 249,00. Apresente sempre como MRR simulado de assinaturas Ativas, nunca receita recebida. Trial/Teste e pagamentos pendentes não entram no MRR. Não recomendar acesso a prontuários. Não executar ações, contatos ou bloqueios. references são U1 etc; não misture usuários. Retorne JSON {summary,strengths:[],concerns:[],recommendations:[{reference,reason,action}],limitations:[]}. Inclua limitações: dados fictícios e amostra pequena; atividade não prova satisfação. Sugira ações manuais e proporcionais à evidência.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(snapshot) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 6000,
            ...(options.model.startsWith("gemini-2.5-flash")
              ? { thinkingConfig: { thinkingBudget: 0 } }
              : options.model.startsWith("gemini-3")
                ? { thinkingConfig: { thinkingLevel: "low" } }
                : {}),
            responseJsonSchema: {
              type: "object",
              required: ["summary", "strengths", "concerns", "recommendations", "limitations"],
              properties: {
                summary: { type: "string", maxLength: 2000 },
                strengths: {
                  type: "array",
                  maxItems: 5,
                  items: { type: "string", maxLength: 600 },
                },
                concerns: { type: "array", maxItems: 5, items: { type: "string", maxLength: 600 } },
                limitations: {
                  type: "array",
                  minItems: 1,
                  maxItems: 5,
                  items: { type: "string", maxLength: 600 },
                },
                recommendations: {
                  type: "array",
                  maxItems: 8,
                  items: {
                    type: "object",
                    required: ["reference", "reason", "action"],
                    properties: {
                      reference: {
                        type: "string",
                        enum: snapshot.users.map((user) => user.reference),
                      },
                      reason: { type: "string", maxLength: 700 },
                      action: { type: "string", maxLength: 700 },
                    },
                  },
                },
              },
            },
          },
        }),
      },
    );
  } catch {
    throw new Error("Não foi possível conectar à IA. Tente novamente.");
  }
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Limite de uso da IA atingido. Tente mais tarde."
        : "Não foi possível gerar o resumo da IA.",
    );
  try {
    const raw = await response.json(),
      candidate = raw.candidates?.[0];
    if (candidate?.finishReason !== "STOP") throw new Error("incomplete");
    const text = candidate.content.parts
      .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
      .map((p: { text: string }) => p.text)
      .join("");
    const output = adminAiOutput.parse(JSON.parse(text));
    if (
      output.recommendations.some(
        (item) => !snapshot.users.some((user) => user.reference === item.reference),
      )
    )
      throw new Error("reference");
    return output;
  } catch {
    throw new Error("A IA retornou um resumo incompleto ou inválido. Nenhuma ação foi aplicada.");
  }
}
