import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { accountInput } from "./account-contract";
import { databaseConfig } from "./supabase.server";

const attempts = new Map<string, { count: number; until: number }>();
export const registerAccount = createServerFn({ method: "POST" })
  .validator(accountInput)
  .handler(async ({ data }) => {
    const request = getRequest();
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      throw new Error("Solicitação de cadastro não autorizada.");
    const key = request.headers.get("cf-connecting-ip") ?? "local";
    const now = Date.now();
    for (const [id, attempt] of attempts) if (attempt.until < now) attempts.delete(id);
    const attempt = attempts.get(key) ?? { count: 0, until: now + 60000 };
    if (++attempt.count > 5 || attempts.size > 1000)
      throw new Error("Aguarde um minuto antes de tentar novamente.");
    attempts.set(key, attempt);
    const config = databaseConfig();
    if (!config) throw new Error("O cadastro ainda não está configurado.");
    // Fail before creating an Auth user when the profile migration has not been installed.
    const ready = await fetch(
      `${config.url}/rest/v1/inova_account_details?select=user_id&limit=0`,
      { headers: { apikey: config.key }, signal: AbortSignal.timeout(15000) },
    ).catch(() => null);
    if (!ready?.ok) throw new Error("Instale o SQL de cadastro no Supabase antes de criar contas.");
    const { password, consent: _consent, ...profile } = data;
    const redirect = `${origin}/confirmar-email`;
    const response = await fetch(
      `${config.url}/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`,
      {
        method: "POST",
        headers: { apikey: config.key, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password,
          data: { inova_registration: profile },
        }),
        signal: AbortSignal.timeout(20000),
      },
    ).catch(() => null);
    if (!response?.ok)
      throw new Error(
        response?.status === 429
          ? "Limite de envio de e-mails atingido. Aguarde e tente novamente."
          : "Não foi possível concluir o cadastro. Confira os dados ou tente recuperar sua conta existente.",
      );
    const result = await response.json();
    // Never expose tokens or automatically enter the demonstration as a registered patient.
    return { confirmationRequired: !result.access_token, role: data.role };
  });
