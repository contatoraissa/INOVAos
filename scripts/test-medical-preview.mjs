import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessMedicalPreview } from "../src/lib/medical-preview-policy.ts";
test("only the explicitly allowed doctor gets preview access", () => {
  const allowed = "alison.bianchin1@gmail.com";
  assert.equal(canAccessMedicalPreview(allowed, "doctor", allowed), true);
  assert.equal(canAccessMedicalPreview(" ALISON.BIANCHIN1@GMAIL.COM ", "doctor", allowed), true);
  assert.equal(canAccessMedicalPreview(allowed, "patient", allowed), false);
  assert.equal(canAccessMedicalPreview("other@example.com", "doctor", allowed), false);
  assert.equal(canAccessMedicalPreview(allowed, "doctor", undefined), false);
});
