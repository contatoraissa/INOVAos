import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listMedicalGuidance, publishGuidance, saveGuidance, withdrawGuidance } from "@/lib/care";
import { listExamOrders } from "@/lib/exam-orders";
import { createSessionId } from "@/lib/session-id";
import type { MedicalGuidance } from "@/lib/care-contract";
import type { ExamOrder } from "@/lib/exam-order-contract";
import {
  listConsultationEntries,
  saveConsultationEntry,
  transitionConsultationEntry,
} from "@/lib/real-consultation";
import {
  accountOrders,
  accountGuidance,
  emptyConsultationPayload,
} from "@/lib/account-care-adapters";
export function DoctorGuidance({
  patientId,
  account = false,
}: {
  patientId: string;
  account?: boolean;
}) {
  const [items, setItems] = useState<MedicalGuidance[]>([]);
  const [orders, setOrders] = useState<ExamOrder[]>([]);
  const [category, setCategory] = useState<MedicalGuidance["category"]>("Resultados");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const request = useRef({ signature: "", id: "" });
  const refresh = useCallback(async () => {
    try {
      if (account) {
        const entries = await listConsultationEntries({ data: { patientId } });
        setItems(accountGuidance(entries));
        setOrders(accountOrders(entries).filter((order) => order.status === "released"));
        return;
      }
      const [guidance, requests] = await Promise.all([
        listMedicalGuidance({ data: { patientId } }),
        listExamOrders({ data: { patientId, audience: "doctor" } }),
      ]);
      setItems(guidance);
      setOrders(requests.filter((order) => order.status === "released"));
    } catch {
      setError("Não foi possível atualizar as orientações e os pedidos.");
    }
  }, [patientId, account]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = {
        patientId,
        category,
        title: String(values.get("title")),
        text: String(values.get("text")),
        sourceName: String(values.get("sourceName") ?? ""),
        sourceUrl: String(values.get("sourceUrl") ?? ""),
        sourceDate: String(values.get("sourceDate") ?? ""),
        orderId: String(values.get("orderId") ?? "") || null,
      };
      const signature = JSON.stringify(data);
      if (request.current.signature !== signature)
        request.current = { signature, id: createSessionId() };
      if (account) {
        const { patientId: scope, ...payload } = data;
        await saveConsultationEntry({
          data: {
            patientId: scope,
            requestId: request.current.id,
            kind: "guidance",
            confirmed: true,
            payload: { ...emptyConsultationPayload(), ...payload },
          },
        });
      } else await saveGuidance({ data: { ...data, requestId: request.current.id } });
      form.reset();
      request.current = { signature: "", id: "" };
      await refresh();
      setMessage("Rascunho salvo. Revise o texto e confirme a publicação para o paciente.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function change(id: string, action: "publish" | "withdraw") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (account)
        await transitionConsultationEntry({
          data: {
            patientId,
            id,
            status: action === "publish" ? "published" : "cancelled",
            confirmed: true,
          },
        });
      else if (action === "publish") await publishGuidance({ data: { id, reviewed: true } });
      else await withdrawGuidance({ data: { id } });
      await refresh();
      setMessage(
        action === "publish"
          ? "Orientação publicada. O paciente recebe um aviso no portal."
          : "Orientação retirada do portal. O histórico registra a retirada.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Orientações para o paciente</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Escreva, confira e publique explicitamente. Rascunhos não aparecem no portal.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            void refresh();
          }}
        >
          <RefreshCw />
          Atualizar orientações
        </Button>
      </div>
      <p className="rounded-xl border border-border bg-white p-4 text-xs leading-relaxed text-muted-foreground">
        {account
          ? "Publicação revisada pelo profissional."
          : "Publicação demonstrativa pelo profissional."}{" "}
        A síntese da IA não é liberada automaticamente. Preparo de exames exige pedido ativo e
        instrução da unidade com fonte, link e data conferidos.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-brand-deep">
          {message}
        </p>
      )}
      <form
        className="surface grid gap-5 p-6 sm:grid-cols-2"
        onSubmit={(event) => {
          void save(event);
        }}
      >
        <div>
          <label htmlFor="guidance-category" className="label">
            Categoria
          </label>
          <select
            id="guidance-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as MedicalGuidance["category"])}
            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
          >
            {["Resultados", "Próximos passos", "Preparo dos exames"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="guidance-order" className="label">
            Pedido vinculado{category !== "Preparo dos exames" ? " (opcional)" : ""}
          </label>
          <select
            id="guidance-order"
            name="orderId"
            required={category === "Preparo dos exames"}
            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
          >
            <option value="">Selecionar pedido</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.exams.map((exam) => exam.name).join(" · ")}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="guidance-title" className="label">
            Título
          </label>
          <Input id="guidance-title" name="title" required minLength={3} maxLength={120} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="guidance-text" className="label">
            Texto que o paciente verá
          </label>
          <Textarea
            id="guidance-text"
            name="text"
            required
            minLength={5}
            maxLength={5000}
            className="min-h-40"
          />
        </div>
        <div>
          <label htmlFor="guidance-source" className="label">
            Unidade ou fonte da instrução{category !== "Preparo dos exames" ? " (opcional)" : ""}
          </label>
          <Input
            id="guidance-source"
            name="sourceName"
            required={category === "Preparo dos exames"}
            maxLength={150}
          />
        </div>
        <div>
          <label htmlFor="guidance-date" className="label">
            Data de atualização da fonte{category !== "Preparo dos exames" ? " (opcional)" : ""}
          </label>
          <Input
            id="guidance-date"
            name="sourceDate"
            type="date"
            required={category === "Preparo dos exames"}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="guidance-url" className="label">
            Link HTTPS da fonte{category !== "Preparo dos exames" ? " (opcional)" : ""}
          </label>
          <Input
            id="guidance-url"
            name="sourceUrl"
            type="url"
            required={category === "Preparo dos exames"}
            placeholder="https://…"
          />
        </div>
        <Button disabled={busy} className="sm:col-span-2">
          <Check />
          Salvar rascunho da orientação
        </Button>
      </form>
      {items.map((item) => (
        <article key={item.id} data-guidance-id={item.id} className="surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand-deep">
              {item.withdrawnAt
                ? "Retirada"
                : item.publishedAt
                  ? "Publicada ao paciente"
                  : "Rascunho"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{item.category}</p>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
            {item.text}
          </p>
          {item.sourceName && (
            <p className="mt-4 text-xs text-muted-foreground">
              Fonte: {item.sourceName} · {item.sourceDate || "data não informada"}
            </p>
          )}
          {!item.publishedAt && !item.withdrawnAt && (
            <label className="mt-5 flex items-start gap-2 text-xs leading-relaxed">
              <input
                type="checkbox"
                checked={Boolean(reviewed[item.id])}
                onChange={(event) =>
                  setReviewed((current) => ({ ...current, [item.id]: event.target.checked }))
                }
              />
              Revisei este texto, a associação ao paciente e, quando houver preparo, a fonte e o
              pedido vinculados.
            </label>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {!item.publishedAt && !item.withdrawnAt && (
              <Button
                disabled={busy || !reviewed[item.id]}
                onClick={() => {
                  void change(item.id, "publish");
                }}
              >
                <Send />
                Publicar para paciente
              </Button>
            )}
            {!item.withdrawnAt && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  void change(item.id, "withdraw");
                }}
              >
                Retirar orientação
              </Button>
            )}
          </div>
        </article>
      ))}
      {!items.length && (
        <p className="text-sm text-muted-foreground">
          Nenhuma orientação escrita para este paciente.
        </p>
      )}
    </div>
  );
}
