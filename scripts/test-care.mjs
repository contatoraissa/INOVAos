import test from "node:test";
import assert from "node:assert/strict";
import { createCareStore } from "../src/lib/care-store.server.ts";
import { createOrderStore } from "../src/lib/exam-order-store.server.ts";
import { createPreparationStore } from "../src/lib/preparation-store.server.ts";
const patientId = "mariana-oliveira";
const now = () => Date.parse("2026-10-07T15:00:00Z");
const guidance = {
  requestId: "guidance-request-12345",
  patientId,
  title: "Orientação fictícia",
  text: "Texto demonstrativo revisado.",
  category: "Resultados",
  sourceName: "",
  sourceUrl: "",
  sourceDate: "",
  orderId: null,
};
const favorite = {
  patientId,
  name: "Laboratório fictício",
  address: "Bairro de exemplo",
  cep: "01310100",
  website: "https://example.com/",
};
test("Guidance drafts stay private; publication requires an explicit action and withdrawal removes access", () => {
  const store = createCareStore(now);
  const item = store.draft(guidance);
  assert.equal(store.draft(guidance).id, item.id);
  assert.equal(store.guidance(patientId, "patient").length, 0);
  assert.equal(store.events(patientId).length, 0);
  store.publish(item.id);
  store.publish(item.id);
  assert.equal(store.guidance(patientId, "patient").length, 1);
  assert.equal(store.events(patientId).length, 1);
  assert.equal(store.getGuidance(item.id).reviewed, true);
  assert.equal(store.guidance("another-patient", "patient").length, 0);
  store.withdraw(item.id);
  store.withdraw(item.id);
  assert.equal(store.guidance(patientId, "patient").length, 0);
  assert.equal(store.events(patientId).length, 2);
  assert.throws(() => store.publish(item.id));
});
test("Preparation instructions require an order, source, HTTPS link and valid nonfuture source date", () => {
  const store = createCareStore(now);
  assert.throws(() => store.draft({ ...guidance, category: "Preparo dos exames" }));
  assert.throws(() => store.draft({ ...guidance, sourceDate: "2026-02-30" }));
  assert.throws(() => store.draft({ ...guidance, sourceDate: "2026-10-08" }));
  assert.throws(() => store.draft({ ...guidance, sourceUrl: "javascript:alert(1)" }));
  assert.doesNotThrow(() =>
    store.draft({
      ...guidance,
      category: "Preparo dos exames",
      orderId: "b17b866e-439b-4c26-af26-8e6c4925945a",
      sourceName: "Unidade fictícia",
      sourceUrl: "https://example.com/",
      sourceDate: "2026-10-06",
    }),
  );
});
test("Read state is patient scoped and survives subsequent reads", () => {
  const store = createCareStore(now);
  store.event({
    id: "own",
    patientId,
    at: new Date(now()).toISOString(),
    title: "Aviso",
    detail: "Recebido",
    destination: "orders",
  });
  store.event({
    id: "other",
    patientId: "another-patient",
    at: new Date(now()).toISOString(),
    title: "Aviso",
    detail: "Recebido",
    destination: "orders",
  });
  store.read(patientId, ["own", "other"]);
  assert.equal(store.events(patientId)[0].read, true);
  assert.equal(store.events("another-patient")[0].read, false);
});
test("Favorite preference and performed dates remain self reported; removing a favorite clears its association", () => {
  const store = createCareStore(now);
  const lab = store.favorite(favorite);
  const orderId = "b17b866e-439b-4c26-af26-8e6c4925945a";
  assert.throws(() => store.updateProgress("another-patient", orderId, lab.id, null));
  assert.throws(() => store.updateProgress(patientId, orderId, lab.id, "2026-10-08"));
  assert.throws(() => store.updateProgress(patientId, orderId, lab.id, "2026-02-30"));
  store.updateProgress(patientId, orderId, lab.id, "2026-10-06");
  store.updateProgress(patientId, orderId, lab.id, "2026-10-06");
  assert.equal(store.events(patientId).length, 1);
  assert.match(store.events(patientId)[0].detail, /Sem confirmação/);
  assert.throws(() => store.removeFavorite(lab.id, "another-patient"));
  store.removeFavorite(lab.id, patientId);
  assert.equal(store.progress(patientId)[0].preferredLabId, null);
  store.updateProgress(patientId, orderId, null, null);
  assert.equal(store.events(patientId).length, 2);
});
test("Only released orders emit patient notifications; retries do not repeat release or cancellation", () => {
  const care = createCareStore(now);
  const orders = createOrderStore(now, care.event);
  const item = orders.create({
    requestId: "test-orders-notification",
    patientId,
    exams: ["hemograma"],
    notes: "",
  });
  assert.equal(care.events(patientId).length, 0);
  orders.release(item.id);
  orders.release(item.id);
  assert.equal(care.events(patientId).length, 1);
  orders.cancel(item.id);
  orders.cancel(item.id);
  assert.equal(care.events(patientId).length, 2);
  const draft = orders.create({
    requestId: "second-order-notification",
    patientId,
    exams: ["hemograma"],
    notes: "",
  });
  orders.cancel(draft.id);
  assert.equal(care.events(patientId).length, 2);
});
test("Actual received submissions and review generate notifications and preserve optional order association", () => {
  const care = createCareStore(now);
  const store = createPreparationStore(now, care.event);
  const receipt = store.submit({
    requestId: "test-care-submission-123",
    patientId,
    orderId: "b17b866e-439b-4c26-af26-8e6c4925945a",
    confirmed: true,
    notes: { symptoms: "Exemplo fictício", medicines: "", questions: "" },
    audios: [],
    documents: [],
  });
  assert.equal(receipt.orderId, "b17b866e-439b-4c26-af26-8e6c4925945a");
  assert.equal(care.events(patientId).length, 1);
  store.review(receipt.id);
  store.review(receipt.id);
  assert.equal(care.events(patientId).length, 2);
  assert.equal(store.list(patientId)[0].reviewed, true);
});
test("All new demo data expires after 24 hours", () => {
  let timestamp = now();
  const store = createCareStore(() => timestamp);
  const item = store.draft(guidance);
  store.publish(item.id);
  store.favorite(favorite);
  store.updateProgress(patientId, "order", null, "2026-10-06");
  timestamp += 24 * 60 * 60 * 1000;
  assert.deepEqual(store.events(patientId), []);
  assert.deepEqual(store.favorites(patientId), []);
  assert.deepEqual(store.guidance(patientId, "doctor"), []);
  assert.deepEqual(store.progress(patientId), []);
});
