import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { Report, ReportKind } from "@/data/molecular-reports";
type ConsultationState = {
  reportsByKind: Record<ReportKind, Report[]>;
  setReportsByKind: Dispatch<SetStateAction<Record<ReportKind, Report[]>>>;
  reviewed: Record<string, boolean>;
  setReviewed: Dispatch<SetStateAction<Record<string, boolean>>>;
  identityVerified: Record<string, boolean>;
  setIdentityVerified: Dispatch<SetStateAction<Record<string, boolean>>>;
  closing: { plan: string; snapshot: { signature: string; at: string; text: string } | null };
  setClosing: Dispatch<
    SetStateAction<{
      plan: string;
      snapshot: { signature: string; at: string; text: string } | null;
    }>
  >;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
  completed: Record<string, boolean>;
  setCompleted: Dispatch<SetStateAction<Record<string, boolean>>>;
  baseline: string;
  setBaseline: Dispatch<SetStateAction<string>>;
  selectedReports: Partial<Record<ReportKind, string>>;
  setSelectedReports: Dispatch<SetStateAction<Partial<Record<ReportKind, string>>>>;
};
export const Context = createContext<ConsultationState | null>(null);
export function useConsultation() {
  const context = useContext(Context);
  if (!context) throw new Error("ConsultationProvider is required");
  return context;
}
