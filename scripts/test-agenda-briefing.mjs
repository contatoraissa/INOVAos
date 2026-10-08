import test from "node:test";
import assert from "node:assert/strict";
import { generateAgendaBriefing, briefingPeriod } from "../src/lib/agenda-briefing.server.ts";
const context = {
  date: "2026-10-20",
  patients: [
    {
      reference: "P1",
      patientId: "mariana-oliveira",
      appointments: [
        { title: "Consulta fictícia", time: "10:00", status: "Confirmado", notes: "" },
      ],
      submissions: [
        {
          at: "2026-10-08",
          reviewed: false,
          notes: { symptoms: "Relato fictício", medicines: "", questions: "" },
          pdfs: 1,
          audios: 0,
        },
      ],
      guidance: [],
    },
  ],
};
const output = {
  patients: [
    {
      reference: "P1",
      summary: "Relato fictício recebido; um PDF disponível, não analisado.",
      recordedSuspicions: [],
      reviewPoints: ["Conferir o PDF original."],
      missingInformation: ["Medicamentos não informados."],
    },
  ],
};
const response = (text) =>
  new Response(
    JSON.stringify({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(text) }] } }],
    }),
    { status: 200 },
  );
test("Briefing sends references, preserves patient separation and does not send attachment contents", async () => {
  let payload;
  const result = await generateAgendaBriefing(context, {
    key: "synthetic-test",
    model: "test-model",
    fetcher: async (_url, options) => {
      payload = JSON.parse(options.body);
      return response(output);
    },
  });
  const text = payload.contents[0].parts[0].text;
  assert.equal(text.includes("mariana-oliveira"), false);
  assert.equal(text.includes("inlineData"), false);
  assert.match(text, /Relato fictício/);
  assert.deepEqual(result.patients[0].recordedSuspicions, []);
});
test("Unknown or missing patients and incomplete responses are rejected", async () => {
  for (const patients of [
    [],
    [{ ...output.patients[0], reference: "P2" }],
    [output.patients[0], output.patients[0]],
  ])
    await assert.rejects(() =>
      generateAgendaBriefing(context, {
        key: "test",
        model: "test-model",
        fetcher: async () => response({ patients }),
      }),
    );
  await assert.rejects(() =>
    generateAgendaBriefing(context, {
      key: "test",
      model: "test-model",
      fetcher: async () =>
        new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS" }] })),
    }),
  );
});
test("Provider errors expose no secrets or upstream response", async () => {
  await assert.rejects(
    () =>
      generateAgendaBriefing(context, {
        key: "secret-test",
        model: "test-model",
        fetcher: async () => new Response("sensitive-provider-body", { status: 429 }),
      }),
    (e) =>
      e.message.includes("Limite de uso") &&
      !e.message.includes("secret-test") &&
      !e.message.includes("sensitive-provider-body"),
  );
  await assert.rejects(
    () =>
      generateAgendaBriefing({ ...context, patients: [] }, { key: "test", model: "test-model" }),
    /Nenhum compromisso/,
  );
});

test("Future briefing starts today in Sao Paulo and covers 30 days across months", () => {
  assert.deepEqual(briefingPeriod("2025-01-01", "upcoming", new Date("2026-10-09T01:00:00Z")), {
    date: "2026-10-08",
    endDate: "2026-11-06",
  });
  assert.equal(briefingPeriod("2026-10-20", "day").date, "2026-10-20");
});
