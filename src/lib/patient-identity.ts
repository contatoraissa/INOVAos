import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getAccountSession } from "./account-session";
import { databaseConfig, databaseRequest } from "./supabase.server";

export type PatientRegistrationRecord = {
  id: string;
  name: string;
  birth: string;
  cpf: string;
  email: string;
  phone: string;
  rg: string;
  sex: string;
  address: string;
  linked: boolean;
  doctorName: string;
};

async function records() {
  const account = await getAccountSession();
  if (!account || (account.account_type !== "patient" && !account.canPreview))
    throw new Error("Entre em uma conta autorizada.");
  const config = databaseConfig()!;
  try {
    await databaseRequest(
      config,
      "inova_medical_patients?select=email,identity_confirmed_at&limit=0",
    );
  } catch {
    throw new Error(
      "O vínculo de cadastros precisa da atualização do banco. Instale INOVA_VINCULO_PACIENTE_SQL_EDITOR.sql no Supabase.",
    );
  }
  const fields = "id,name,birth,cpf,email,phone,rg,sex,address";
  if (account.account_type === "doctor") {
    const patients = (await databaseRequest(
      config,
      `inova_medical_patients?doctor_id=eq.${account.userId}&select=${fields}&order=created_at.desc`,
    )) as Omit<PatientRegistrationRecord, "linked" | "doctorName">[];
    const links = (await databaseRequest(
      config,
      `inova_portal_links?doctor_id=eq.${account.userId}&select=patient_id`,
    )) as { patient_id: string }[];
    return patients.map((patient) => ({
      ...patient,
      linked: links.some((link) => link.patient_id === patient.id),
      doctorName: account.full_name,
    }));
  }
  const links = (await databaseRequest(
    config,
    `inova_portal_links?user_id=eq.${account.userId}&select=patient_id,doctor_id`,
  )) as { patient_id: string; doctor_id: string }[];
  return (
    await Promise.all(
      links.map(async (link) => {
        const [patients, doctors] = await Promise.all([
          databaseRequest(
            config,
            `inova_medical_patients?id=eq.${link.patient_id}&doctor_id=eq.${link.doctor_id}&select=${fields}&limit=1`,
          ),
          databaseRequest(
            config,
            `inova_profiles?id=eq.${link.doctor_id}&select=display_name&limit=1`,
          ),
        ]);
        const patient = (patients as Omit<PatientRegistrationRecord, "linked" | "doctorName">[])[0];
        return patient
          ? {
              ...patient,
              linked: true,
              doctorName: (doctors as { display_name: string }[])[0]?.display_name ?? "Seu médico",
            }
          : null;
      }),
    )
  ).filter((record): record is PatientRegistrationRecord => record !== null);
}

export const listPatientRegistrations = createServerFn({ method: "GET" }).handler(records);
export const synchronizePatientRegistration = createServerFn({ method: "POST" }).handler(
  async () => {
    const request = getRequest();
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new Error("Solicitação não autorizada.");
    const account = await getAccountSession();
    if (account?.account_type !== "patient") throw new Error("Entre na sua conta de paciente.");
    // Check migration and authorization before invoking a service-role RPC.
    await records();
    await databaseRequest(databaseConfig()!, "rpc/inova_sync_patient_identity", {
      p_user: account.userId,
    });
    return records();
  },
);
