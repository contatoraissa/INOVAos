import { signInAccount, recoverAccount } from "@/lib/account-session";
import { AccountRegistration } from "./AccountRegistration";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "./Logo";
import { toast } from "sonner";

export function LoginPage() {
  const [registering, setRegistering] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const values = new FormData(e.currentTarget);
    try {
      await signInAccount({
        data: { email: String(values.get("email")), password: String(values.get("password")) },
      });
      window.location.assign("/minha-conta");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
      setLoading(false);
    }
  };
  return (
    <main className="login-canvas">
      <section className="login-story">
        <div className="absolute inset-0 opacity-60 hero-grid" />
        <div className="relative z-10 max-w-xl">
          <div className="mb-16 inline-flex items-center gap-3 border-b border-brand/40 pb-5">
            <div className="text-white">
              <Logo className="text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-hero-muted">
              Laboratório de análises clínicas
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-bright">
            Inteligência laboratorial
          </p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-hero-foreground lg:text-5xl">
            Do resultado isolado à visão completa do paciente.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-hero-muted">
            Uma nova camada de organização para transformar resultados, histórico e evolução em
            informação útil à análise médica.
          </p>
          <div className="mt-14 grid grid-cols-4 gap-2 text-[11px] text-hero-muted">
            <span>Resultado</span>
            <span>Histórico</span>
            <span>Evolução</span>
            <span>Comparação</span>
          </div>
          <div className="mt-3 h-px bg-sidebar-border">
            <div className="h-px w-3/4 bg-brand" />
          </div>
        </div>
      </section>
      <section className="login-access flex min-h-screen items-center justify-center bg-background px-6 py-4">
        {registering ? (
          <AccountRegistration role="doctor" onBack={() => setRegistering(false)} />
        ) : (
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-float)] sm:p-7">
            <div className="mb-4">
              <Logo />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Acesso médico
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold">Bem-vindo à INOVA</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Resultados laboratoriais de uma nova forma.
            </p>
            <Link
              to="/acesso-paciente"
              className="mt-5 inline-flex text-sm font-medium text-brand-deep hover:underline"
            >
              Sou paciente · acessar meu espaço
            </Link>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label className="label">E-mail</label>
                <Input
                  type="email"
                  required
                  name="email"
                  autoComplete="username"
                  className="h-11"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium">Senha</label>
                  <button
                    type="button"
                    onClick={async () => {
                      const email = (
                        document.querySelector('input[name="email"]') as HTMLInputElement
                      )?.value;
                      if (!email) {
                        toast.info("Informe seu e-mail para recuperar sua senha.");
                        return;
                      }
                      try {
                        await recoverAccount({ data: { email } });
                        toast.success(
                          "Se houver uma conta com este e-mail, você receberá as instruções.",
                        );
                      } catch (cause) {
                        toast.error(
                          cause instanceof Error ? cause.message : "Não foi possível recuperar.",
                        );
                      }
                    }}
                    className="text-xs font-medium text-brand-deep hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={show ? "text" : "password"}
                    required
                    name="password"
                    autoComplete="current-password"
                    className="h-11 pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
              <Button className="h-11 w-full" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loading-dot" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar na conta
                    <LockKeyhole />
                  </>
                )}
              </Button>
            </form>
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="button" variant="ghost" className="mt-2 w-full" asChild>
              <Link to="/dashboard">Ver demonstração médica</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setRegistering(true)}
            >
              Criar minha conta
            </Button>
            <div className="mt-5 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-brand" />
              <span>Demonstração médica mediante agendamento.</span>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              As informações exibidas apoiam a análise do profissional de saúde e não constituem
              diagnóstico ou prescrição.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
