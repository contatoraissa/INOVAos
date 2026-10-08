import test from "node:test";
import assert from "node:assert/strict";
import { createReturnStore } from "../src/lib/return-store.server.ts";
import { databaseConfig } from "../src/lib/supabase.server.ts";
import { createDatabaseReturnRepository } from "../src/lib/return-repository.server.ts";

const input = {
  requestId: "test-return-request-001",
  patientId: "mariana-oliveira",
  title: "Revisar exames fictícios",
  notes: "Combinar atendimento com o consultório.",
  date: null,
  days: 14,
};
test("Return draft stays private; publication, cancellation and request retries are idempotent", () => {
  const events = [];
  const store = createReturnStore(
    () => Date.parse("2026-10-08T02:00:00Z"),
    (event) => events.push(event),
  );
  const item = store.create(input);
  assert.equal(item.targetDate, "2026-10-21");
  assert.equal(store.create(input).id, item.id);
  assert.deepEqual(store.list(input.patientId, "patient"), []);
  assert.throws(() => store.publish(item.id, false));
  store.publish(item.id, true);
  store.publish(item.id, true);
  assert.equal(events.length, 1);
  assert.equal(store.list(input.patientId, "patient").length, 1);
  assert.deepEqual(store.list("outro-paciente", "patient"), []);
  const second = store.create({ ...input, requestId: "test-return-request-002" });
  assert.throws(() => store.publish(second.id, true), /Já existe/);
  store.cancel(item.id);
  store.cancel(item.id);
  assert.equal(events.length, 2);
  assert.throws(() => store.publish(item.id, true), /cancelado/);
  store.publish(second.id, true);
});
test("Invalid dates, dual/absent periods and delayed past-date publication are rejected", () => {
  let now = Date.parse("2026-10-07T12:00:00Z");
  const store = createReturnStore(() => now);
  for (const fields of [
    { date: "2026-02-30", days: null },
    { date: "2026-10-06", days: null },
    { date: "2026-10-08", days: 1 },
    { date: null, days: null },
    { date: null, days: 0 },
  ])
    assert.throws(() => store.create({ ...input, ...fields }));
  const item = store.create({ ...input, date: "2026-10-07", days: null });
  now += 86400000;
  assert.throws(() => store.publish(item.id, true));
});
test("Supabase is explicit and configuration fails closed when enabled but incomplete", () => {
  assert.equal(databaseConfig({}), null);
  assert.throws(() => databaseConfig({ INOVA_DATABASE_ENABLED: "true" }));
  assert.throws(() =>
    databaseConfig({
      INOVA_DATABASE_ENABLED: "true",
      SUPABASE_URL: "http://example.com",
      SUPABASE_SECRET_KEY: "secret",
    }),
  );
  assert.deepEqual(
    databaseConfig({
      INOVA_DATABASE_ENABLED: "true",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_test",
    }),
    { url: "https://example.supabase.co", key: "sb_secret_test" },
  );
});
test("Database repository uses server headers, hides drafts from patient, and never falls back on provider errors", async () => {
  const row = {
    id: "a69e9a0a-1ad1-4de5-b78a-b7b3ed0a373d",
    patient_id: input.patientId,
    title: input.title,
    notes: input.notes,
    date_requested: "2099-01-01",
    days: null,
    target_date: "2099-01-01",
    created_at: "2026-10-07T12:00:00Z",
    published_at: null,
    cancelled_at: null,
    doctor_name: "Dr. Rafael Mendes",
  };
  const config = { url: "https://example.supabase.co", key: "sb_secret_test" };
  const calls = [];
  const repository = createDatabaseReturnRepository(config, async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.apikey, config.key);
    assert.equal(String(url).includes(config.key), false);
    return Response.json(options.method === "GET" ? [] : row);
  });
  assert.equal(
    (await repository.create({ ...input, date: row.target_date, days: null })).targetDate,
    row.target_date,
  );
  await repository.list(input.patientId, "patient");
  assert.match(calls[1].url, /published_at=not.is.null/);
  await assert.rejects(repository.publish(row.id, false));
  const failed = createDatabaseReturnRepository(
    config,
    async () => new Response("sb_secret_test sensitive details", { status: 503 }),
  );
  await assert.rejects(
    failed.list(input.patientId, "doctor"),
    (error) => !error.message.includes(config.key) && error.message.includes("Nenhum dado"),
  );
});
