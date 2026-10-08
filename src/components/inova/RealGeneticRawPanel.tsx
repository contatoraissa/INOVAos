import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listRealGenetics,
  importRealGenetics,
  originalRealGenetics,
  reviewRealGenetics,
} from "@/lib/real-complements";
import { geneticDomains } from "@/lib/genetic-raw-contract";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function RealGeneticRawPanel({
  patientId,
  patient = false,
}: {
  patientId: string;
  patient?: boolean;
}) {
  const query = useQuery({
    queryKey: ["real-genetics", patientId],
    queryFn: () => listRealGenetics({ data: { patientId } }),
  });
  const [file, setFile] = useState<File | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await task();
      await query.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <form
        className="surface space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          if (!file) return;
          void run(async () => {
            if (file.size > 25 * 1024 * 1024) throw new Error("Escolha um TXT de até 25 MB.");
            await importRealGenetics({
              data: { patientId, filename: file.name, text: await file.text(), confirmed: true },
            });
            setFile(null);
            setConfirmed(false);
            form.reset();
          });
        }}
      >
        <h2 className="section-title">Genética bruta · arquivo TXT</h2>
        <p className="text-sm text-muted-foreground">
          Importe o arquivo extraído em formato rsid, chromosome, position e genotype. O original
          fica vinculado a este prontuário no banco privado.
        </p>
        <Input
          type="file"
          accept=".txt,text/plain"
          required
          disabled={busy || !query.isSuccess}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setConfirmed(false);
          }}
        />
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Conferi a origem, a associação ao paciente e autorizo guardar este arquivo no prontuário
          vinculado.
        </label>
        <Button disabled={busy || !confirmed || !file || !query.isSuccess}>
          {busy ? "Processando…" : "Importar arquivo genético"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {query.isError && (
        <p role="alert" className="surface p-5 text-sm">
          Armazenamento genético indisponível. Confira o SQL de complementos.{" "}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Atualizar
          </Button>
        </p>
      )}
      {query.data?.map((item) => (
        <article className="surface space-y-3 p-5" key={item.id}>
          <h3 className="font-semibold">{item.filename}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Marcadores", item.stats.markers],
              ["Genótipos chamados", item.stats.called],
              ["Build", item.stats.build],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-background p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {item.reviewed_at ? "Associação revisada pelo médico" : "Revisão médica pendente"} ·{" "}
            {new Date(item.created_at).toLocaleString("pt-BR")}
          </p>
          {item.stats.warnings.map((w) => (
            <p key={w} className="text-sm text-amber-700">
              {w}
            </p>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const original = await originalRealGenetics({ data: { patientId, id: item.id } });
                  const url = URL.createObjectURL(
                    new Blob([original.original_text], { type: "text/plain;charset=utf-8" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = original.filename;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                })
              }
            >
              Baixar original
            </Button>
            {!patient && !item.reviewed_at && (
              <Button
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    reviewRealGenetics({ data: { patientId, id: item.id, confirmed: true } }),
                  )
                }
              >
                Confirmar conferência da associação
              </Button>
            )}
          </div>
          <details>
            <summary className="cursor-pointer text-sm text-brand-deep">
              Ver amostra dos marcadores
            </summary>
            <div className="mt-3 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th>Marcador</th>
                    <th>Cromossomo</th>
                    <th>Posição</th>
                    <th>Genótipo</th>
                  </tr>
                </thead>
                <tbody>
                  {item.stats.preview.map((v) => (
                    <tr key={v.marker}>
                      <td className="p-2">{v.marker}</td>
                      <td>{v.chromosome}</td>
                      <td>{v.position}</td>
                      <td>{v.genotype}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </article>
      ))}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {geneticDomains.map((domain) => (
          <div key={domain.name} className="surface p-4">
            <h3 className="font-semibold">{domain.name}</h3>
            <p className="mt-2 text-xs text-muted-foreground">{domain.description}</p>
            <p className="mt-3 text-xs text-brand-deep">
              Escores pendentes de metodologia validada
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
