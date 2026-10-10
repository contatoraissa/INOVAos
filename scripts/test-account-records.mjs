import test from "node:test";
import assert from "node:assert/strict";
import { reviewedResults, resultSeries } from "../src/lib/account-records.ts";
import { accountLanding } from "../src/lib/account-landing.ts";

test("login and email confirmation open the correct real portal without bypassing medical authorization", () => {
  assert.equal(accountLanding({ role: "patient" }), "/portal-paciente?workspace=account");
  assert.equal(
    accountLanding({ role: "doctor", medicalAccess: true }),
    "/dashboard?workspace=account",
  );
  assert.equal(accountLanding({ role: "doctor", medicalAccess: false }), "/minha-conta");
  assert.equal(accountLanding({ role: "doctor" }), "/minha-conta");
  assert.equal(accountLanding({ role: "unknown", medicalAccess: true }), "/minha-conta");
});

const row = (changes = {}) => ({
  id: 1,
  name: "Glicemia",
  value: "92",
  unit: "mg/dL",
  reference: "Referência no laudo",
  collection_date: "2026-09-18",
  flag: "sem_classificacao",
  source_page: null,
  report_id: "released-report",
  ...changes,
});
test("patient results include only medically released reports", () => {
  const results = [row(), row({ id: 2, report_id: "private-report", value: "999" })];
  assert.deepEqual(reviewedResults(results, ["released-report"]), [results[0]]);
  assert.deepEqual(reviewedResults(results, []), []);
  assert.equal(results.length, 2);
});
test("real marker cards derive latest values from actual collection dates", () => {
  const rows = [
    row({ id: 2, collection_date: "2026-06-18", value: "98" }),
    row(),
    row({ id: 3, name: "Hemoglobina", unit: "g/dL", value: "13,8" }),
  ];
  const series = resultSeries(rows);
  assert.equal(series.length, 2);
  assert.equal(series[0].latest.value, "92");
  assert.deepEqual(
    series[0].points.map((point) => point.value),
    [98, 92],
  );
  assert.equal(series[1].points[0].value, 13.8);
  assert.equal(rows[0].value, "98");
});
test("graphs never merge different units or turn qualitative values into numbers", () => {
  const series = resultSeries([
    row(),
    row({ id: 2, unit: "mmol/L", value: "5.1" }),
    row({ id: 3, name: "Teste qualitativo", unit: "", value: "Não detectado" }),
  ]);
  assert.equal(series.length, 3);
  assert.equal(series[2].latest.value, "Não detectado");
  assert.deepEqual(series[2].points, []);
});
