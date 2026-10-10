import { z } from "zod";
import { Link } from "@tanstack/react-router";
import { Building2, CreditCard, Save, Stethoscope, UserRound } from "lucide-react";
import { Page, StatusBadge } from "./Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { medicalPricing } from "@/data/pricing";
import { useDemoPreferences } from "./useDemoPreferences";
const schema = z.object({
  name: z.string().trim().min(5, "Informe o nome completo.").max(100),
  crm: z
    .string()
    .trim()
    .regex(/^\d{1,10}\/[A-Z]{2}$/, "Informe CRM/UF, por exemplo 123456/SP."),
  specialty: z.string().trim().min(3, "Informe a especialidade.").max(100),
  email: z.string().trim().email("Informe um e-mail válido.").max(200),
  phone: z.string().trim().max(30),
  clinic: z.string().trim().max(150),
  address: z.string().trim().max(250),
});
const defaults = {
  name: "Dr. Rafael Mendes",
  crm: "123456/SP",
  specialty: "Clínica médica",
  email: "rafael@exemplo.com",
  phone: "",
  clinic: "Clínica Vida",
  address: "",
};
export function DoctorProfilePage({
  account,
}: {
  account?: { name: string; email: string; subscription: string | null };
}) {
  const state = useDemoPreferences(
    "inova-demo-doctor-profile-v1",
    account
      ? {
          ...defaults,
          name: account.name,
          email: account.email,
          crm: "",
          specialty: "",
          clinic: "",
        }
      : defaults,
    schema,
    account ? "profile" : undefined,
  );
  const update = (field: keyof typeof defaults, value: string) =>
    state.setForm((form) => ({ ...form, [field]: value }));
  return (
    <Page
      title="Meu perfil profissional"
      description="Seus dados profissionais, consultório e informações do plano em um só lugar."
    >
      <section className="surface flex flex-wrap items-center gap-5 p-6">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
          <UserRound className="size-8" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">SEU PERFIL PROFISSIONAL</p>
          <h2 className="mt-2 break-words font-display text-xl font-semibold">{state.form.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.form.specialty} · CRM {state.form.crm}
          </p>
        </div>
        <StatusBadge>{account ? "Perfil da sua conta" : "Perfil demonstrativo"}</StatusBadge>
      </section>
      {state.storageError && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {state.storageError}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          state.save();
        }}
        className="space-y-5"
      >
        <fieldset
          disabled={!state.ready}
          className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          <div className="space-y-5">
            <section className="surface p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Stethoscope className="size-5 text-brand" />
                Dados profissionais
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Informações de identificação do seu perfil.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {[
                  {
                    key: "name",
                    label: "Nome de exibição",
                    type: "text",
                    required: true,
                    max: 100,
                  },
                  { key: "crm", label: "CRM / UF", type: "text", required: true, max: 13 },
                  {
                    key: "specialty",
                    label: "Especialidade",
                    type: "text",
                    required: true,
                    max: 100,
                  },
                  {
                    key: "email",
                    label: "E-mail de contato",
                    type: "email",
                    required: true,
                    max: 200,
                  },
                  {
                    key: "phone",
                    label: "Telefone (opcional)",
                    type: "tel",
                    required: false,
                    max: 30,
                  },
                ].map((field) => (
                  <label
                    key={field.key}
                    className="block text-xs font-medium"
                    htmlFor={`profile-${field.key}`}
                  >
                    {field.label}
                    <Input
                      id={`profile-${field.key}`}
                      className="mt-2"
                      type={field.type}
                      required={field.required}
                      maxLength={field.max}
                      value={state.form[field.key as keyof typeof defaults]}
                      onChange={(e) =>
                        update(
                          field.key as keyof typeof defaults,
                          field.key === "crm" ? e.target.value.toUpperCase() : e.target.value,
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                {account
                  ? "Confira seus dados profissionais. Alterar o e-mail de contato não altera suas credenciais de acesso."
                  : "Dados fictícios de demonstração. O CRM não é verificado nesta página; o e-mail de contato não altera credenciais de acesso."}
              </p>
            </section>
            <section className="surface p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="size-5 text-brand" />
                Meu consultório
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Preencha se você atende em uma clínica ou consultório.
              </p>
              <div className="mt-5 space-y-5">
                <label htmlFor="profile-clinic" className="block text-xs font-medium">
                  Nome do consultório
                  <Input
                    id="profile-clinic"
                    className="mt-2"
                    value={state.form.clinic}
                    maxLength={150}
                    onChange={(e) => update("clinic", e.target.value)}
                  />
                </label>
                <label htmlFor="profile-address" className="block text-xs font-medium">
                  Endereço (opcional)
                  <Input
                    id="profile-address"
                    className="mt-2"
                    value={state.form.address}
                    maxLength={250}
                    placeholder="Rua, número, bairro e cidade"
                    onChange={(e) => update("address", e.target.value)}
                  />
                </label>
              </div>
            </section>
          </div>
          <aside className="space-y-5">
            <section className="surface p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="size-5 text-brand" />
                Minha assinatura
              </h2>
              <div className="mt-5">
                <StatusBadge>
                  {account
                    ? `Situação: ${account.subscription ?? "Sem assinatura registrada"}`
                    : "Sem cobrança · demonstração"}
                </StatusBadge>
              </div>
              <p className="mt-5 font-display text-2xl font-semibold">Plano médico</p>
              <p className="mt-2 text-sm text-muted-foreground">Oferta apresentada no sistema</p>
              <div className="mt-5 rounded-xl bg-brand-soft p-4">
                <p className="text-xs text-muted-foreground">
                  Primeiros {medicalPricing.introductoryMonths} meses
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {medicalPricing.introductoryMonthly}
                  <span className="text-xs font-normal"> / mês</span>
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Depois: {medicalPricing.regularMonthly}/mês.
                </p>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {account
                  ? "A situação acima vem da sua conta. Consulte os detalhes de acesso para conferir seu cadastro e plano."
                  : "Este perfil não possui contratação ativa, faturas ou cobrança. Valores exibidos apenas para apresentar a oferta."}
              </p>
            </section>
            <section className="surface p-6">
              <h2 className="font-semibold">Preferências de uso</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Notificações, visualização e acompanhamento ficam em Configurações.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/settings" search={account ? { workspace: "account" } : {}}>
                  Abrir configurações
                </Link>
              </Button>
            </section>
          </aside>
        </fieldset>
        <div className="surface flex flex-wrap items-center justify-between gap-4 p-4">
          <p role="status" className="text-xs text-muted-foreground">
            {!state.ready
              ? "Carregando perfil…"
              : state.dirty
                ? "Você tem alterações não salvas."
                : account
                  ? "Perfil salvo na sua conta."
                  : "Perfil demonstrativo · salvo apenas neste navegador."}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!state.ready || !state.dirty}
              onClick={state.undo}
            >
              Cancelar alterações
            </Button>
            <Button type="submit" disabled={!state.ready || !state.dirty}>
              <Save />
              Salvar perfil
            </Button>
          </div>
        </div>
      </form>
    </Page>
  );
}
