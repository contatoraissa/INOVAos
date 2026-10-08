import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getDoctorWork } from "@/lib/care";
import { useConsultation } from "./consultation-state";

import { DoctorPlannedReturns } from "./PlannedReturns";

export function ConsultationClosing({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const { reportsByKind, reviewed, completed, notes, closing, setClosing } = useConsultation();
  const [work, setWork] = useState<Awaited<ReturnType<typeof getDoctorWork>>[number] | null>(null);
  const plan = closing.plan;
  const snapshot = closing.snapshot;
  const setPlan = (value: string) => setClosing((current) => ({ ...current, plan: value }));
  const setSnapshot = (value: { signature: string; at: string; text: string }) =>
    setClosing((current) => ({ ...current, snapshot: value }));
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let current = true;
    void getDoctorWork({ data: { patientIds: [patientId] } })
      .then((data) => {
        if (current) {
          setWork(data[0] ?? null);
          setError("");
        }
      })
      .catch(() => {
        if (current) {
          setWork(null);
          setError("Não foi possível conferir os envios e orientações. Atualize antes de fechar.");
        }
      });
    return () => {
      current = false;
    };
  }, [patientId, refresh]);
  const reports = Object.values(reportsByKind).flat();
  const pendingReports = reports.filter((item) => !reviewed[item.id]);
  const pendingSubmissions = work?.submissions.filter((item) => !item.reviewed) ?? [];
  const published = work?.guidance.filter((item) => item.publishedAt && !item.withdrawnAt) ?? [];
  const signature = JSON.stringify({
    reviewed,
    completed,
    notes,
    plan,
    reportIds: reports.map((item) => item.id),
    work,
  });
  useEffect(() => {
    setConfirmed(false);
  }, [signature]);
  function close() {
    if (!confirmed || !work) return;
    const at = new Date().toISOString();
    setSnapshot({
      signature,
      at,
      text: `INOVA · registro demonstrativo de fechamento\nPaciente: ${patientName}\nData: ${new Date(at).toLocaleString("pt-BR")}\n\nLaudos revisados: ${reports.length - pendingReports.length}/${reports.length}\nEnvios pendentes: ${pendingSubmissions.length}\nOrientações publicadas: ${published.length}\nChecklist: ${Object.values(completed).filter(Boolean).length} itens marcados\n\nLaudos pendentes:\n${pendingReports.map((item) => item.title).join("\n") || "Nenhum"}\n\nOrientações publicadas:\n${published.map((item) => item.title).join("\n") || "Nenhuma"}\n\nAnotações do profissional:\n${notes || "Não informadas"}\n\nPróximos passos e pendências registrados:\n${plan || "Não informados"}\n\nRegistro local demonstrativo, sem assinatura e sem envio automático ao paciente. Não é receita ou pedido de exames.`,
    });
  }
  return (
    <section className="surface p-6" aria-label="Fechamento da consulta">
      <DoctorPlannedReturns
        patientId={patientId}
        onChange={() => setRefresh((value) => value + 1)}
      />
      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <h3 className="text-xl font-semibold">Conferir e fechar a consulta</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setWork(null);
            setConfirmed(false);
            setRefresh((value) => value + 1);
          }}
        >
          Atualizar conferência
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Revise o que foi conferido e registre o que ficou para depois. Este fechamento permanece
        apenas nesta sessão do prontuário.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Laudos revisados",
            value: `${reports.length - pendingReports.length}/${reports.length}`,
          },
          {
            label: "Envios aguardando revisão",
            value: work ? String(pendingSubmissions.length) : "Conferindo…",
          },
          {
            label: "Orientações publicadas",
            value: work ? String(published.length) : "Conferindo…",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      {pendingReports.length > 0 && (
        <p className="mt-3 text-sm text-amber-800">
          Ainda sem revisão: {pendingReports.map((item) => item.title).join("; ")}
        </p>
      )}
      <label className="mt-4 block text-sm font-semibold" htmlFor="closing-plan">
        Próximos passos e pendências
      </label>
      <Textarea
        id="closing-plan"
        className="mt-2"
        maxLength={3000}
        value={plan}
        onChange={(event) => {
          setPlan(event.target.value);
          setConfirmed(false);
        }}
        placeholder="Registre o que ficou pendente e o que precisa ser acompanhado…"
      />
      <label className="mt-4 flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        Conferi este resumo e estou ciente das pendências. As orientações ao paciente devem ser
        publicadas na seção própria.
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={!confirmed || !work} onClick={close}>
          Registrar fechamento nesta sessão
        </Button>
        {snapshot && (
          <Button
            variant="outline"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([snapshot.text], { type: "text/plain;charset=utf-8" }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = "INOVA-fechamento-demonstrativo.txt";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Baixar registro de fechamento
          </Button>
        )}
      </div>
      {snapshot && (
        <p role="status" className="mt-3 text-sm text-brand-deep">
          Fechamento registrado em {new Date(snapshot.at).toLocaleString("pt-BR")}.
          {snapshot.signature !== signature
            ? " Houve alterações depois do fechamento. Confira e registre uma nova versão."
            : " Nenhuma orientação foi enviada automaticamente."}
        </p>
      )}
    </section>
  );
}
