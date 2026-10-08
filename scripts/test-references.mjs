import test from "node:test";
import assert from "node:assert/strict";
import { patientAgeOnDate } from "../src/lib/patient-age.ts";
import { markerReference } from "../src/lib/marker-reference.ts";
test("Age comes from birth and collection date and changes on the birthday", () => {
  assert.equal(patientAgeOnDate("14/03/1994", "18/09/2026"), 32);
  assert.equal(patientAgeOnDate("1994-03-14", "2026-03-13"), 31);
  assert.equal(patientAgeOnDate("1994-03-14", "2026-03-14"), 32);
  assert.equal(patientAgeOnDate("14/03/2004", "18/09/2026"), 22);
});
test("Invalid, missing and future birthdays cannot select a reference", () => {
  for (const birth of [undefined, "", "31/02/1994", "2026-02-29", "31/13/1994", "14/03/2030"])
    assert.equal(patientAgeOnDate(birth, "18/09/2026"), null);
  assert.equal(patientAgeOnDate("14/03/1994", "32/09/2026"), null);
  assert.equal(patientAgeOnDate("29/02/2000", "18/09/2026"), 26);
  assert.equal(
    markerReference("hemoglobina", null, "Feminino").value,
    "Referência não selecionada",
  );
});
test("Hemoglobin adult reference requires a known reference sex; adult values do not leak into pediatric patients", () => {
  assert.equal(markerReference("hemoglobina", 32, "Feminino").value, "11,6 a 15,0 g/dL");
  assert.equal(markerReference("hemoglobina", 45, "Masculino").value, "13,2 a 16,6 g/dL");
  assert.equal(markerReference("hemoglobina", 32).value, "Consultar intervalo no laudo");
  assert.equal(
    markerReference("hemoglobina", 17, "Feminino").value,
    "Consultar referência pediátrica do laudo",
  );
  assert.equal(markerReference("hemoglobina", 18, "Feminino").value, "11,6 a 15,0 g/dL");
});
test("Vitamin D changes age stratum without assuming absent pregnancy or comorbidities", () => {
  assert.equal(markerReference("vitaminaD", 32).value, "20 a 60 ng/mL · população geral");
  assert.equal(markerReference("vitaminaD", 65).value, "20 a 60 ng/mL · população geral");
  assert.equal(markerReference("vitaminaD", 66).value, "Acima de 30 ng/mL · parâmetro para idosos");
  assert.match(markerReference("vitaminaD", 32).note, /contexto ainda não está informado/);
});
test("Glucose retains fasting prerequisite; LDL never invents an age-only treatment goal", () => {
  assert.match(markerReference("glicemia", 32).note, /jejum não está informado/);
  assert.equal(markerReference("ldl", 32).value, "Meta individual definida pelo médico");
  assert.equal(markerReference("ldl", 80).value, "Meta individual definida pelo médico");
});
