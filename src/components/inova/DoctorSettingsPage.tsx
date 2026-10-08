import { z } from "zod";
import { Bell, Monitor, SlidersHorizontal, Save } from "lucide-react";
import { Page } from "./Page";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useDemoPreferences } from "./useDemoPreferences";

const schema = z.object({
  results: z.boolean(),
  preparations: z.boolean(),
  returns: z.boolean(),
  frequency: z.enum(["immediate", "daily", "off"]),
  textSize: z.enum(["normal", "large"]),
  contrast: z.boolean(),
  period: z.enum(["all", "12", "6"]),
  pendingOnly: z.boolean(),
});
const defaults: z.infer<typeof schema> = {
  results: true,
  preparations: true,
  returns: true,
  frequency: "immediate",
  textSize: "normal",
  contrast: false,
  period: "all",
  pendingOnly: false,
};

export function DoctorSettingsPage() {
  const state = useDemoPreferences("inova-demo-doctor-settings-v1", defaults, schema);
  const update = <K extends keyof typeof defaults>(key: K, value: (typeof defaults)[K]) =>
    state.setForm((form) => ({ ...form, [key]: value }));
  return (
    <Page
      title="Configurações"
      description="Personalize suas preferências de notificações, visualização e acompanhamento."
    >
      <div className="surface p-4 text-sm leading-relaxed text-muted-foreground">
        Preferências de demonstração salvas neste navegador. A visualização pode ser testada abaixo;
        os ajustes não alteram as demais páginas nem enviam notificações.
      </div>
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
        <fieldset disabled={!state.ready} className="grid items-start gap-5 lg:grid-cols-2">
          <section className="surface p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Bell className="size-5 text-brand" />
              Notificações
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha os eventos que deseja acompanhar.
            </p>
            <div className="mt-5 divide-y divide-border">
              {[
                {
                  key: "results" as const,
                  title: "Novos resultados",
                  description: "Exames adicionados ao acompanhamento.",
                },
                {
                  key: "preparations" as const,
                  title: "Preparações recebidas",
                  description: "Informações enviadas pelo paciente antes da consulta.",
                },
                {
                  key: "returns" as const,
                  title: "Retornos e pendências",
                  description: "Itens que precisam de revisão no acompanhamento.",
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 py-4">
                  <label htmlFor={`settings-${item.key}`} className="cursor-pointer">
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </label>
                  <Switch
                    id={`settings-${item.key}`}
                    checked={state.form[item.key]}
                    onCheckedChange={(value) => update(item.key, value)}
                  />
                </div>
              ))}
            </div>
            <label className="mt-5 block text-xs font-medium" htmlFor="settings-frequency">
              Frequência desejada
              <select
                id="settings-frequency"
                className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={state.form.frequency}
                onChange={(e) => update("frequency", e.target.value as typeof defaults.frequency)}
              >
                <option value="immediate">Imediatas</option>
                <option value="daily">Resumo diário</option>
                <option value="off">Desativadas</option>
              </select>
            </label>
            <p className="mt-3 text-xs text-muted-foreground">
              Preferência registrada; entrega por e-mail e lembretes ainda não estão conectados.
            </p>
          </section>
          <section className="surface p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Monitor className="size-5 text-brand" />
              Visualização
            </h2>
            <label htmlFor="settings-size" className="mt-5 block text-xs font-medium">
              Tamanho do texto
              <select
                id="settings-size"
                className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={state.form.textSize}
                onChange={(e) => update("textSize", e.target.value as typeof defaults.textSize)}
              >
                <option value="normal">Padrão</option>
                <option value="large">Ampliado</option>
              </select>
            </label>
            <div className="mt-5 flex items-center justify-between gap-4">
              <label htmlFor="settings-contrast" className="text-sm font-medium">
                Maior contraste na prévia
              </label>
              <Switch
                id="settings-contrast"
                checked={state.form.contrast}
                onCheckedChange={(value) => update("contrast", value)}
              />
            </div>
            <div
              className={`mt-5 rounded-xl border p-5 ${state.form.contrast ? "border-slate-800 bg-white text-slate-950" : "border-border bg-brand-soft text-foreground"}`}
            >
              <p className="eyebrow">PRÉVIA DE LEITURA</p>
              <p
                className={`mt-3 font-semibold ${state.form.textSize === "large" ? "text-xl" : "text-base"}`}
              >
                Acompanhamento do paciente
              </p>
              <p
                className={`mt-2 leading-relaxed ${state.form.textSize === "large" ? "text-lg" : "text-sm"}`}
              >
                Confira os resultados e as informações recebidas antes da próxima consulta.
              </p>
            </div>
          </section>
          <section className="surface p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <SlidersHorizontal className="size-5 text-brand" />
              Acompanhamento
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Registre como prefere organizar suas consultas.
            </p>
            <label htmlFor="settings-period" className="mt-5 block text-xs font-medium">
              Período preferido do histórico
              <select
                id="settings-period"
                className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={state.form.period}
                onChange={(e) => update("period", e.target.value as typeof defaults.period)}
              >
                <option value="all">Todo o histórico</option>
                <option value="12">Últimos 12 meses</option>
                <option value="6">Últimos 6 meses</option>
              </select>
            </label>
            <div className="mt-5 flex items-center justify-between gap-4">
              <label htmlFor="settings-pending" className="text-sm font-medium">
                Priorizar itens pendentes
              </label>
              <Switch
                id="settings-pending"
                checked={state.form.pendingOnly}
                onCheckedChange={(value) => update("pendingOnly", value)}
              />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Essas preferências ficam registradas aqui. Os filtros atuais das páginas de exames e
              acompanhamento permanecem independentes.
            </p>
          </section>
          <section className="surface p-6">
            <h2 className="text-lg font-semibold">Inteligência artificial e acesso</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A autorização para usar IA continua sendo solicitada na própria análise. Salvar
              preferências não autoriza o envio de dados.
            </p>
            <div className="mt-5 rounded-xl bg-muted/50 p-4">
              <p className="text-sm font-medium">Ambiente demonstrativo</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Senha, autenticação em duas etapas e gerenciamento de sessões serão definidos na
                etapa de contas reais.
              </p>
            </div>
          </section>
        </fieldset>
        <div className="surface flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p role="status" className="text-xs text-muted-foreground">
              {!state.ready
                ? "Carregando preferências…"
                : state.dirty
                  ? "Você tem alterações não salvas."
                  : "Preferências de demonstração · neste navegador."}
            </p>
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto px-0 text-xs"
              disabled={!state.ready}
              onClick={state.restore}
            >
              Restaurar padrões
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
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
              Salvar alterações
            </Button>
          </div>
        </div>
      </form>
    </Page>
  );
}
