import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAgendaStore } from "../src/lib/agenda-store.server.ts";
const input = {
  patientId: "mariana-oliveira",
  audience: "patient",
  title: "Consulta fictícia",
  kind: "Consulta",
  date: "2026-10-20",
  time: "10:00",
  status: "Proposto",
  notes: "",
};
test("Proposals persist, physician confirms, cancellation preserves reason and notices", () => {
  const path = mkdtempSync(join(tmpdir(), "inova-agenda-"));
  try {
    const store = createAgendaStore(path);
    const event = store.create(input);
    assert.equal(createAgendaStore(path).list(["mariana-oliveira"])[0].status, "Proposto");
    assert.equal(store.list(["outro-paciente"]).length, 0);
    store.confirm(event.id, event.patientId);
    assert.equal(store.list([event.patientId])[0].status, "Confirmado");
    store.cancel(event.id, event.patientId, "patient", "Guia do convênio ainda não emitida");
    const cancelled = store.list([event.patientId])[0];
    assert.equal(cancelled.status, "Cancelado");
    assert.match(cancelled.reason, /Guia/);
    assert.throws(() => store.confirm(event.id, event.patientId));
    assert.equal(store.notices([event.patientId]).length, 3);
    store.cancel(event.id, event.patientId, "patient", "Novo motivo");
    assert.equal(store.notices([event.patientId]).length, 3);
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});
test("Patient cannot confirm, use another identity or turn an estimate into a confirmed result", () => {
  const path = mkdtempSync(join(tmpdir(), "inova-agenda-"));
  try {
    const store = createAgendaStore(path);
    assert.throws(() => store.create({ ...input, status: "Confirmado" }));
    assert.throws(() => store.create({ ...input, patientId: "outro-paciente" }));
    assert.throws(() => store.create({ ...input, date: "2026-02-30" }));
    assert.throws(() =>
      store.create({
        ...input,
        kind: "Previsão de resultado",
        status: "Confirmado",
        audience: "doctor",
      }),
    );
    const forecast = store.create({
      ...input,
      kind: "Previsão de resultado",
      status: "Previsto",
      audience: "doctor",
    });
    assert.throws(() => store.confirm(forecast.id, forecast.patientId));
    assert.throws(() => store.cancel(forecast.id, forecast.patientId, "patient", ""));
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});
