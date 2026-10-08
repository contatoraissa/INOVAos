import { signInAccount } from "@/lib/account-session";
import { AccountRegistration } from "./AccountRegistration";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, HeartPulse, FileText, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "./Logo";

export function PatientLoginPage() {
  const [registering, setRegistering] = useState(false);
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  async function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      await signInAccount({
        data: { email: String(values.get("email")), password: String(values.get("password")) },
      });
      window.location.assign("/minha-conta");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    }
  }

  return (
    <main className="patient-access min-h-dvh bg-[#f3f8f9]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-5">
        <Logo />
        <Link to="/acesso" className="text-sm font-medium text-brand-deep">
          Sou profissional de saúde <ArrowRight className="ml-1 inline size-4" />
        </Link>
      </header>
      <div className="patient-access-grid mx-auto grid w-full max-w-7xl items-center gap-8 px-6 py-6 lg:grid-cols-2">
        <section>
          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold tracking-widest text-brand-deep">
            INOVA · PARA VOCÊ
          </span>
          <h1 className="mt-7 max-w-lg font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Seu cuidado, mais perto de você.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Acompanhe seus exames, organize seus documentos e chegue à consulta com suas dúvidas em
            mãos.
          </p>
          <div className="mt-10 space-y-5">
            {[
              {
                icon: FileText,
                title: "Seus exames organizados",
                text: "Resultados e documentos em um só lugar.",
              },
              {
                icon: History,
                title: "Sua história ao longo do tempo",
                text: "Veja a evolução dos valores entre as coletas.",
              },
              {
                icon: HeartPulse,
                title: "Uma consulta mais preparada",
                text: "Organize sintomas, medicamentos e perguntas.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-4">
                <span className="rounded-2xl bg-white p-3 text-brand-deep">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        {registering ? (
          <AccountRegistration role="patient" onBack={() => setRegistering(false)} />
        ) : (
          <section className="patient-access-card w-full max-w-lg justify-self-center rounded-3xl border border-border bg-white p-6 shadow-[var(--shadow-float)] sm:p-7">
            <p className="eyebrow">ACESSO DO PACIENTE</p>
            <h2 className="mt-3 font-display text-3xl font-semibold">Que bom ter você aqui.</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Entre para conhecer seu espaço de cuidado.
            </p>
            <form className="mt-5 space-y-4" onSubmit={enter}>
              <div>
                <label htmlFor="patient-email" className="label">
                  E-mail
                </label>
                <Input
                  id="patient-email"
                  name="email"
                  type="email"
                  autoComplete="username"

                  required
                  className="h-12"
                />
              </div>
              <div>
                <label htmlFor="patient-password" className="label">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="patient-password"
                    name="password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"

                    required
                    className="h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1.5"
                    aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button className="h-12 w-full">
                Entrar na conta <ArrowRight />
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => {
                sessionStorage.setItem("inova-patient-demo", "mariana-oliveira");
                void navigate({ to: "/portal-paciente" });
              }}
            >
              Explorar demonstração gratuita
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setRegistering(true)}
            >
              Criar minha conta
            </Button>
            <div className="mt-4 rounded-xl bg-brand-soft p-4 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Acesso fictício de Mariana Oliveira</strong>
              <p className="mt-2">
                Use “Explorar demonstração gratuita” para acessar esse perfil fictício.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
