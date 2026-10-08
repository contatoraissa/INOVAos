import { useState, type ReactNode } from "react";
import { demoReports, type Report, type ReportKind } from "@/data/molecular-reports";
import { Context } from "./consultation-state";
export function ConsultationProvider({
  patientId,
  children,
}: {
  patientId: string;
  children: ReactNode;
}) {
  const [reportsByKind, setReportsByKind] = useState<Record<ReportKind, Report[]>>(
    patientId === "mariana-oliveira"
      ? {
          Genética: [...demoReports.Genética],
          Genômica: [...demoReports.Genômica],
          Laboratorial: [],
        }
      : { Genética: [], Genômica: [], Laboratorial: [] },
  );
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [identityVerified, setIdentityVerified] = useState<Record<string, boolean>>({});
  const [closing, setClosing] = useState<{
    plan: string;
    snapshot: { signature: string; at: string; text: string } | null;
  }>({ plan: "", snapshot: null });
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [baseline, setBaseline] = useState("");
  const [selectedReports, setSelectedReports] = useState<Partial<Record<ReportKind, string>>>({});
  return (
    <Context.Provider
      value={{
        reportsByKind,
        setReportsByKind,
        reviewed,
        setReviewed,
        identityVerified,
        setIdentityVerified,
        closing,
        setClosing,
        notes,
        setNotes,
        completed,
        setCompleted,
        baseline,
        setBaseline,
        selectedReports,
        setSelectedReports,
      }}
    >
      {children}
    </Context.Provider>
  );
}
