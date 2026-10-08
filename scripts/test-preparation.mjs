import test from "node:test";
import assert from "node:assert/strict";
import { createPreparationStore } from "../src/lib/preparation-store.server.ts";
const pdf = Buffer.from("%PDF-1.4\nfixture").toString("base64");
const audio = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1]).toString("base64");
const input = {
  requestId: "example-request-123456",
  patientId: "mariana-oliveira",
  confirmed: true,
  notes: { symptoms: "Relato fictício", medicines: "", questions: "" },
  audios: [{ field: "symptoms", mime: "audio/webm", duration: 2, data: audio }],
  documents: [{ name: "exemplo.pdf", kind: "Genômica", data: pdf }],
};
test("Receives notes, audio and PDFs atomically and keeps list metadata free of file content", () => {
  const store = createPreparationStore();
  const receipt = store.submit(input);
  assert.equal(receipt.audios.length, 1);
  assert.equal(receipt.documents.length, 1);
  assert.equal(store.list("mariana-oliveira").length, 1);
  assert.deepEqual(store.list("another-patient"), []);
  assert.equal(JSON.stringify(receipt).includes(pdf), false);
  assert.equal(store.attachment(receipt.id, "audio", 0).data, audio);
  assert.equal(store.attachment(receipt.id, "document", 0).data, pdf);
});
test("Retries with the same request id do not duplicate a submission", () => {
  const store = createPreparationStore();
  const first = store.submit(input);
  assert.equal(store.submit(input).id, first.id);
  assert.equal(store.list("mariana-oliveira").length, 1);
});
test("Rejects missing consent, other patient identities, empty payloads and duplicate audio fields", () => {
  const store = createPreparationStore();
  assert.throws(() => store.submit({ ...input, confirmed: false }));
  assert.throws(() => store.submit({ ...input, patientId: "another-patient" }));
  assert.throws(() =>
    store.submit({
      ...input,
      notes: { symptoms: "", medicines: "", questions: "" },
      audios: [],
      documents: [],
    }),
  );
  assert.throws(() => store.submit({ ...input, audios: [input.audios[0], input.audios[0]] }));
});
test("Invalid PDF/audio signatures or malformed base64 cannot partially enter the inbox", () => {
  const store = createPreparationStore();
  assert.throws(() =>
    store.submit({ ...input, documents: [{ ...input.documents[0], data: audio }] }),
  );
  assert.throws(() => store.submit({ ...input, audios: [{ ...input.audios[0], data: pdf }] }));
  assert.throws(() =>
    store.submit({ ...input, audios: [{ ...input.audios[0], data: "!invalid" }] }),
  );
  assert.equal(store.list("mariana-oliveira").length, 0);
});
test("Review and removal work without changing notes or other patients", () => {
  let now = Date.now();
  const store = createPreparationStore(() => now);
  const receipt = store.submit(input);
  assert.equal(receipt.reviewedAt, null);
  now += 1000;
  store.review(receipt.id);
  assert.equal(receipt.reviewedAt, new Date(now).toISOString());
  const reviewedAt = receipt.reviewedAt;
  now += 1000;
  store.review(receipt.id);
  assert.equal(receipt.reviewedAt, reviewedAt);
  assert.equal(store.list("mariana-oliveira")[0].reviewed, true);
  store.remove(receipt.id);
  assert.equal(store.list("mariana-oliveira").length, 0);
  assert.throws(() => store.attachment(receipt.id, "audio", 0));
});
test("Expired files are unavailable after the 24-hour lifetime", () => {
  let now = Date.now();
  const store = createPreparationStore(() => now);
  const receipt = store.submit(input);
  now += 24 * 60 * 60 * 1000;
  assert.equal(store.list("mariana-oliveira").length, 0);
  assert.throws(() => store.attachment(receipt.id, "document", 0));
});
