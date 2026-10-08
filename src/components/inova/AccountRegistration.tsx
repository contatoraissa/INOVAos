import { Logo } from "./Logo";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accountInput, states } from "@/lib/account-contract";
import { registerAccount } from "@/lib/accounts";

export function AccountRegistration({
  role,
  onBack,
}: {
  role: "doctor" | "patient";
  onBack: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("passwordConfirmation")) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    const parsed = accountInput.safeParse({
      role,
      fullName: form.get("fullName"),
      email: form.get("email"),
      password: form.get("password"),
      consent: form.get("consent") === "on",
      ...(role === "doctor"
        ? { crm: form.get("crm"), crmState: form.get("crmState"), cnpj: form.get("cnpj") }
        : { cpf: form.get("cpf"), birthDate: form.get("birthDate") }),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados.");
      return;
    }
    setBusy(true);
    try {
      const result = await registerAccount({ data: parsed.data });
      if (!result.confirmationRequired) {
        setError(
          "Cadastro recebido, mas a confirmação de e-mail está desativada no projeto. Ative Confirm email no Supabase antes de liberar contas.",
        );
      } else setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível cadastrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-card w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-float)] sm:p-7">
      <Logo />
      <h1 className="mt-3 font-display text-3xl font-semibold">Criar minha conta</h1>
      <div className="mt-5">
        <p className="text-sm font-medium">
          {role === "doctor" ? "Conta médica · assinatura paga" : "Conta de paciente · gratuita"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {role === "doctor"
            ? "Cadastro sem cobrança. Assinatura ativada após contratação."
            : "Crie sua conta com seus dados. A demonstração utiliza um perfil fictício separado."}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          onClick={onBack}
          disabled={busy}
        >
          {"Voltar para entrar"}
        </Button>
        {done ? (
          <div role="status" className="mt-4 rounded-xl bg-brand-soft p-4 text-sm">
            Confira sua caixa de entrada e confirme seu e-mail. Se já possui uma conta, utilize a
            recuperação de acesso.{" "}
            {role === "doctor"
              ? "A assinatura ainda não foi ativada; nenhuma cobrança foi realizada."
              : "Seu acesso será gratuito."}
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="account-form mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
            aria-label="Criar conta"
          >
            {[
              { name: "fullName", label: "Nome completo", type: "text" },
              { name: "email", label: "E-mail", type: "email" },
              ...(role === "patient"
                ? [
                    { name: "cpf", label: "CPF", type: "text" },
                    { name: "birthDate", label: "Data de nascimento", type: "date" },
                  ]
                : [
                    { name: "crm", label: "Número do CRM", type: "text" },
                    { name: "cnpj", label: "CNPJ (opcional)", type: "text" },
                  ]),
              { name: "password", label: "Senha (mínimo 12 caracteres)", type: "password" },
              { name: "passwordConfirmation", label: "Confirmar senha", type: "password" },
            ].map((field) => (
              <div key={field.name}>
                <label className="label" htmlFor={`signup-${field.name}`}>
                  {field.label}
                </label>
                <Input
                  {...field}
                  id={`signup-${field.name}`}
                  required={field.name !== "cnpj"}
                  disabled={busy}
                  autoComplete={field.type === "password" ? "new-password" : "off"}
                  maxLength={field.name === "fullName" ? 200 : 254}
                />
              </div>
            ))}
            {role === "doctor" && (
              <div>
                <label htmlFor="signup-state" className="label">
                  UF do CRM
                </label>
                <select
                  id="signup-state"
                  name="crmState"
                  className="h-11 w-full rounded-md border px-3"
                  required
                  disabled={busy}
                >
                  <option value="">Selecione</option>
                  {states.map((state) => (
                    <option key={state}>{state}</option>
                  ))}
                </select>
              </div>
            )}
            <label className="flex gap-2 text-xs sm:col-span-2">
              <input type="checkbox" name="consent" required disabled={busy} />
              Autorizo o uso desses dados para criar e identificar minha conta no INOVA.
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive sm:col-span-2">
                {error}
              </p>
            )}
            <Button className="w-full sm:col-span-2" disabled={busy}>
              {busy ? "Criando conta…" : "Cadastrar e confirmar e-mail"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
