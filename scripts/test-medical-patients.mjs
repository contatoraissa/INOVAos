import { test } from "node:test";
import assert from "node:assert/strict";
import { patientRegistration } from "../src/lib/medical-patient-contract.ts";
const valid = { name: "Paciente de Teste", cpf: "529.982.247-25", birth: "1994-03-14", notes: "" };
test("patient registration normalizes CPF and rejects invalid identity data", () => {
  assert.equal(patientRegistration.parse(valid).cpf, "52998224725");
  for (const changes of [
    { cpf: "11111111111" },
    { birth: "2025-02-30" },
    { birth: "2999-01-01" },
    { notes: "x".repeat(2001) },
  ])
    assert.equal(patientRegistration.safeParse({ ...valid, ...changes }).success, false);
});
test("request cannot choose another doctor or patient identifier", () => {
  assert.equal(
    patientRegistration.safeParse({ ...valid, doctor_id: "other-doctor" }).success,
    false,
  );
  assert.equal(patientRegistration.safeParse({ ...valid, id: "another-patient" }).success, false);
});
