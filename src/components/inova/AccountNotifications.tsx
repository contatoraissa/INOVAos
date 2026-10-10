import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { listAccountNotifications, readAccountNotifications } from "@/lib/real-complements";
import { Button } from "@/components/ui/button";
export function AccountNotifications({
  patient = false,
  userId,
}: {
  patient?: boolean;
  userId?: string;
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
      {open && (
        <section className="absolute right-0 z-50 max-h-96 w-[min(350px,85vw)] overflow-auto rounded-xl border bg-white p-4 shadow-xl">
          <h2 className="font-semibold">Avisos da sua conta</h2>
          {query.isError ? (
            <p className="mt-3 text-sm">Avisos indisponíveis. Confira o SQL de complementos.</p>
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
                  </p>
                  {patient ? (
                    <Link
                      to="/portal-paciente"
                      search={{ workspace: "account" }}
                      className="text-xs text-brand-deep"
                    >
                      Abrir meu espaço
                    </Link>
                  ) : (
                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: item.patient_id }}
                      search={{ workspace: "account" }}
                      className="text-xs text-brand-deep"
                    >
                      Abrir prontuário
                    </Link>
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
