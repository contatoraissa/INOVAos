import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { confirmAccountSession, updateAccountPassword } from "@/lib/account-session";
import { accountLanding } from "@/lib/account-landing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/inova/Logo";
export const Route = createFileRoute("/confirmar-email")({ component: Confirmation });
function Confirmation() {
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Verificando confirmação…");
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("access_token");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setMessage(
        "O link expirou ou não contém uma sessão. Se já confirmou seu e-mail, entre com sua senha.",
      );
      return;
    }
    void confirmAccountSession({ data: { token } })
      .then((account) => {
        if (params.get("type") === "recovery") {
          setRecovery(true);
          setMessage("Escolha uma nova senha para sua conta.");
        } else window.location.replace(accountLanding(account));
      })
      .catch(() =>
        setMessage("Não foi possível abrir a sessão. Entre com seu e-mail e senha para continuar."),
      );
  }, []);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="max-w-md rounded-2xl border bg-white p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">Confirmação de e-mail</h1>
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
        {recovery && (
          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const password = String(form.get("password"));
              if (password !== form.get("confirmation")) {
                setMessage("As senhas precisam ser iguais.");
                return;
              }
              setBusy(true);
              try {
                await updateAccountPassword({ data: { password } });
                setRecovery(false);
                setMessage("Senha atualizada. Entre novamente com sua nova senha.");
              } catch {
                setMessage("Não foi possível alterar a senha. Confira os dados e tente novamente.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="label" htmlFor="new-password">
              Nova senha (mínimo 12 caracteres)
            </label>
            <Input
              id="new-password"
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
              disabled={busy}
            />
            <label className="label" htmlFor="confirm-password">
              Confirmar nova senha
            </label>
            <Input
              id="confirm-password"
              name="confirmation"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
              disabled={busy}
            />
            <Button disabled={busy}>{busy ? "Salvando…" : "Salvar nova senha"}</Button>
          </form>
        )}
        <Link to="/acesso" className="mt-6 inline-block text-brand-deep">
          Entrar na conta
        </Link>
      </section>
    </main>
  );
}
