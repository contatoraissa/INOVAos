import { createContext, useContext } from "react";
import type { Patient } from "@/data/demo";
export const PatientDirectoryContext = createContext<{
  patients: Patient[];
  addPatient: (patient: Patient) => void;
} | null>(null);
export function usePatientDirectory() {
  const value = useContext(PatientDirectoryContext);
  if (!value) throw new Error("PatientDirectoryProvider is required");
  return value;
}
