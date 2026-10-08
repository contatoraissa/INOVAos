import { test } from "node:test";
import assert from "node:assert/strict";
import { accountInput, validDocument } from "../src/lib/account-contract.ts";
const base = {
  fullName: "Pessoa de Teste",
  email: "test@example.com",
  password: "a-long-password-123",
  consent: true,
};
test("CPF and CNPJ reject repeated numbers and incorrect checksums", () => {
  assert.equal(validDocument("529.982.247-25", "cpf"), true);
  assert.equal(validDocument("529.982.247-24", "cpf"), false);
  assert.equal(validDocument("11111111111", "cpf"), false);
  assert.equal(validDocument("04.252.011/0001-10", "cnpj"), true);
  assert.equal(validDocument("04.252.011/0001-11", "cnpj"), false);
});
test("doctor requires CRM and UF, optional CNPJ, cannot grant a subscription", () => {
  const input = { ...base, role: "doctor", crm: "123456", crmState: "SP", cnpj: "" };
  assert.equal(accountInput.safeParse(input).success, true);
  assert.equal(accountInput.safeParse({ ...input, crm: "" }).success, false);
  assert.equal(accountInput.safeParse({ ...input, crmState: "XX" }).success, false);
  assert.equal(accountInput.safeParse({ ...input, status: "active" }).success, false);
});
test("patient requires full name, valid CPF and real nonfuture birth date", () => {
  const input = { ...base, role: "patient", cpf: "52998224725", birthDate: "1994-03-14" };
  assert.equal(accountInput.safeParse(input).success, true);
  for (const change of [
    { fullName: "Pessoa" },
    { birthDate: "2025-02-30" },
    { birthDate: "2999-01-01" },
    { cpf: "" },
    { consent: false },
    { password: "short" },
  ])
    assert.equal(accountInput.safeParse({ ...input, ...change }).success, false);
});
