export type DatabaseConfig = { url: string; key: string };
export function databaseConfig(
  environment: Record<string, string | undefined> = process.env,
): DatabaseConfig | null {
  const enabled = environment["INOVA_DATABASE_ENABLED"] === "true";
  if (!enabled) return null;
  const url = environment["SUPABASE_URL"] ?? "";
  const key = environment["SUPABASE_SECRET_KEY"] ?? "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Configure a URL do projeto Supabase no servidor.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/" ||
    !key
  )
    throw new Error(
      "Configuração Supabase incompleta ou inválida. Confira as variáveis do servidor.",
    );
  return { url: parsed.origin, key };
}
export async function databaseRequest(
  config: DatabaseConfig,
  path: string,
  body?: unknown,
  fetcher: typeof fetch = fetch,
) {
  try {
    const response = await fetcher(`${config.url}/rest/v1/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        apikey: config.key,
        ...(config.key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${config.key}` }),
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      if (response.status === 409)
        throw new Error(
          "Conflito no banco: já existe um retorno ativo ou a solicitação foi utilizada. Atualize a lista antes de tentar novamente.",
        );
      if (response.status === 400)
        throw new Error(
          "O banco rejeitou a operação. Confira data, estado do plano e a migração instalada.",
        );
      throw new Error(
        "Não foi possível acessar o banco Supabase. Confira configuração, conexão e migrações. Nenhum dado foi salvo apenas na memória como alternativa.",
      );
    }
    return await response.json();
  } catch (cause) {
    if (
      cause instanceof Error &&
      (cause.message.startsWith("Conflito no banco") ||
        cause.message.startsWith("O banco rejeitou") ||
        cause.message.startsWith("Não foi possível acessar o banco"))
    )
      throw cause;
    throw new Error(
      "Falha de conexão com o banco Supabase. Tente novamente; nenhum dado foi salvo apenas na memória como alternativa.",
    );
  }
}
