import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { patientRegistration } from "../src/lib/medical-patient-contract.ts";

const doctor = "10000000-0000-4000-8000-000000000001";
const doctor2 = "10000000-0000-4000-8000-000000000002";
const patient = "20000000-0000-4000-8000-000000000001";
const patient2 = "20000000-0000-4000-8000-000000000002";
async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create table public.inova_profiles(id uuid primary key,role text,display_name text);
    create table public.inova_account_details(user_id uuid primary key,account_type text,cpf text,birth_date date);
    insert into inova_profiles values('${doctor}','doctor','Doctor One'),('${doctor2}','doctor','Doctor Two');
  `);
  for (const name of [
    "202610070003_medical_workspace.sql",
    "202610070006_consultation.sql",
    "202610100001_patient_identity.sql",
  ])
    await db.exec(
      await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"),
    );
  await db.exec(
    `create table inova_identity_test_results(patient_id uuid references inova_medical_patients(id),value integer);`,
  );
  return db;
}
async function account(
  db,
  {
    id = patient,
    email = "patient@example.test",
    cpf = "52998224725",
    birth = "1994-03-14",
    confirmed = true,
    role = "patient",
  } = {},
) {
  await db.query("insert into auth.users values($1,$2,$3)", [
    id,
    email,
    confirmed ? "2026-10-10T10:00:00Z" : null,
  ]);
  await db.query("insert into inova_profiles values($1,$2,'Patient Account')", [id, role]);
  await db.query("insert into inova_account_details values($1,$2,$3,$4)", [id, role, cpf, birth]);
}
async function register(
  db,
  {
    owner = doctor,
    email = "patient@example.test",
    cpf = "52998224725",
    birth = "1994-03-14",
    name = "Original Patient",
    notes = "Private physician note",
    authorized = true,
  } = {},
) {
  const result = await db.query(
    "select inova_register_patient_identity($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as value",
    [
      owner,
      name,
      cpf,
      birth,
      notes,
      email,
      "15900000000",
      "RG-123",
      "f",
      "Original address",
      authorized,
    ],
  );
  return result.rows[0].value;
}
async function sync(db, id = patient) {
  return (await db.query("select inova_sync_patient_identity($1) as value", [id])).rows[0].value;
}
async function links(db) {
  return (await db.query("select * from inova_portal_links order by patient_id")).rows;
}

test("medical contact schema normalizes email and rejects forged linkage controls", () => {
  const valid = {
    name: "Test Patient",
    cpf: "529.982.247-25",
    birth: "1994-03-14",
    notes: "",
    email: " PATIENT@EXAMPLE.TEST ",
    identityConfirmed: true,
  };
  assert.equal(patientRegistration.parse(valid).email, "patient@example.test");
  assert.equal(patientRegistration.safeParse({ ...valid, email: "invalid" }).success, false);
  for (const property of ["user_id", "doctor_id", "patient_id", "identity_confirmed_at", "linked"])
    assert.equal(patientRegistration.safeParse({ ...valid, [property]: "forged" }).success, false);
  assert.equal(
    patientRegistration.parse({ ...valid, email: "", identityConfirmed: false }).email,
    "",
  );
});

test("doctor-first enrollment preserves chart identity, results, notes and published guidance", async () => {
  const db = await fixture();
  try {
    const chart = await register(db);
    assert.equal(chart.linked, false);
    await db.query("insert into inova_identity_test_results values($1,108)", [chart.id]);
    await db.query(
      `insert into inova_consultation_entries(patient_id,doctor_id,author_id,request_id,kind,status,payload)
      values($1,$2,$2,'30000000-0000-4000-8000-000000000001','guidance','published','{"text":"Existing guidance","documents":[{"name":"prior.pdf"}]}')`,
      [chart.id, doctor],
    );
    await account(db, { confirmed: false });
    await assert.rejects(sync(db), /Confirmed patient/);
    assert.equal((await links(db)).length, 0);
    await db.query("update auth.users set email_confirmed_at=now() where id=$1", [patient]);
    assert.equal((await sync(db)).linked, 1);
    assert.equal((await links(db))[0].patient_id, chart.id);
    const again = await register(db, { name: "Do not overwrite", notes: "Do not replace" });
    assert.equal(again.id, chart.id);
    assert.equal(again.reused, true);
    assert.equal(again.linked, true);
    assert.equal(
      (await db.query("select count(*)::int as n from inova_medical_patients")).rows[0].n,
      1,
    );
    const saved = (await db.query("select * from inova_medical_patients")).rows[0];
    assert.equal(saved.name, "Original Patient");
    assert.equal(saved.notes, "Private physician note");
    assert.equal(
      (
        await db.query("select value from inova_identity_test_results where patient_id=$1", [
          chart.id,
        ])
      ).rows[0].value,
      108,
    );
    assert.equal(
      (
        await db.query("select payload from inova_consultation_entries where patient_id=$1", [
          chart.id,
        ])
      ).rows[0].payload.documents[0].name,
      "prior.pdf",
    );
    assert.equal((await sync(db)).linked, 1);
    assert.equal((await links(db)).length, 1);
  } finally {
    await db.close();
  }
});

test("patient-first enrollment links immediately and physicians keep separate charts", async () => {
  const db = await fixture();
  try {
    await account(db, { email: "PATIENT@example.test" });
    const first = await register(db, { email: " patient@EXAMPLE.test " });
    const second = await register(db, { owner: doctor2 });
    assert.equal(first.linked, true);
    assert.equal(second.linked, true);
    assert.notEqual(first.id, second.id);
    assert.equal((await sync(db)).linked, 2);
    assert.equal(
      (await links(db)).every((link) => link.user_id === patient),
      true,
    );
  } finally {
    await db.close();
  }
});

test("CPF alone, mismatched email or birth, missing approval and physician accounts never claim charts", async () => {
  const db = await fixture();
  try {
    await account(db);
    await register(db, { email: "other@example.test" });
    await register(db, { owner: doctor2, birth: "1994-03-15" });
    assert.equal((await sync(db)).linked, 0);
    await assert.rejects(register(db, { birth: "1994-03-15" }), /birth mismatch/);
    await assert.rejects(register(db, { email: "patient@example.test" }), /email mismatch/);
    await account(db, {
      id: patient2,
      email: "physician@example.test",
      cpf: "11144477735",
      role: "doctor",
    });
    await assert.rejects(sync(db, patient2), /Confirmed patient/);
  } finally {
    await db.close();
  }
  const pending = await fixture();
  try {
    await account(pending);
    await register(pending, { authorized: false });
    assert.equal((await sync(pending)).linked, 0);
    await register(pending, { authorized: true });
    assert.equal((await sync(pending)).linked, 1);
  } finally {
    await pending.close();
  }
});

test("legacy enrollment is reused and no existing link is reassigned", async () => {
  const db = await fixture();
  try {
    await account(db);
    await account(db, { id: patient2, email: "second@example.test", cpf: "11144477735" });
    const legacy = (
      await db.query(
        "select inova_create_medical_patient($1,'Legacy Patient','52998224725','1994-03-14','Keep these notes') as value",
        [doctor],
      )
    ).rows[0].value;
    const reused = await register(db);
    assert.equal(reused.id, legacy.id);
    assert.equal(reused.reused, true);
    // Emulate a pre-existing manually linked chart; automatic linking must not transfer ownership.
    await db.query("update inova_portal_links set user_id=$1 where patient_id=$2", [
      patient2,
      legacy.id,
    ]);
    assert.equal((await sync(db)).linked, 0);
    await assert.rejects(register(db), /already linked/);
    assert.equal((await links(db))[0].user_id, patient2);
  } finally {
    await db.close();
  }
});

test("migration can be reapplied; browser roles cannot read charts or execute identity RPCs", async () => {
  const db = await fixture();
  try {
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/202610100001_patient_identity.sql", import.meta.url),
        "utf8",
      ),
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select * from inova_medical_patients"), /permission denied/);
      await assert.rejects(sync(db), /permission denied/);
      await assert.rejects(register(db), /permission denied/);
      await db.exec("reset role");
    }
    await account(db);
    await db.exec("set role service_role");
    assert.equal((await register(db)).linked, true);
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
