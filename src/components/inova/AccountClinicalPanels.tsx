import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./Page";
import type { MedicalResult } from "@/lib/medical-reports";
import { openMedicalReport } from "@/lib/medical-reports";
import { openPatientReviewedReport } from "@/lib/real-consultation";
import { resultSeries } from "@/lib/account-records";

export function AccountResults({
  results,
  charts = false,
}: {
  results: MedicalResult[];
  charts?: boolean;
}) {
  if (!results.length)
    return (
      <EmptyState
        title="Resultados ainda indisponíveis"
        text="Os resultados aparecerão aqui quando forem registrados e liberados para sua conta."
      />
    );
  if (charts)
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        {resultSeries(results).map((series) => (
          <section key={`${series.name}:${series.unit}`} className="surface p-5">
            <h2 className="font-semibold">{series.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Evolução · {series.unit}</p>
            <p className="mt-5 text-3xl font-semibold">
              {series.latest.value}{" "}
              <span className="text-sm font-normal text-muted-foreground">{series.unit}</span>
            </p>
            <div className="mt-4 rounded-xl bg-brand-soft p-4 text-sm">
              <p>Referência do laudo: {series.latest.reference || "Não informada"}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Coleta: {series.latest.collection_date} · Confira o contexto com seu médico.
              </p>
            </div>
            {series.points.length > 1 ? (
              <div className="mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.points}>
                    <CartesianGrid strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line dataKey="value" stroke="var(--color-brand, #00a6bd)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Mais coletas numéricas são necessárias para traçar a evolução.
              </p>
            )}
          </section>
        ))}
      </div>
    );
  return (
    <div className="surface overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Exame</th>
            <th>Resultado</th>
            <th>Unidade</th>
            <th>Referência do laudo</th>
            <th>Coleta</th>
          </tr>
        </thead>
        <tbody>
          {[...results]
            .sort((a, b) => b.collection_date.localeCompare(a.collection_date))
            .map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td className="font-semibold">{row.value}</td>
                <td>{row.unit}</td>
                <td>{row.reference || "Não informada"}</td>
                <td>{row.collection_date}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function AccountDocuments({
  patientId,
  reports,
  doctor = false,
}: {
  patientId: string;
  reports: {
    id: string;
    filename: string;
    kind: string;
    created_at: string;
    reviewed_at: string | null;
  }[];
  doctor?: boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  async function open(id: string) {
    setError("");
    setBusy(id);
    // Open immediately so the user's click keeps browser popup permission.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const result = await (doctor
        ? openMedicalReport({ data: { patientId, id } })
        : openPatientReviewedReport({ data: { patientId, id } }));
      if (tab) tab.location.assign(result.url);
      else window.location.assign(result.url);
    } catch (cause) {
      tab?.close();
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o PDF.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="space-y-4">
      {error && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {!reports.length ? (
        <EmptyState
          title="Nenhum documento disponível"
          text="Os laudos liberados no prontuário aparecerão aqui."
        />
      ) : (
        reports.map((report) => (
          <article
            key={report.id}
            className="surface flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div>
              <h3 className="font-semibold">{report.filename}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.kind} · {new Date(report.created_at).toLocaleDateString("pt-BR")} ·{" "}
                {report.reviewed_at ? "Revisado" : "Aguardando revisão"}
              </p>
            </div>
            <Button variant="outline" disabled={Boolean(busy)} onClick={() => void open(report.id)}>
              Abrir PDF original
            </Button>
          </article>
        ))
      )}
    </section>
  );
}
