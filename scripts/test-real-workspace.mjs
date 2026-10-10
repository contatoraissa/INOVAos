import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { realAgendaInput, preferenceInput } from "../src/lib/real-workspace-contract.ts";
import { readDoctorConsultationMetadata } from "../src/lib/real-workspace-metadata.server.ts";
import { consultationPayload } from "../src/lib/real-consultation-contract.ts";
const doctor = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const patient = "20000000-0000-4000-8000-000000000001";
const stranger = "20000000-0000-4000-8000-000000000002";
const chart = "30000000-0000-4000-8000-000000000001";
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key);create table public.inova_profiles(id uuid primary key,role text,display_name text);
 create table public.inova_account_details(user_id uuid primary key,account_type text);
 create table public.inova_medical_patients(id uuid primary key,doctor_id uuid,name text,cpf text,birth date);
 create table public.inova_medical_reports(id uuid primary key,doctor_id uuid,patient_id uuid,filename text,reviewed_at timestamptz);
 insert into auth.users values('${doctor}'),('${other}'),('${patient}'),('${stranger}');
 insert into inova_profiles values('${doctor}','doctor','Doctor One'),('${other}','doctor','Doctor Two'),('${patient}','patient','Patient'),('${stranger}','patient','Stranger');
 insert into inova_account_details values('${doctor}','doctor'),('${other}','doctor'),('${patient}','patient'),('${stranger}','patient');
 insert into inova_medical_patients values('${chart}','${doctor}','Patient','52998224725','1994-03-14');`);
  for (const filename of [
    "INOVA_CONSULTA_SQL_EDITOR.sql",
    "INOVA_COMPLEMENTOS_SQL_EDITOR.sql",
    "INOVA_PORTAIS_COMPLETOS_SQL_EDITOR.sql",
  ])
    await db.exec(await readFile(new URL("../supabase/" + filename, import.meta.url), "utf8"));
  await db.query("insert into inova_portal_links(patient_id,doctor_id,user_id) values($1,$2,$3)", [
    chart,
    doctor,
    patient,
  ]);
  return db;
}
test("real calendar contract accepts real UUIDs, validates dates and cannot choose an owner", () => {
  const value = {
    patientId: chart,
    requestId: crypto.randomUUID(),
    title: "Consultation",
    kind: "Consulta",
    date: "2026-10-20",
    time: "09:30",
    status: "Proposto",
    notes: "",
  };
  assert.ok(realAgendaInput.safeParse(value).success);
  for (const extra of [
    { doctorId: other },
    { authorId: stranger },
    { date: "2026-02-30" },
    { status: "Previsto" },
    { patientId: "mariana-oliveira" },
  ])
    assert.equal(realAgendaInput.safeParse({ ...value, ...extra }).success, false);
  assert.ok(
    realAgendaInput.safeParse({ ...value, kind: "Previsão de resultado", status: "Previsto" })
      .success,
  );
  assert.equal(
    preferenceInput.safeParse({
      kind: "patient",
      userId: stranger,
      value: { phone: "", email: "p@example.test", favorites: [] },
    }).success,
    false,
  );
});
test("shared real agenda enforces ownership, proposals, idempotency, confirmation and cancellation notices", async () => {
  const db = await fixture();
  try {
    const request = crypto.randomUUID(),
      data = {
        title: "Test consultation",
        kind: "Consulta",
        date: "2026-10-20",
        time: "09:30",
        status: "Proposto",
        notes: "Guide pending",
      };
    const create = async (actor, owner = doctor, raw = data, req = request) =>
      (
        await db.query("select inova_create_real_agenda($1,$2,$3,$4,$5) as value", [
          owner,
          chart,
          actor,
          req,
          raw,
        ])
      ).rows[0].value;
    await assert.rejects(create(stranger), /Unauthorized/);
    await assert.rejects(create(other, other), /Patient unavailable/);
    await assert.rejects(
      create(patient, doctor, { ...data, status: "Confirmado" }),
      /Patient must propose/,
    );
    const event = await create(patient);
    assert.equal((await create(patient)).id, event.id);
    assert.equal((await db.query("select count(*)::int n from inova_real_agenda")).rows[0].n, 1);
    assert.equal(
      (await db.query("select user_id from inova_notifications")).rows[0].user_id,
      doctor,
    );
    const transition = (actor, status, reason = "") =>
      db.query("select inova_transition_real_agenda($1,$2,$3,$4,$5,$6)", [
        event.id,
        chart,
        doctor,
        actor,
        status,
        reason,
      ]);
    await assert.rejects(transition(patient, "Confirmado"), /Invalid confirmation/);
    await transition(doctor, "Confirmado");
    await assert.rejects(transition(patient, "Cancelado", ""), /Invalid cancellation/);
    await transition(patient, "Cancelado", "Insurance guide pending");
    const saved = (await db.query("select * from inova_real_agenda")).rows[0];
    assert.equal(saved.status, "Cancelado");
    assert.equal(saved.reason, "Insurance guide pending");
    assert.equal((await db.query("select count(*)::int n from inova_notifications")).rows[0].n, 3);
    await assert.rejects(
      create(patient, doctor, { ...data, orderId: crypto.randomUUID() }, crypto.randomUUID()),
      /Order unavailable/,
    );
  } finally {
    await db.close();
  }
});
test("real preferences stay scoped; published returns and released PDFs notify and retain the chart", async () => {
  const db = await fixture();
  try {
    await db.query("select inova_save_workspace_preferences($1,$2,$3)", [
      patient,
      "patient",
      { email: "patient@example.test", phone: "", favorites: [] },
    ]);
    await assert.rejects(
      db.query("select inova_save_workspace_preferences($1,$2,$3)", [patient, "settings", {}]),
      /Unauthorized/,
    );
    assert.equal(
      (await db.query("select user_id from inova_workspace_preferences")).rows[0].user_id,
      patient,
    );
    const entry = crypto.randomUUID();
    await db.query(
      `insert into inova_consultation_entries(id,patient_id,doctor_id,author_id,request_id,kind,status,payload) values($1,$2,$3,$3,$4,'return','draft',$5)`,
      [
        entry,
        chart,
        doctor,
        crypto.randomUUID(),
        { title: "Follow-up appointment", text: "Bring results", date: "2026-10-20" },
      ],
    );
    assert.equal((await db.query("select count(*)::int n from inova_real_agenda")).rows[0].n, 0);
    await db.query("select inova_consultation_transition($1,$2,'published')", [entry, doctor]);
    assert.equal(
      (await db.query("select status from inova_real_agenda")).rows[0].status,
      "Proposto",
    );
    await db.query("select inova_consultation_transition($1,$2,'cancelled')", [entry, doctor]);
    assert.equal(
      (await db.query("select status from inova_real_agenda")).rows[0].status,
      "Cancelado",
    );
    await db.query("insert into inova_medical_reports values($1,$2,$3,'Test PDF',null)", [
      crypto.randomUUID(),
      doctor,
      chart,
    ]);
    await db.query("update inova_medical_reports set reviewed_at=now()");
    const notices = await db.query("select * from inova_notifications where event like 'report:%'");
    assert.equal(notices.rows.length, 1);
    assert.equal(notices.rows[0].user_id, patient);
    // Reapplying the migration preserves records and does not seed demos.
    await db.exec(
      await readFile(
        new URL("../supabase/INOVA_PORTAIS_COMPLETOS_SQL_EDITOR.sql", import.meta.url),
        "utf8",
      ),
    );
    assert.equal(
      (await db.query("select count(*)::int n from inova_medical_patients")).rows[0].n,
      1,
    );
  } finally {
    await db.close();
  }
});

test("overview and briefing fetch only the owner's metadata, without PDF or audio contents", async () => {
  const rows = await readDoctorConsultationMetadata(
    { url: "https://example.test", key: "test-key" },
    doctor,
    async (url) => {
      const request = new URL(url);
      assert.equal(request.searchParams.get("doctor_id"), "eq." + doctor);
      const select = request.searchParams.get("select");
      assert.ok(select.includes("document0:payload->documents->0->>name"));
      assert.ok(!select.split(",").includes("payload"));
      assert.ok(!select.includes("->>data"));
      return new Response(
        JSON.stringify([
          {
            id: chart,
            patient_id: chart,
            kind: "preparation",
            status: "published",
            title: "Preparation",
            symptoms: "Patient message",
            legacyDocument: null,
            document0: "Test PDF",
            audio0: "audio/webm",
          },
        ]),
        { status: 200 },
      );
    },
  );
  assert.equal(rows[0].audioCount, 1);
  assert.deepEqual(rows[0].documentNames, ["Test PDF"]);
  assert.deepEqual(rows[0].payload.documents, []);
  assert.equal(rows[0].payload.symptoms, "Patient message");
});

test("new clinical preparation fields keep legacy payloads compatible and reject invalid source dates", () => {
  const legacy = {
    title: "Test entry",
    text: "",
    date: "",
    symptoms: "",
    medicines: "",
    questions: "",
    exams: [],
    audio: null,
    document: null,
  };
  const parsed = consultationPayload.parse(legacy);
  assert.equal(parsed.orderId, null);
  assert.equal(parsed.category, "Próximos passos");
  assert.equal(consultationPayload.safeParse({ ...legacy, date: "2026-02-30" }).success, false);
  assert.equal(
    consultationPayload.safeParse({ ...legacy, sourceDate: "2099-01-01" }).success,
    false,
  );
  assert.equal(
    consultationPayload.safeParse({ ...legacy, sourceDate: "2026-02-30" }).success,
    false,
  );
});

test("browser database roles cannot read agenda/preferences or call service-only mutation RPCs", async () => {
  const db = await fixture();
  try {
    for (const role of ["anon", "authenticated"]) {
      await db.exec("set role " + role);
      await assert.rejects(db.query("select * from inova_real_agenda"), /permission denied/);
      await assert.rejects(
        db.query("select * from inova_workspace_preferences"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select inova_save_workspace_preferences($1,'patient',$2)", [patient, {}]),
        /permission denied/,
      );
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
