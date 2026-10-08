import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  listConsultationEntries,
  saveConsultationEntry,
  transitionConsultationEntry,
  linkPatientPortal,
} from "@/lib/real-consultation";
import type { ConsultationEntry, ConsultationPayload } from "@/lib/real-consultation-contract";
import { orderExams } from "@/data/order-exams";
import { createSessionId } from "@/lib/session-id";
import { patientDraft } from "@/lib/patient-draft";
import { getAccountSession } from "@/lib/account-session";

const empty = (): ConsultationPayload => ({
  title: "",
  text: "",
  date: "",
  symptoms: "",
  medicines: "",
  questions: "",
  exams: [],
  audios: [],
  documents: [],
  audio: null,
  document: null,
});
const requestKey = () =>
  createSessionId().replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
const labels = {
  preparation: "Envios do paciente",
  order: "Solicitar exames",
  guidance: "Orientações ao paciente",
  family: "Histórico familiar",
  return: "Retorno planejado",
};
function Attachment({ data, mime, name }: { data: string; mime: string; name: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const value = URL.createObjectURL(new Blob([bytes], { type: mime }));
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [data, mime]);
  return mime.startsWith("audio/") ? (
    <audio className="mt-3 w-full" controls src={url} aria-label={name} />
  ) : (
    <a
      className="mt-3 block text-sm text-brand-deep underline"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      Abrir PDF: {name}
    </a>
  );
}
export function RealConsultation({
  patientId,
  kind,
  patient = false,
}: {
  patientId: string;
  kind: ConsultationEntry["kind"];
  patient?: boolean;
}) {
  const query = useQuery({
    queryKey: ["real-consultation", patientId],
    queryFn: () => listConsultationEntries({ data: { patientId } }),
  });
  const account = useQuery({ queryKey: ["medical-account"], queryFn: () => getAccountSession() });
  const draftKey =
    patient && kind === "preparation" && account.data
      ? `real:${account.data.userId}:${patientId}:preparation`
      : null;
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [form, setForm] = useState(empty),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [email, setEmail] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    stream = useRef<MediaStream | null>(null);
  const requestId = useRef(requestKey());
  useEffect(() => {
    if (!draftKey) return;
    let active = true;
    void patientDraft<ConsultationPayload>(draftKey, "read")
      .then((saved) => {
        if (!active) return;
        if (saved) setForm({ ...empty(), ...saved.value });
        setDraftReady(true);
        setDraftStatus(
          saved
            ? "Rascunho recuperado neste dispositivo."
            : "O rascunho será salvo neste dispositivo.",
        );
      })
      .catch(() => {
        if (active) {
          setDraftReady(true);
          setDraftStatus(
            "Autosalvamento indisponível neste navegador. Mantenha a página aberta até enviar.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [draftKey]);
  useEffect(() => {
    if (!draftKey || !draftReady) return;
    const emptyDraft =
      ![form.symptoms, form.medicines, form.questions].some((t) => t.trim()) &&
      !form.audio &&
      !form.document &&
      !form.audios.length &&
      !form.documents.length;
    void patientDraft(draftKey, emptyDraft ? "remove" : "save", form)
      .then(() =>
        setDraftStatus(
          emptyDraft
            ? "Sem rascunho pendente."
            : "Rascunho salvo neste dispositivo. Ainda não enviado.",
        ),
      )
      .catch(() => setDraftStatus("Não foi possível salvar o rascunho neste dispositivo."));
  }, [draftKey, draftReady, form]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const update = (key: keyof ConsultationPayload, value: unknown) => {
    setForm((p) => ({ ...p, [key]: value }));
    setConfirmed(false);
    requestId.current = requestKey();
  };
  async function execute(run: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await run();
      await query.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  async function encode(file: Blob, max: number) {
    if (file.size > max) throw new Error(`Arquivo excede ${max / 1024 / 1024} MB.`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 32768)
      s += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(s);
  }
  async function record() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Gravação exige HTTPS ou localhost. Você também pode anexar um áudio.");
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = input;
      const media = new MediaRecorder(input),
        chunks: Blob[] = [];
      recorder.current = media;
      media.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      media.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        input.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setBusy(true);
        const mime = media.mimeType.split(";")[0] ?? "audio/webm";
        void encode(new Blob(chunks, { type: mime }), 5 * 1024 * 1024)
          .then((data) => {
            if (form.audios.length >= 3) throw new Error("Use até três áudios por envio.");
            update("audios", [...form.audios, { mime, data }]);
          })
          .catch((e) => setError(e.message))
          .finally(() => setBusy(false));
      };
      media.start();
      setRecording(true);
      timer.current = setTimeout(() => media.stop(), 180000);
    } catch (cause) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(cause instanceof Error ? cause.message : "Não foi possível gravar.");
    }
  }
  const entries = (query.data ?? []).filter((e) => e.kind === kind);
  return (
    <div className="space-y-5">
      {!patient && (
        <section className="consultation-hero">
          <div>
            <p className="eyebrow">CONSULTA E COMUNICAÇÃO</p>
            <h2 className="mt-3 font-display text-2xl font-semibold">{labels[kind]}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {kind === "preparation"
                ? "Sintomas, medicamentos, perguntas, áudios e documentos preparados antes da consulta."
                : "Registros vinculados a este paciente, salvos na sua conta."}
            </p>
          </div>
        </section>
      )}
      {patient && kind === "preparation" && (
        <>
          <section className="surface p-4">
            <p className="text-sm font-semibold text-brand-deep">
              {draftStatus || "Preparação da consulta"}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Textos, áudios concluídos e PDFs ficam neste navegador e podem ser recuperados ao
              retornar. As informações chegam ao médico quando você confirma o envio.
            </p>
          </section>
          <section className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Meus envios ao médico</h2>
              <Button variant="outline" onClick={() => void query.refetch()}>
                Atualizar status
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Acompanhe o recebimento e a revisão das informações enviadas.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {entries.length
                ? `${entries.length} envio(s) disponível(is). Confira os detalhes abaixo.`
                : "Nenhum envio disponível. Confira sua preparação abaixo e confirme o envio ao médico."}
            </p>
          </section>
        </>
      )}
      {query.isError && (
        <div role="alert" className="surface p-5">
          Não foi possível carregar os registros. Execute o SQL de consulta no Supabase e tente
          novamente.{" "}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Atualizar
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-brand-soft p-4 text-sm">
          {message}
        </p>
      )}
      {!patient && kind === "preparation" && (
        <form
          className="surface space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void execute(async () => {
              await linkPatientPortal({ data: { patientId, email, confirmed: true } });
              setMessage("Conta do paciente vinculada. Ele pode enviar a preparação pelo portal.");
            });
          }}
        >
          <h3 className="section-title">Vincular a conta do paciente</h3>
          <p className="text-sm text-muted-foreground">
            Informe o e-mail da conta gratuita já confirmada. CPF e nascimento devem coincidir com
            este cadastro. Confira a identidade antes de vincular.
          </p>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail do paciente"
          />
          <Button disabled={busy || !query.isSuccess}>Confirmar vínculo com este paciente</Button>
        </form>
      )}
      {((patient && kind === "preparation") || (!patient && kind !== "preparation")) && (
        <div className={patient ? "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]" : ""}>
          <form
            className="surface space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              void execute(async () => {
                await saveConsultationEntry({
                  data: {
                    patientId,
                    kind,
                    requestId: requestId.current,
                    confirmed: true,
                    payload: {
                      ...form,
                      title: kind === "preparation" ? "Preparação para consulta" : form.title,
                    },
                  },
                });
                setForm(empty());
                setConfirmed(false);
                requestId.current = requestKey();
                setMessage(
                  patient
                    ? "Preparação enviada ao médico."
                    : "Registro salvo. Confira o rascunho antes de publicar.",
                );
              });
            }}
          >
            {patient && (
              <div>
                <h2 className="text-xl font-semibold">O que você quer conversar?</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Escreva ou grave uma mensagem. Você pode ouvir, apagar e gravar novamente antes de
                  enviar.
                </p>
              </div>
            )}
            <fieldset
              disabled={
                busy ||
                recording ||
                !query.isSuccess ||
                (patient && kind === "preparation" && !draftReady)
              }
              className="space-y-4"
            >
              {kind === "preparation" ? (
                <>
                  {(
                    [
                      ["symptoms", "Como você tem se sentido?"],
                      ["medicines", "Medicamentos e suplementos"],
                      ["questions", "Perguntas para a consulta"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="block text-sm" key={key}>
                      {label}
                      <Textarea
                        className="mt-2 min-h-28"
                        placeholder={
                          key === "symptoms"
                            ? "O que mudou, quando começou e o que mais preocupa você..."
                            : key === "medicines"
                              ? "Nome, dose e frequência, se souber..."
                              : "O que você gostaria de esclarecer?"
                        }
                        maxLength={3000}
                        value={form[key]}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    </label>
                  ))}
                  <label className="block text-sm">
                    Anexar áudio · até 5 MB
                    <Input
                      type="file"
                      multiple
                      accept="audio/webm,audio/ogg,audio/mp4,audio/wav,audio/mpeg"
                      onChange={(e) => {
                        const files = [...(e.target.files ?? [])];
                        setConfirmed(false);
                        if (files.length + form.audios.length > 3) {
                          setError("Use até três áudios por envio.");
                          return;
                        }
                        setBusy(true);
                        void Promise.all(
                          files.map(async (f) => ({
                            mime: f.type,
                            data: await encode(f, 5 * 1024 * 1024),
                          })),
                        )
                          .then((items) => update("audios", [...form.audios, ...items]))
                          .catch((e) => setError(e.message))
                          .finally(() => setBusy(false));
                      }}
                    />
                  </label>
                  <label className="block text-sm">
                    Anexar PDF · até 8 MB
                    <Input
                      type="file"
                      multiple
                      accept="application/pdf,.pdf"
                      onChange={(e) => {
                        const files = [...(e.target.files ?? [])];
                        setConfirmed(false);
                        if (files.length + form.documents.length > 3) {
                          setError("Use até três PDFs por envio.");
                          return;
                        }
                        setBusy(true);
                        void Promise.all(
                          files.map(async (f) => ({
                            name: f.name,
                            data: await encode(f, 8 * 1024 * 1024),
                          })),
                        )
                          .then((items) => update("documents", [...form.documents, ...items]))
                          .catch((e) => setError(e.message))
                          .finally(() => setBusy(false));
                      }}
                    />
                  </label>
                  {form.audios.map((item, i) => (
                    <div key={i}>
                      <Attachment {...item} name={`Áudio ${i + 1}`} />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          update(
                            "audios",
                            form.audios.filter((_, index) => index !== i),
                          )
                        }
                      >
                        Remover áudio {i + 1}
                      </Button>
                    </div>
                  ))}
                  {form.documents.map((item, i) => (
                    <div key={i}>
                      <Attachment data={item.data} mime="application/pdf" name={item.name} />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          update(
                            "documents",
                            form.documents.filter((_, index) => index !== i),
                          )
                        }
                      >
                        Remover PDF
                      </Button>
                    </div>
                  ))}
                  <p role="status" className="text-xs text-muted-foreground">
                    {draftStatus}
                  </p>
                  {form.audio && (
                    <>
                      <Attachment {...form.audio} name="Áudio preparado" />
                      <Button type="button" variant="ghost" onClick={() => update("audio", null)}>
                        Remover áudio
                      </Button>
                    </>
                  )}
                  {form.document && (
                    <>
                      <Attachment
                        data={form.document.data}
                        mime="application/pdf"
                        name={form.document.name}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => update("document", null)}
                      >
                        Remover PDF
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <label className="block text-sm">
                    {kind === "family" ? "Condição e parentesco" : "Título"}
                    <Input
                      required
                      minLength={3}
                      maxLength={120}
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    {kind === "family"
                      ? "Relato informado (não equivale a diagnóstico confirmado)"
                      : "Observações / instruções"}
                    <Textarea
                      maxLength={6000}
                      value={form.text}
                      onChange={(e) => update("text", e.target.value)}
                    />
                  </label>
                  {kind === "return" && (
                    <label className="block text-sm">
                      Data prevista
                      <Input
                        type="date"
                        required
                        value={form.date}
                        onChange={(e) => update("date", e.target.value)}
                      />
                    </label>
                  )}
                  {kind === "order" && (
                    <div className="grid max-h-80 gap-2 overflow-auto rounded-xl border p-4 sm:grid-cols-2">
                      {orderExams.map((exam) => (
                        <label key={exam.id} className="flex gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.exams.includes(exam.name)}
                            onChange={(e) =>
                              update(
                                "exams",
                                e.target.checked
                                  ? [...form.exams, exam.name]
                                  : form.exams.filter((x) => x !== exam.name),
                              )
                            }
                          />
                          {exam.name}
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {patient
                  ? "Revisei o texto e os anexos e autorizo o envio ao médico vinculado."
                  : "Conferi o conteúdo para este paciente."}
              </label>
              <Button disabled={!confirmed}>
                {patient
                  ? "Enviar preparação ao médico"
                  : kind === "family"
                    ? "Salvar histórico familiar"
                    : "Salvar rascunho"}
              </Button>
            </fieldset>
            {patient && (
              <Button
                type="button"
                variant="outline"
                disabled={busy || !query.isSuccess}
                onClick={() => {
                  if (recording) recorder.current?.stop();
                  else void record();
                }}
              >
                {recording ? "Parar gravação" : "Gravar áudio · até 3 minutos"}
              </Button>
            )}
          </form>
          {patient && (
            <aside className="surface p-6">
              <h2 className="text-lg font-semibold">Antes da consulta</h2>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>Tenha seus exames e laudos em mãos.</p>
                <p>Confira os medicamentos e suplementos que usa.</p>
                <p>Liste suas principais dúvidas.</p>
              </div>
              <p className="mt-6 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                Ouça seus áudios e confira os anexos antes de enviar. As respostas só chegam à área
                médica quando você confirma o envio.
              </p>
            </aside>
          )}
        </div>
      )}
      <section className="space-y-4">
        {query.isPending && <p>Carregando…</p>}
        {query.isSuccess && !entries.length && (
          <div className="surface p-6 text-sm text-muted-foreground">
            {patient
              ? kind === "guidance"
                ? "Nenhuma orientação liberada. Quando o médico publicar uma orientação, ela aparecerá aqui e você receberá um aviso no portal."
                : kind === "order"
                  ? "Você ainda não tem exames solicitados. Eles aparecerão aqui quando seu médico liberar um pedido."
                  : kind === "return"
                    ? "Nenhum retorno planejado publicado pelo médico."
                    : "Nenhum envio disponível."
              : "Nenhum registro nesta seção."}
          </div>
        )}
        {entries.map((entry) => (
          <article key={entry.id} className="surface space-y-3 p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <h3 className="section-title">{entry.payload.title}</h3>
              <span className="text-xs text-muted-foreground">
                {
                  {
                    draft: "Rascunho",
                    published: "Publicado",
                    reviewed: "Revisado",
                    cancelled: "Cancelado",
                  }[entry.status]
                }{" "}
                · {new Date(entry.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{entry.payload.text}</p>
            {entry.payload.date && (
              <p className="text-sm">Data: {entry.payload.date.split("-").reverse().join("/")}</p>
            )}
            {entry.payload.exams.map((exam) => (
              <p key={exam} className="text-sm">
                • {exam}
              </p>
            ))}
            {(["symptoms", "medicines", "questions"] as const).map(
              (key) =>
                entry.payload[key] && (
                  <div key={key} className="rounded-xl bg-background p-4">
                    <h4 className="text-sm font-semibold">
                      {
                        {
                          symptoms: "Sintomas e mudanças",
                          medicines: "Medicamentos",
                          questions: "Perguntas",
                        }[key]
                      }
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{entry.payload[key]}</p>
                  </div>
                ),
            )}
            {entry.payload.audio && (
              <Attachment {...entry.payload.audio} name="Áudio do paciente" />
            )}
            {entry.payload.audios?.map((item, index) => (
              <Attachment
                key={`audio:${index}`}
                {...item}
                name={`Áudio ${index + 1} do paciente`}
              />
            ))}
            {entry.payload.documents?.map((item, index) => (
              <Attachment
                key={`pdf:${index}`}
                data={item.data}
                mime="application/pdf"
                name={item.name}
              />
            ))}
            {entry.payload.document && (
              <Attachment
                data={entry.payload.document.data}
                mime="application/pdf"
                name={entry.payload.document.name}
              />
            )}
            <div className="flex flex-wrap gap-2">
              {!patient && entry.kind === "preparation" && entry.status === "published" && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    void execute(() =>
                      transitionConsultationEntry({
                        data: { patientId, id: entry.id, status: "reviewed", confirmed: true },
                      }),
                    )
                  }
                >
                  Confirmar leitura e escuta
                </Button>
              )}
              {!patient &&
                ["order", "guidance", "return"].includes(entry.kind) &&
                entry.status === "draft" && (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void execute(() =>
                        transitionConsultationEntry({
                          data: { patientId, id: entry.id, status: "published", confirmed: true },
                        }),
                      )
                    }
                  >
                    Confirmar revisão e publicar no portal
                  </Button>
                )}
              {!patient &&
                ["order", "guidance", "return"].includes(entry.kind) &&
                ["draft", "published"].includes(entry.status) && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void execute(() =>
                        transitionConsultationEntry({
                          data: { patientId, id: entry.id, status: "cancelled", confirmed: true },
                        }),
                      )
                    }
                  >
                    Cancelar / retirar
                  </Button>
                )}
              <Button variant="ghost" onClick={() => window.print()}>
                Imprimir
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
