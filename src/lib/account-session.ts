import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { databaseConfig, databaseRequest } from "./supabase.server";
import { canAccessMedicalPreview } from "./medical-preview-policy";
const cookie = "inova-account";
function config() {
  const value = databaseConfig();
  if (!value) throw new Error("Acesso real ainda não configurado.");
  return value;
}
function guard() {
  const request = getRequest();
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new Error("Solicitação não autorizada.");
}
async function userFor(token: string) {
  const env = config();
  const response = await fetch(`${env.url}/auth/v1/user`, {
    headers: { apikey: env.key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Sua sessão expirou. Entre novamente.");
  const user = await response.json();
  if (!user.email_confirmed_at || !z.string().uuid().safeParse(user.id).success)
    throw new Error("Confirme seu e-mail antes de entrar.");
  return user as { id: string; email: string };
}
async function establish(token: string) {
  const user = await userFor(token);
  const records = (await databaseRequest(
    config(),
    `inova_account_details?user_id=eq.${user.id}&select=account_type&limit=1`,
  )) as { account_type: string }[];
  if (!records[0]) throw new Error("Esta conta ainda não possui cadastro INOVA.");
  setCookie(cookie, token, {
    httpOnly: true,
    secure: new URL(getRequest().url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });
  return { role: records[0].account_type };
}
const attempts = new Map<string, { count: number; expires: number }>();
export const signInAccount = createServerFn({ method: "POST" })
  .validator(
    z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }),
  )
  .handler(async ({ data }) => {
    guard();
    const now = Date.now();
    for (const [key, value] of attempts) if (value.expires < now) attempts.delete(key);
    const key = data.email.toLowerCase();
    const entry = attempts.get(key) ?? { count: 0, expires: now + 60000 };
    if (++entry.count > 5 || attempts.size > 1000)
      throw new Error("Aguarde um minuto antes de tentar novamente.");
    attempts.set(key, entry);
    const env = config();
    const response = await fetch(`${env.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: env.key, "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!response?.ok)
      throw new Error("Não foi possível entrar. Confira e-mail, senha e confirmação do e-mail.");
    const result = await response.json();
    return establish(z.string().min(20).max(8192).parse(result.access_token));
  });
export const confirmAccountSession = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(20).max(8192) }))
  .handler(async ({ data }) => {
    guard();
    return establish(data.token);
  });
export const getAccountSession = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(cookie);
  if (!token) return null;
  const user = await userFor(token);
  const details = (await databaseRequest(
    config(),
    `inova_account_details?user_id=eq.${user.id}&select=full_name,account_type,professional_status&limit=1`,
  )) as { full_name: string; account_type: string; professional_status: string }[];
  if (!details[0]) return null;
  const subscriptions = (await databaseRequest(
    config(),
    `inova_subscriptions?user_id=eq.${user.id}&select=status&limit=1`,
  )) as { status: string }[];
  return {
    userId: user.id,
    email: user.email,
    ...details[0],
    subscription: subscriptions[0]?.status ?? null,
    canPreview: canAccessMedicalPreview(
      user.email,
      details[0].account_type,
      process.env["INOVA_MEDICAL_PREVIEW_EMAIL"],
    ),
  };
});
export const signOutAccount = createServerFn({ method: "POST" }).handler(async () => {
  guard();
  deleteCookie(cookie, { path: "/" });
  return { ok: true };
});
export const recoverAccount = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email().max(254) }))
  .handler(async ({ data }) => {
    guard();
    const env = config();
    const origin = new URL(getRequest().url).origin;
    const response = await fetch(
      `${env.url}/auth/v1/recover?redirect_to=${encodeURIComponent(origin + "/confirmar-email")}`,
      {
        method: "POST",
        headers: { apikey: env.key, "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000),
      },
    ).catch(() => null);
    if (!response?.ok)
      throw new Error("Não foi possível solicitar a recuperação. Aguarde e tente novamente.");
    return { ok: true };
  });
export const updateAccountPassword = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(12).max(128) }))
  .handler(async ({ data }) => {
    guard();
    const token = getCookie(cookie);
    if (!token) throw new Error("Abra novamente o link de recuperação.");
    await userFor(token);
    const env = config();
    const response = await fetch(`${env.url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: env.key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!response?.ok) throw new Error("Não foi possível atualizar a senha.");
    deleteCookie(cookie, { path: "/" });
    return { ok: true };
  });
