import { useState, type ReactNode } from "react";
import { patients as initialPatients, type Patient } from "@/data/demo";
import { PatientDirectoryContext } from "./patient-directory";
export function PatientDirectoryProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const addPatient = (patient: Patient) => setPatients((items) => [patient, ...items]);
  return (
    <PatientDirectoryContext.Provider value={{ patients, addPatient }}>
      {children}
    </PatientDirectoryContext.Provider>
  );
}
