import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getDoctorWork } from "@/lib/care";
import type { Patient } from "@/data/demo";
import { getRealDoctorWork } from "@/lib/real-doctor-work";

export function DoctorWorkQueue({
  patients,
  account = false,
}: {
  patients: Patient[];
  account?: boolean;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDoctorWork>>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [version, setVersion] = useState(0);
  const ids = JSON.stringify(patients.map((item) => item.id));
  useEffect(() => {
    let current = true;
    setLoading(true);
    void (account ? getRealDoctorWork() : getDoctorWork({ data: { patientIds: JSON.parse(ids) } }))
      .then((result) => {
        if (current) {
          setData(result);
          setError("");
        }
      })
      .catch(() => {
        if (current) setError("Não foi possível carregar a fila. Tente atualizar.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [ids, version, account]);
  const rows = data
    .flatMap((item) => {
      const name =
        patients.find((patient) => patient.id === item.patientId)?.name ?? item.patientId;
      const base = { patientId: item.patientId, name };
      return [
        ...item.submissions
          .filter((submission) => !submission.reviewed)
          .map((submission) => ({
            ...base,
            id: submission.id,
            category: "Envios",
            title: "Envio aguardando revisão",
            detail: `${submission.audios.length} áudio(s) · ${submission.documents.length} laudo(s)`,
            at: submission.receivedAt,
            destination: "Envios do paciente",
          })),
        ...item.orders
          .filter((order) => order.status === "draft")
          .map((order) => ({
            ...base,
            id: order.id,
            category: "Pedidos",
            title: "Pedido em rascunho",
            detail: order.exams.map((exam) => exam.name).join(", "),
            at: order.createdAt,
            destination: "Solicitar exames",
          })),
        ...item.orders
          .filter(
            (order) =>
              order.status === "released" &&
              !item.submissions.some(
                (submission) => submission.orderId === order.id && submission.documents.length,
              ),
          )
          .map((order) => ({
            ...base,
            id: order.id,
            category: "Pedidos",
            title: "Pedido aguardando laudo",
            detail: "Acompanhamento interno; não confirma recebimento pelo laboratório.",
            at: order.releasedAt ?? order.createdAt,
            destination: "Solicitar exames",
          })),
        ...(item.returns ?? [])
          .filter((plan) => !plan.publishedAt && !plan.cancelledAt)
          .map((plan) => ({
            ...base,
            id: plan.id,
            category: "Orientações",
            title: "Retorno aguardando publicação",
            detail: plan.title,
            at: plan.createdAt,
            destination: "Resumo da consulta",
          })),
        ...item.guidance
          .filter((guidance) => !guidance.publishedAt && !guidance.withdrawnAt)
          .map((guidance) => ({
            ...base,
            id: guidance.id,
            category: "Orientações",
            title: "Orientação ainda não publicada",
            detail: guidance.title,
            at: guidance.createdAt,
            destination: "Orientações ao paciente",
          })),
      ];
    })
    .sort((a, b) => a.at.localeCompare(b.at));
  return (
    <section className="surface p-6" aria-label="Fila de trabalho médica">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">O que precisa da sua atenção</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {account
              ? "Pendências da sua conta, da mais antiga para a mais recente."
              : "Pendências reais do ambiente demonstrativo, da mais antiga para a mais recente."}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => setVersion((value) => value + 1)}
        >
          {loading ? "Atualizando…" : "Atualizar fila"}
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["Todos", "Envios", "Pedidos", "Orientações"].map((item) => (
          <Button
            key={item}
            size="sm"
            variant={filter === item ? "default" : "outline"}
            onClick={() => setFilter(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
        {rows
          .filter((item) => filter === "Todos" || item.category === filter)
          .map((item) => (
            <Link
              key={item.category + item.id}
              to="/patients/$patientId"
              params={{ patientId: item.patientId }}
              search={account ? { workspace: "account" } : {}}
              hash={item.destination}
              className="block rounded-xl border border-border p-4 hover:bg-brand-soft"
            >
              <p className="text-sm font-semibold">
                {item.name} · {item.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              <p className="mt-2 text-xs text-brand-deep">
                {new Date(item.at).toLocaleString("pt-BR")} · Abrir {item.destination}
              </p>
            </Link>
          ))}
      </div>
      {!loading &&
        !error &&
        !rows.filter((item) => filter === "Todos" || item.category === filter).length && (
          <p className="mt-4 text-sm text-muted-foreground">Sem pendências nesta categoria.</p>
        )}
      <p className="mt-4 text-xs text-muted-foreground">
        PDFs abertos apenas no prontuário aparecem nas pendências da consulta. A fila não atribui
        urgência clínica.
      </p>
    </section>
  );
}
