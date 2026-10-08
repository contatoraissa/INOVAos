import { readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { makePdf } from "./generate-example-pdfs.mjs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i),
        l
          .slice(i + 1)
          .trim()
          .replace(/^['"]|['"]$/g, ""),
      ];
    }),
);
const url = env.SUPABASE_URL,
  key = env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase configuration missing.");
const headers = {
  apikey: key,
  ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
};
async function request(path, body) {
  const response = await fetch(url + path, {
    method: body ? "POST" : "GET",
    headers: { ...headers, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Operation failed (${response.status}): ${path.split("?")[0]}`);
  return response.status === 204 ? null : response.json();
}
const accounts = await request(
  "/rest/v1/inova_account_details?account_type=eq.patient&select=user_id,full_name,cpf,birth_date",
);
if (!process.argv.includes("--apply")) {
  for (const account of accounts) {
    const links = await request(
      `/rest/v1/inova_portal_links?user_id=eq.${account.user_id}&select=patient_id`,
    );
    console.log(JSON.stringify({ name: account.full_name, linkedRecords: links.length }));
  }
  process.exit(0);
}
const targetName = process.argv.find((arg) => arg.startsWith("--name="))?.slice(7);
if (!targetName) throw new Error("Specify the exact patient account name with --name.");
const matches = accounts.filter((a) => a.full_name === targetName);
if (matches.length !== 1) throw new Error("Patient account must match uniquely.");
const account = matches[0];
const identity = await request(`/auth/v1/admin/users/${account.user_id}`);
if (!identity.email_confirmed_at || !identity.email)
  throw new Error("Patient email must be confirmed.");
const links = await request(
  `/rest/v1/inova_portal_links?user_id=eq.${account.user_id}&select=patient_id,doctor_id`,
);
if (links.length > 1) throw new Error("Multiple medical records: specify a target before seeding.");
let patientId = links[0]?.patient_id,
  doctorId = links[0]?.doctor_id;
if (!patientId) {
  const doctors = await request(
    "/rest/v1/inova_account_details?full_name=eq.Alison%20Bianchin&account_type=eq.doctor&select=user_id",
  );
  if (doctors.length !== 1) throw new Error("Doctor must match uniquely.");
  doctorId = doctors[0].user_id;
  const existing = await request(
    `/rest/v1/inova_medical_patients?doctor_id=eq.${doctorId}&cpf=eq.${account.cpf}&select=id,birth`,
  );
  if (existing.length && existing[0].birth !== account.birth_date)
    throw new Error("Patient identity mismatch.");
  patientId = existing[0]?.id;
  if (!patientId) {
    const created = await request("/rest/v1/rpc/inova_create_medical_patient", {
      p_doctor: doctorId,
      p_name: account.full_name,
      p_cpf: account.cpf,
      p_birth: account.birth_date,
      p_notes:
        "Conta usada para teste do sistema. Exames INOVA_TESTE_FICTICIO sao sinteticos e nao possuem validade clinica.",
    });
    patientId = created.id;
  }
  await request("/rest/v1/rpc/inova_link_patient_portal", {
    p_doctor: doctorId,
    p_patient: patientId,
    p_email: identity.email,
  });
}
const markers = [
  ["Hemoglobina", "g/dL", [13.2, 13.4, 13.5, 13.6, 13.6, 13.8]],
  ["Glicemia", "mg/dL", [104, 102, 100, 99, 98, 92]],
  ["Colesterol LDL", "mg/dL", [132, 128, 126, 122, 124, 108]],
  ["Vitamina D", "ng/mL", [29.4, 30.1, 31.5, 32.7, 33.7, 34.6]],
];
const dates = ["2025-03-18", "2025-06-18", "2025-11-18", "2026-03-18", "2026-06-18", "2026-09-18"];
if (dates.some((date) => date < account.birth_date))
  throw new Error("Test collection predates patient birth.");
for (const [index, date] of dates.entries()) {
  const observations = markers.map(([name, unit, values]) => ({
    name,
    unit,
    value: String(values[index]).replace(".", ","),
    reference: "DADO FICTICIO - referencia clinica nao definida para este teste",
    collection: date,
    flag: "sem_classificacao",
    page: 1,
    quote: "DADOS FICTICIOS PARA TESTE - SEM VALIDADE CLINICA",
  }));
  const filename = `INOVA_TESTE_FICTICIO_${date}.pdf`;
  const bytes = makePdf([
    [
      "INOVA - DADOS FICTICIOS PARA TESTE",
      "SEM VALIDADE CLINICA. NAO USAR EM ATENDIMENTO.",
      "Perfil de teste vinculado a conta do paciente.",
      `Coleta simulada: ${date}`,
      ...observations.map((o) => `${o.name}: ${o.value} ${o.unit}`),
      "Valores sinteticos. Nao representam a saude do titular.",
    ],
  ]);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const existing = await request(
    `/rest/v1/inova_medical_reports?doctor_id=eq.${doctorId}&patient_id=eq.${patientId}&sha256=eq.${hash}&select=id,reviewed_at`,
  );
  let report = existing[0];
  if (!report) {
    const id = randomUUID(),
      path = `${doctorId}/${patientId}/${id}.pdf`;
    const response = await fetch(`${url}/storage/v1/object/inova-reports/${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/pdf", "x-upsert": "false" },
      body: bytes,
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Storage unavailable (${response.status}).`);
    try {
      report = await request("/rest/v1/rpc/inova_register_medical_report", {
        p_id: id,
        p_doctor: doctorId,
        p_patient: patientId,
        p_filename: filename,
        p_kind: "Laboratorial",
        p_path: path,
        p_hash: hash,
        p_bytes: bytes.length,
      });
    } catch (cause) {
      await fetch(`${url}/storage/v1/object/inova-reports`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [path] }),
      });
      throw cause;
    }
  }
  if (!report.reviewed_at)
    await request("/rest/v1/rpc/inova_review_manual_results", {
      p_id: report.id,
      p_doctor: doctorId,
      p_date: date,
      p_summary: {
        subjectName: "PERFIL DE TESTE - DADOS FICTICIOS",
        pages: 1,
        scope: "Valores sinteticos para teste de software; sem validade clinica.",
        findings: [],
        limitations: ["Nao usar estes valores para decisoes clinicas."],
        observations,
      },
    });
}
const verified = await request(
  `/rest/v1/inova_medical_results?doctor_id=eq.${doctorId}&patient_id=eq.${patientId}&select=id,report_id`,
);
const reports = await request(
  `/rest/v1/inova_medical_reports?doctor_id=eq.${doctorId}&patient_id=eq.${patientId}&filename=like.INOVA_TESTE_FICTICIO_*&select=id,reviewed_at`,
);
const reportIds = new Set(reports.map((r) => r.id));
const count = verified.filter((r) => reportIds.has(r.report_id)).length;
if (reports.length !== 6 || count !== 24 || reports.some((r) => !r.reviewed_at))
  throw new Error("Test data verification failed.");
console.log(
  JSON.stringify({
    patientAccount: account.full_name,
    testReports: reports.length,
    testResults: count,
    collections: dates.length,
    linked: true,
    emailsSent: 0,
  }),
);
