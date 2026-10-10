import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { listAccountNotifications, readAccountNotifications } from "@/lib/real-complements";
import { Button } from "@/components/ui/button";
export function AccountNotifications({
  patient = false,
  userId,
  panel = false,
  onOpenNotification,
}: {
  patient?: boolean;
  userId?: string;
  panel?: boolean;
  onOpenNotification?: (patientId: string, event: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["account-notifications", userId],
    queryFn: () => listAccountNotifications(),
    refetchInterval: 30000,
  });
  const unread = query.data?.filter((item) => !item.read_at).length ?? 0;
  return (
    <div className="relative">
      {!panel && (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg p-2"
          aria-expanded={open}
          aria-label={`Avisos: ${unread} não lidos`}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="rounded-full bg-brand px-2 text-xs text-white">{unread}</span>
          )}
        </button>
      )}
      {(open || panel) && (
        <section
          className={
            panel
              ? "surface space-y-4 p-5"
              : "absolute right-0 z-50 max-h-96 w-[min(350px,85vw)] overflow-auto rounded-xl border bg-white p-4 shadow-xl"
          }
        >
          <h2 className="font-semibold">Avisos da sua conta</h2>
          {panel && (
            <Button
              variant="outline"
              size="sm"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Atualizar acompanhamento
            </Button>
          )}
          {panel && <p className="text-sm text-muted-foreground">{unread} aviso(s) não lido(s)</p>}
          {query.isError ? (
            <div className="mt-3 text-sm">
              Avisos indisponíveis. Tente atualizar.
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Atualizar avisos
              </Button>
            </div>
          ) : query.isPending ? (
            <p>Carregando…</p>
          ) : (
            <>
              {!query.data?.length && (
                <p className="mt-3 text-sm text-muted-foreground">Nenhum aviso recebido.</p>
              )}
              {query.data?.map((item) => (
                <div
                  key={item.id}
                  className={`mt-3 rounded-lg border p-3 ${item.read_at ? "" : "bg-brand-soft"}`}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                    {item.read_at ? " · Lido" : " · Novo"}
                  </p>
                  {patient && onOpenNotification ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onOpenNotification(item.patient_id, item.event);
                        setOpen(false);
                      }}
                    >
                      Abrir aviso no meu espaço
                    </Button>
                  ) : patient ? (
                    <Link
                      to="/portal-paciente"
                      search={{ workspace: "account" }}
                      className="text-xs text-brand-deep"
                    >
                      Abrir meu espaço
                    </Link>
                  ) : item.event?.includes("agenda") || item.event?.includes("return") ? (
                    <Link
                      to="/agenda"
                      search={{ workspace: "account" }}
                      className="text-xs text-brand-deep"
                    >
                      Abrir agenda
                    </Link>
                  ) : (
                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: item.patient_id }}
                      search={{ workspace: "account" }}
                      hash={
                        item.event?.includes("genetic")
                          ? "Genética"
                          : item.event?.includes("report")
                            ? "Laudos laboratoriais"
                            : item.event?.includes("order")
                              ? "Solicitar exames"
                              : item.event?.includes("guidance")
                                ? "Orientações ao paciente"
                                : item.event?.includes("agenda") || item.event?.includes("return")
                                  ? "Resumo da consulta"
                                  : "Envios do paciente"
                      }
                      className="text-xs text-brand-deep"
                    >
                      Abrir prontuário
                    </Link>
                  )}
                  {!item.read_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await readAccountNotifications({ data: { ids: [item.id] } });
                          await query.refetch();
                        } catch {
                          setError("Não foi possível marcar este aviso como lido.");
                        }
                      }}
                    >
                      Marcar como lido
                    </Button>
                  )}
                </div>
              ))}
              {unread > 0 && (
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await readAccountNotifications();
                      await query.refetch();
                    } catch {
                      setError("Não foi possível marcar como lidos.");
                    }
                  }}
                >
                  Marcar avisos como lidos
                </Button>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
