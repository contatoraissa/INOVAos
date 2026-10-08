import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getAccountSession } from "./account-session";
import { databaseConfig, databaseRequest } from "./supabase.server";
import { patientRegistration } from "./medical-patient-contract";
async function owner() {
  const account = await getAccountSession();
  if (!account?.canPreview) throw new Error("Acesso médico não autorizado.");
  return account;
}
export const listMedicalPatients = createServerFn({ method: "GET" }).handler(async () => {
  const account = await owner();
  const config = databaseConfig()!;
  return (await databaseRequest(
    config,
    `inova_medical_patients?doctor_id=eq.${account.userId}&select=id,name,birth,created_at&order=created_at.desc`,
  )) as { id: string; name: string; birth: string; created_at: string }[];
});
export const createMedicalPatient = createServerFn({ method: "POST" })
  .validator(patientRegistration)
  .handler(async ({ data }) => {
    const request = getRequest();
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new Error("Solicitação não autorizada.");
    const account = await owner();
    return databaseRequest(databaseConfig()!, "rpc/inova_create_medical_patient", {
      p_doctor: account.userId,
      p_name: data.name,
      p_cpf: data.cpf,
      p_birth: data.birth,
      p_notes: data.notes,
    });
  });
export const getMedicalPatient = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const account = await owner();
    const rows = (await databaseRequest(
      databaseConfig()!,
      `inova_medical_patients?id=eq.${data.id}&doctor_id=eq.${account.userId}&select=id,name,cpf,birth,notes&limit=1`,
    )) as { id: string; name: string; cpf: string; birth: string; notes: string }[];
    if (!rows[0]) throw new Error("Paciente não encontrado na sua conta.");
    return rows[0];
  });
