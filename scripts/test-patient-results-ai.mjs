import test from "node:test";
import assert from "node:assert/strict";
import { resultsContext, explainPatientResults } from "../src/lib/patient-results-ai.server.ts";
const input = { mode: "results", periods: ["Set/26"], markers: ["glicemia"], confirmed: true };
test("Patient context uses server data, chosen periods and no identifying data", () => {
  const context = resultsContext(input);
  assert.equal(context.markers[0].values[0].value, 92);
  assert.equal(context.ageAtLatestCollection, 32);
  assert.match(context.markers[0].consultationReference.note, /jejum/);
  assert.doesNotMatch(JSON.stringify(context), /Mariana|14\/03\/1994|123\.456/);
  assert.throws(() => resultsContext({ ...input, confirmed: false }));
  assert.throws(() => resultsContext({ ...input, periods: ["Unknown"] }));
  assert.throws(() => resultsContext({ ...input, periods: ["Set/26", "Set/26"] }));
});
test("Gemini receives selected data and validated explanations; failures do not expose credentials", async () => {
  const explanation = {
    summary: "Exemplo fictício",
    markers: [{ name: "Glicemia", explanation: "Jejum não informado." }],
    limitations: ["Intervalo do laboratório ausente."],
    questions: ["Houve jejum?"],
  };
  let body;
  const options = {
    key: "test-secret",
    model: "gemini-2.5-flash",
    fetcher: async (_url, request) => {
      body = JSON.parse(request.body);
      return Response.json({
        candidates: [
          { finishReason: "STOP", content: { parts: [{ text: JSON.stringify(explanation) }] } },
        ],
      });
    },
  };
  const result = await explainPatientResults(input, options);
  assert.equal(result.ok, true);
  assert.equal(JSON.parse(body.contents[0].parts[0].text).markers[0].values[0].value, 92);
  const invalid = await explainPatientResults(input, {
    ...options,
    fetcher: async () =>
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    ...explanation,
                    markers: [{ name: "Outro exame", explanation: "Inválido" }],
                  }),
                },
              ],
            },
          },
        ],
      }),
  });
  assert.equal(invalid.ok, false);
  const failed = await explainPatientResults(input, {
    ...options,
    fetcher: async () => {
      throw new Error("test-secret");
    },
  });
  assert.equal(failed.ok, false);
  assert.doesNotMatch(JSON.stringify(failed), /test-secret/);
});
