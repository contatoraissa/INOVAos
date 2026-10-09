import test from "node:test";
import assert from "node:assert/strict";
import {
  workspaceDefaults,
  workspaceSchema,
  workspaceMetrics,
  usage,
  satisfaction,
  migrateAdmin,
  adminSnapshot,
  activitySeries,
  safeCsvCell,
} from "../src/lib/admin-workspace.ts";
import { adminDefaults, adminReference } from "../src/lib/admin-demo.ts";
import { generateAdminSummary } from "../src/lib/admin-ai.server.ts";
test("Account status, engagement thresholds and satisfaction remain independent", () => {
  const data = workspaceDefaults(),
    user = data.users[0];
  for (const [days, expected] of [
    [7, "Em uso"],
    [8, "Atenção"],
    [30, "Atenção"],
    [31, "Sem uso recente"],
  ])
    assert.equal(
      usage({ ...user, lastAccess: new Date(adminReference - days * 86400000).toISOString() }),
      expected,
    );
  assert.equal(usage({ ...user, status: "Desativado" }), "Desativado");
  const unknown = data.users.find((u) => !data.feedback.some((f) => f.userId === u.id));
  assert.equal(satisfaction(data, unknown.id), "Sem feedback");
  data.feedback.push({
    id: "test-positive",
    userId: unknown.id,
    rating: 5,
    category: "Agenda",
    comment: "Exemplo",
    at: "2026-10-08T15:00:00Z",
  });
  assert.equal(satisfaction(data, unknown.id), "Positivo");
  data.users.find((u) => u.id === unknown.id).lastAccess = "2026-07-01T12:00:00Z";
  assert.equal(satisfaction(data, unknown.id), "Positivo");
  data.feedback.push({
    id: "test-negative",
    userId: unknown.id,
    rating: 1,
    category: "Agenda",
    comment: "Exemplo",
    at: "2026-10-08T16:00:00Z",
  });
  assert.equal(satisfaction(data, unknown.id), "Negativo");
});
test("Metrics match the data and MRR excludes trials, pending and cancelled subscriptions", () => {
  const data = workspaceDefaults(),
    m = workspaceMetrics(data);
  assert.equal(m.total, 14);
  assert.equal(m.engaged + m.attention + m.inactive + m.disabled, 14);
  assert.equal(m.positive + m.neutral + m.negative + m.unknown, 14);
  assert.equal(m.mrr, 24900);
  data.subscriptions.forEach((s) => (s.status = "Teste"));
  assert.equal(workspaceMetrics(data).mrr, 0);
  const daily = activitySeries(data, 30);
  assert.equal(daily.length, 30);
  assert.equal(daily.at(-1).date, "2026-10-08");
  assert.equal(
    daily.reduce((sum, x) => sum + x.events, 0),
    data.activities.filter(
      (e) => e.at.slice(0, 10) >= "2026-09-09" && e.at.slice(0, 10) <= "2026-10-08",
    ).length,
  );
});
test("Migration preserves legacy status and contacts, validates relations and dates", () => {
  const legacy = structuredClone(adminDefaults);
  legacy.users[0].status = "Desativado";
  legacy.contacts.push({
    id: "legacy",
    userId: legacy.users[0].id,
    kind: "Feedback recebido",
    note: "Resposta antiga sem nota",
    at: "2026-10-08T12:00:00Z",
  });
  const data = migrateAdmin(legacy);
  assert.equal(data.users[0].status, "Desativado");
  assert.equal(data.contacts[0].note, "Resposta antiga sem nota");
  const bad = structuredClone(data);
  bad.subscriptions[0].userId = "mariana-oliveira";
  assert.equal(workspaceSchema.safeParse(bad).success, false);
  const invalid = structuredClone(data);
  invalid.tasks[0].due = "2026-02-30";
  assert.equal(workspaceSchema.safeParse(invalid).success, false);
});
test("AI snapshot omits names, contacts, comments and account identifiers; CSV neutralizes formulas", () => {
  const data = workspaceDefaults(),
    text = JSON.stringify(adminSnapshot(data));
  assert.equal(text.includes("Rafael"), false);
  assert.equal(text.includes("example.com"), false);
  assert.equal(text.includes("mariana-oliveira"), false);
  assert.equal(adminSnapshot(data).metrics.mrrMonthlyBRL, 249);
  assert.equal(adminSnapshot(data).metrics.currency, "BRL");
  assert.equal(text.includes("EXEMPLO FICTÍCIO"), false);
  assert.match(safeCsvCell("=SUM(1,1)"), /^"'/);
  assert.equal(safeCsvCell('a"b'), '"a""b"');
});
const output = {
  summary: "Resumo fictício baseado nos indicadores.",
  strengths: ["Participação registrada."],
  concerns: ["Investigar ausência de uso."],
  recommendations: [
    { reference: "U1", reason: "Existe feedback registrado.", action: "Conversar com o usuário." },
  ],
  limitations: ["Dados fictícios; uso não prova satisfação."],
};
const response = (value) =>
  new Response(
    JSON.stringify({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }],
    }),
  );
test("AI validates provider output and blocks unrelated users, quota and incomplete output", async () => {
  let sent;
  const options = {
    key: "synthetic-test",
    model: "test-model",
    fetcher: async (url, request) => {
      sent = JSON.parse(request.body);
      return response(output);
    },
  };
  const result = await generateAdminSummary(workspaceDefaults(), options);
  assert.equal(result.recommendations[0].reference, "U1");
  assert.equal(JSON.stringify(sent).includes("example.com"), false);
  await assert.rejects(() =>
    generateAdminSummary(workspaceDefaults(), {
      ...options,
      fetcher: async () =>
        response({
          ...output,
          recommendations: [{ ...output.recommendations[0], reference: "U999" }],
        }),
    }),
  );
  await assert.rejects(
    () =>
      generateAdminSummary(workspaceDefaults(), {
        ...options,
        fetcher: async () => new Response("private response", { status: 429 }),
      }),
    /Limite/,
  );
  await assert.rejects(() =>
    generateAdminSummary(workspaceDefaults(), {
      ...options,
      fetcher: async () =>
        new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS" }] })),
    }),
  );
});
