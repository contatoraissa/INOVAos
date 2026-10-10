import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PatientRegistrationFields } from "./PatientRegistrationFields";
import { patientRegistration } from "@/lib/medical-patient-contract";
import { createMedicalPatient } from "@/lib/medical-workspace";
import {
  listPatientRegistrations,
  synchronizePatientRegistration,
  type PatientRegistrationRecord,
} from "@/lib/patient-identity";

export function PatientAccountLinking({ doctor = false }: { doctor?: boolean }) {
  const [records, setRecords] = useState<PatientRegistrationRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setRecords(await (doctor ? listPatientRegistrations() : synchronizePatientRegistration()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível conferir os cadastros.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, [doctor]); // eslint-disable-line react-hooks/exhaustive-deps
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const parsed = patientRegistration.safeParse({
      ...Object.fromEntries(
        ["name", "cpf", "birth", "email", "phone", "rg", "sex", "address", "notes"].map((key) => [
          key,
          String(form.get(key) ?? ""),
        ]),
      ),
      identityConfirmed: form.get("identityConfirmed") === "on",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados.");
      return;
    }
    setBusy(true);
    try {
      const result = await createMedicalPatient({ data: parsed.data });
      setMessage(
        `${result.reused ? "Prontuário existente reutilizado; histórico preservado." : "Paciente cadastrado."} ${result.linked ? "Conta do paciente vinculada." : "Aguardando a conta do paciente com e-mail confirmado."}`,
      );
      setEditing(false);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o cadastro.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          {doctor ? "Cadastros e vínculos de pacientes" : "Meu cadastro com os médicos"}
        </h2>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>
          Atualizar vínculos
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {doctor
          ? "Cadastre o paciente antes ou depois de ele criar a conta. O CPF identifica o cadastro na sua carteira; nascimento e e-mail confirmado completam o vínculo autorizado."
          : "Conferimos os cadastros autorizados pelos médicos usando seu CPF, nascimento e e-mail confirmado. O vínculo conserva os dados e o histórico já registrados."}
      </p>
      {busy && (
        <p role="status" className="mt-3 text-sm">
          Conferindo cadastros…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 rounded-lg bg-brand-soft p-3 text-sm">
          {message}
        </p>
      )}
      {!busy && !error && !records.length && (
        <p className="mt-3 text-sm text-muted-foreground">
          {doctor
            ? "Nenhum paciente cadastrado nesta conta."
            : "Nenhum cadastro vinculado. Peça ao médico para conferir seu CPF, nascimento e e-mail e autorizar o vínculo."}
        </p>
      )}
      <div className="mt-4 space-y-3">
        {records.map((record) => (
          <article key={record.id} className="rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-medium">{record.name}</h3>
              <span className="text-xs text-brand-deep">
                {record.linked ? "Conta vinculada" : "Aguardando confirmação"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {record.doctorName} · Nascimento: {record.birth.split("-").reverse().join("/")}
            </p>
            <p className="mt-2 break-words text-sm">
              {record.email || "E-mail não informado"}
              {record.phone && ` · ${record.phone}`}
            </p>
            {record.address && (
              <p className="mt-1 text-xs text-muted-foreground">{record.address}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              O prontuário mantém o mesmo registro; exames, documentos e orientações não são
              copiados de outro paciente.
            </p>
          </article>
        ))}
      </div>
      {doctor && (
        <Button type="button" disabled={busy} className="mt-4" onClick={() => setEditing(!editing)}>
          {editing ? "Fechar cadastro" : "Cadastrar ou vincular paciente"}
        </Button>
      )}
      {editing && (
        <form onSubmit={submit} className="mt-4 rounded-xl border">
          <PatientRegistrationFields realAccount disabled={busy} />
          <div className="flex justify-end border-t bg-muted/40 p-4">
            <Button disabled={busy}>Salvar cadastro e vínculo</Button>
          </div>
        </form>
      )}
    </section>
  );
}
