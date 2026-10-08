import { useCallback, useEffect, useState } from "react";
import { getPatientCare } from "@/lib/care";
export type PatientCareData = Awaited<ReturnType<typeof getPatientCare>>;
export function usePatientCare(enabled: boolean) {
  const [data, setData] = useState<PatientCareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setData(await getPatientCare({ data: { patientId: "mariana-oliveira" } }));
      setError("");
    } catch {
      setError("Não foi possível atualizar o acompanhamento. Confira a conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [enabled, refresh]);
  return { data, error, loading, refresh };
}
