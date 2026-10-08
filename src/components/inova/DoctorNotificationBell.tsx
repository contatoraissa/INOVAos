import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { listPreparationNotices } from "@/lib/preparation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { usePatientDirectory } from "./patient-directory";

const key = "inova-demo-doctor-read-notices-v1";
export function DoctorNotificationBell() {
  const { patients } = usePatientDirectory();
  const ids = JSON.stringify(patients.map((p) => p.id));
  const [items, setItems] = useState<Awaited<ReturnType<typeof listPreparationNotices>>>([]);
  const [read, setRead] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const alive = useRef(false);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await listPreparationNotices({ data: { patientIds: JSON.parse(ids) } });
      if (alive.current) {
        setItems(result);
        setError("");
      }
    } catch {
      if (alive.current) setError("Não foi possível atualizar os avisos. Tente novamente.");
    } finally {
      inFlight.current = false;
      if (alive.current) setLoading(false);
    }
  }, [ids]);
  useEffect(() => {
    alive.current = true;
    const recover = () => {
      try {
        const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (Array.isArray(value) && value.every((v) => typeof v === "string")) setRead(value);
      } catch {
        setStorageError("Não foi possível recuperar os avisos lidos neste navegador.");
      }
    };
    recover();
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("storage", recover);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("storage", recover);
    };
  }, [refresh]);
  function mark(idsToRead: string[]) {
    const next = [...new Set([...read, ...idsToRead])].slice(-500);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setRead(next);
      setStorageError("");
    } catch {
      setStorageError("Não foi possível salvar a leitura neste navegador.");
    }
  }
  const unread = items.filter((item) => !read.includes(item.id)).length;
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) void refresh();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-md p-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
          aria-label={`Notificações: ${unread} não lidas`}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] max-w-[calc(100vw-24px)] p-0"
        aria-label="Notificações do médico"
      >
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">Notificações</h2>
          <p className="mt-1 text-xs text-muted-foreground">{unread} não lida(s) · demonstração</p>
        </div>
        {error && (
          <p role="alert" className="px-4 pt-3 text-xs text-destructive">
            {error}
          </p>
        )}
        {storageError && (
          <p role="alert" className="px-4 pt-3 text-xs text-destructive">
            {storageError}
          </p>
        )}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">Carregando avisos…</p>
          ) : !items.length && !error ? (
            <p className="p-3 text-sm text-muted-foreground">
              Nenhum envio recebido. Preparações e PDFs enviados pelos pacientes aparecerão aqui.
            </p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                to={item.agenda ? "/agenda" : "/patients/$patientId"}
                params={{ patientId: item.patientId }}
                hash={item.agenda ? "" : "Envios do paciente"}
                onClick={() => {
                  mark([item.id]);
                  setOpen(false);
                }}
                className={`mb-1 block rounded-lg p-3 hover:bg-muted ${read.includes(item.id) ? "" : "bg-brand-soft"}`}
              >
                <p className="text-sm font-semibold">
                  {patients.find((p) => p.id === item.patientId)?.name ?? "Paciente"}
                </p>
                <p className="mt-1 text-sm">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.agenda ? (
                    "Atualização no calendário compartilhado"
                  ) : (
                    <>
                      {item.documents} PDF(s) · {item.audios} áudio(s) ·{" "}
                      {item.reviewed ? "Revisado" : "Aguardando revisão"}
                    </>
                  )}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(item.receivedAt).toLocaleString("pt-BR")} ·{" "}
                  {item.agenda ? "Abrir agenda" : "Abrir envio"}
                </p>
              </Link>
            ))
          )}
        </div>
        <div className="flex justify-between gap-2 border-t border-border p-3">
          <Button variant="ghost" size="sm" onClick={() => void refresh()}>
            Atualizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!unread}
            onClick={() => mark(items.map((item) => item.id))}
          >
            Marcar como lidas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
