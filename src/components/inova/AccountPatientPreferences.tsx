import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWorkspacePreference, saveWorkspacePreference } from "@/lib/real-workspace";
import { patientPreferencesSchema } from "@/lib/real-workspace-contract";
import type { PatientRegistrationRecord } from "@/lib/patient-identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function AccountPatientPreferences({
  profile,
  userId,
  favorites = false,
  onOrders,
}: {
  profile: PatientRegistrationRecord;
  userId: string;
  favorites?: boolean;
  onOrders?: () => void;
}) {
  const query = useQuery({
    queryKey: ["account-preference", userId, "patient"],
    queryFn: () => getWorkspacePreference({ data: { kind: "patient" } }),
    retry: false,
  });
  const parsed = patientPreferencesSchema.safeParse(query.data);
  const current = parsed.success
    ? parsed.data
    : { phone: profile.phone, email: profile.email, favorites: [] };
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save(value: typeof current) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveWorkspacePreference({ data: { kind: "patient", value } });
      await query.refetch();
      setMessage("Alterações salvas na sua conta.");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      {(error || query.error) && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {error || query.error?.message}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-brand-deep">
          {message}
        </p>
      )}
      {favorites ? (
        <>
          <section className="surface p-6" aria-label="Consulta S2 Labs">
            <p className="eyebrow">INOVA + S2 LABS</p>
            <h2 className="mt-3 font-display text-xl font-semibold">
              Encontre uma unidade para seus exames
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Consulte as opções no site da S2 e registre abaixo o contato da unidade escolhida. Os
              favoritos ficam na sua conta.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <a href="https://s2medica.com.br/" target="_blank" rel="noreferrer">
                  Consultar opções
                </a>
              </Button>
              {onOrders && (
                <Button variant="ghost" onClick={onOrders}>
                  Ver meus exames solicitados
                </Button>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              A integração comercial ainda não fornece unidades, preços ou reservas para a conta
              real. Confira essas informações diretamente com a S2 e o laboratório.
            </p>
          </section>
          <form
            className="surface space-y-4 p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const values = new FormData(form);
              const lab = {
                name: String(values.get("name") ?? ""),
                address: String(values.get("address") ?? ""),
                phone: String(values.get("phone") ?? ""),
                cep: String(values.get("cep") ?? "").replace(/\D/g, ""),
                website: String(values.get("website") ?? ""),
              };
              if (await save({ ...current, favorites: [...current.favorites, lab] })) form.reset();
            }}
          >
            <h2 className="text-lg font-semibold">Meus laboratórios favoritos</h2>
            <p className="text-sm text-muted-foreground">
              Guarde os contatos das unidades que você costuma usar. Confirme preços, cobertura e
              preparo diretamente com o laboratório.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "name", label: "Nome do laboratório", required: true },
                { key: "address", label: "Endereço", required: false },
                { key: "phone", label: "Telefone", required: false },
                { key: "cep", label: "CEP", required: false },
                { key: "website", label: "Site HTTPS", required: false },
              ].map((field) => (
                <label key={field.key} className="text-sm">
                  {field.label}
                  <Input
                    name={field.key}
                    required={field.required}
                    maxLength={field.key === "address" ? 250 : field.key === "name" ? 150 : 30}
                  />
                </label>
              ))}
            </div>
            <Button disabled={busy || !query.isSuccess || current.favorites.length >= 30}>
              Adicionar favorito
            </Button>
          </form>
          <div className="grid gap-4 sm:grid-cols-2">
            {current.favorites.map((lab, i) => (
              <article key={i} className="surface space-y-3 p-5">
                <h3 className="font-semibold">{lab.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {lab.address || "Endereço não informado"}
                </p>
                <p className="text-sm">{lab.phone || "Telefone não informado"}</p>
                {lab.cep && (
                  <p className="text-xs text-muted-foreground">
                    CEP: {lab.cep.slice(0, 5)}-{lab.cep.slice(5)}
                  </p>
                )}
                {lab.website && (
                  <a
                    href={lab.website}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm text-brand-deep underline"
                  >
                    Abrir site informado
                  </a>
                )}
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void save({
                      ...current,
                      favorites: current.favorites.filter((_, index) => index !== i),
                      progress: (current.progress ?? []).map((p) =>
                        p.preferredLab === lab.name ? { ...p, preferredLab: "" } : p,
                      ),
                    })
                  }
                >
                  Remover favorito
                </Button>
              </article>
            ))}
          </div>
          {!current.favorites.length && (
            <p className="surface p-6 text-sm text-muted-foreground">
              Você ainda não adicionou um laboratório favorito.
            </p>
          )}
        </>
      ) : (
        <section className="surface max-w-2xl p-6">
          <h2 className="text-xl font-semibold">Seus dados</h2>
          <div className="mt-5 rounded-xl bg-muted/50 p-4">
            <p className="font-semibold">{profile.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              CPF {profile.cpf} · Nascimento: {profile.birth.split("-").reverse().join("/")}
            </p>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { label: "RG", value: profile.rg },
              {
                label: "Sexo",
                value: ({ f: "Feminino", m: "Masculino", o: "Outro" } as Record<string, string>)[
                  profile.sex
                ],
              },
              { label: "Endereço", value: profile.address },
            ].map((field) => (
              <div key={field.label}>
                <dt className="label">{field.label}</dt>
                <dd className="break-words rounded-lg border px-3 py-3 text-sm">
                  {field.value || "Não informado"}
                </dd>
              </div>
            ))}
          </dl>
          <form
            key={JSON.stringify(current)}
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void save({
                ...current,
                email: String(form.get("email") ?? ""),
                phone: String(form.get("phone") ?? ""),
              });
            }}
          >
            <label className="block text-sm">
              E-mail de contato
              <Input
                name="email"
                type="email"
                required
                defaultValue={current.email}
                maxLength={200}
              />
            </label>
            <label className="block text-sm">
              Telefone
              <Input name="phone" type="tel" defaultValue={current.phone} maxLength={30} />
            </label>
            <p className="text-xs text-muted-foreground">
              Contato salvo no seu perfil. Para corrigir CPF, nascimento ou outros dados de
              identidade, peça a conferência ao médico. O e-mail de contato não muda seu login.
            </p>
            <Button disabled={busy || !query.isSuccess}>Salvar meu perfil</Button>
          </form>
        </section>
      )}
    </div>
  );
}
