import test from "node:test";
import assert from "node:assert/strict";
import { createOrderStore } from "../src/lib/exam-order-store.server.ts";
const input = {
  requestId: "test-order-request-123",
  patientId: "mariana-oliveira",
  exams: ["hemograma", "glicemia-jejum"],
  notes: "Observação fictícia",
};
test("Drafts stay private until release and remain isolated by patient", () => {
  const store = createOrderStore();
  const order = store.create(input);
  assert.equal(store.list(input.patientId, "doctor").length, 1);
  assert.equal(store.list(input.patientId, "patient").length, 0);
  assert.equal(store.list("carlos-henrique", "doctor").length, 0);
  store.release(order.id);
  assert.equal(store.list(input.patientId, "patient")[0].status, "released");
  assert.equal(store.list(input.patientId, "patient")[0].exams[0].name, "Hemograma completo");
});
test("Retries do not duplicate orders and repeated release preserves the release date", () => {
  const store = createOrderStore();
  const order = store.create(input);
  assert.equal(store.create(input).id, order.id);
  assert.equal(store.list(input.patientId, "doctor").length, 1);
  const first = store.release(order.id).releasedAt;
  assert.equal(store.release(order.id).releasedAt, first);
});
test("Cancelled drafts remain private; cancelled released orders remain visible and cannot quote", () => {
  const store = createOrderStore();
  const draft = store.create(input);
  store.cancel(draft.id);
  assert.equal(store.list(input.patientId, "patient").length, 0);
  assert.throws(() => store.release(draft.id));
  const released = store.create({ ...input, requestId: "second-order-request-123" });
  store.release(released.id);
  store.cancel(released.id);
  assert.equal(store.list(input.patientId, "patient")[0].status, "cancelled");
  assert.throws(() => store.quote(released.id));
});
test("Empty, duplicate and unknown exam selections cannot create an order", () => {
  const store = createOrderStore();
  assert.throws(() => store.create({ ...input, exams: [] }));
  assert.throws(() => store.create({ ...input, exams: ["hemograma", "hemograma"] }));
  assert.throws(() => store.create({ ...input, exams: ["not-a-procedure"] }));
  assert.equal(store.list(input.patientId, "doctor").length, 0);
});
test("Disconnected S2 provider never supplies fabricated prices, bookings or procedure identifiers", () => {
  const store = createOrderStore();
  const order = store.create(input);
  assert.throws(() => store.quote(order.id));
  store.release(order.id);
  const result = store.quote(order.id);
  assert.equal(result.connected, false);
  assert.deepEqual(result.prices, []);
  assert.equal(result.externalUrl, "https://www.s2medica.com.br/");
  assert.deepEqual(result.examNames, ["Hemograma completo", "Glicemia em jejum"]);
});
test("Orders expire after 24 hours", () => {
  let now = Date.now();
  const store = createOrderStore(() => now);
  const order = store.create(input);
  store.release(order.id);
  now += 24 * 60 * 60 * 1000;
  assert.equal(store.list(input.patientId, "patient").length, 0);
  assert.throws(() => store.quote(order.id));
});
test("Explicit simulated quote uses requested exams and never claims a real connection", () => {
  const store = createOrderStore();
  const order = store.create(input);
  store.release(order.id);
  const quote = store.quote(order.id, true);
  assert.equal(quote.connected, false);
  assert.equal(quote.simulated, true);
  assert.match(quote.message, /SIMULAÇÃO/);
  assert.equal(quote.prices.length, 3);
  assert.equal(quote.prices[0].totalCents, 4000);
  store.cancel(order.id);
  assert.throws(() => store.quote(order.id, true));
});
