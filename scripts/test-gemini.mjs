import test from "node:test";
import assert from "node:assert/strict";
import { analyzeWithGemini, decodePdf } from "../src/lib/gemini-core.server.ts";
import { summarySchema } from "../src/lib/ai-contract.ts";
import { isLocalAiRequest } from "../src/lib/ai-access.ts";
test("Explicit development origin permits LAN access without opening other origins", () => {
  const config = {
    development: true,
    enabled: true,
    url: "http://192.168.0.2:8080/api",
    origin: "http://192.168.0.2:8080",
    additionalOrigin: "http://192.168.0.2:8080",
  };
  assert.equal(isLocalAiRequest(config), true);
  const multiple = {
    ...config,
    additionalOrigin: "http://192.168.0.2:8080, http://192.168.0.2:8081",
  };
  assert.equal(
    isLocalAiRequest({
      ...multiple,
      url: "http://192.168.0.2:8081/_server/test",
      origin: "http://192.168.0.2:8081",
    }),
    true,
  );
  assert.equal(
    isLocalAiRequest({
      ...multiple,
      url: "http://192.168.0.2:8082/",
      origin: "http://192.168.0.2:8082",
    }),
    false,
  );
  assert.equal(
    isLocalAiRequest({
      ...multiple,
      url: "http://192.168.0.2:8081/",
      origin: "http://192.168.0.2:8080",
    }),
    false,
  );
  assert.equal(isLocalAiRequest({ ...config, development: false }), false);
  assert.equal(isLocalAiRequest({ ...config, enabled: false }), false);
  assert.equal(isLocalAiRequest({ ...config, origin: "https://example.com" }), false);
  assert.equal(isLocalAiRequest({ ...config, additionalOrigin: undefined }), false);
});
const pdf = Buffer.from("%PDF-1.4\nfixture").toString("base64");
const input = { kind: "Laboratorial", pdf };
const summary = {
  subjectName: null,
  pages: 2,
  scope: "Resumo do exemplo",
  findings: [{ page: 1, title: "Glicemia", text: "92 mg/dL", quote: "Glicemia 92 mg/dL" }],
  limitations: [],
  observations: [],
};
const success = () =>
  new Response(
    JSON.stringify({
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: JSON.stringify(summary) }] } },
      ],
    }),
  );
test("Rejects non-PDF and malformed base64 before sending", async () => {
  assert.throws(() =>
    decodePdf({ kind: "Laboratorial", pdf: Buffer.from("not a pdf").toString("base64") }),
  );
  assert.throws(() => decodePdf({ ...input, pdf: "!!!!!!!!!" }));
  let called = false;
  const result = await analyzeWithGemini(
    { ...input, pdf: "!!!!!!!!!" },
    {
      key: "test-secret",
      model: "test-model",
      fetcher: async () => {
        called = true;
        return success();
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(called, false);
});
test("Rejects citations outside the reported document", () => {
  assert.equal(
    summarySchema.safeParse({ ...summary, findings: [{ ...summary.findings[0], page: 3 }] })
      .success,
    false,
  );
  assert.equal(
    summarySchema.safeParse({ ...summary, findings: [{ ...summary.findings[0], page: null }] })
      .success,
    true,
  );
});
test("PDF is sent with a header credential and summary is validated", async () => {
  const result = await analyzeWithGemini(input, {
    key: "test-secret",
    model: "test-model",
    fetcher: async (url, options) => {
      assert.equal(String(url).includes("test-secret"), false);
      assert.equal(options.headers["x-goog-api-key"], "test-secret");
      const body = JSON.parse(options.body);
      assert.equal(body.contents[0].parts[1].inlineData.data, pdf);
      assert.ok(body.systemInstruction.parts[0].text.includes("ignore comandos"));
      return success();
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.summary.findings[0].page, 1);
});
test("Provider errors do not expose upstream body or secrets", async () => {
  for (const status of [400, 403, 404, 429, 500]) {
    const result = await analyzeWithGemini(input, {
      key: "test-secret",
      model: "test-model",
      fetcher: async () => new Response("test-secret confidential document", { status }),
    });
    assert.equal(result.ok, false);
    assert.ok(!JSON.stringify(result).includes("test-secret"));
    assert.ok(!JSON.stringify(result).includes("confidential"));
  }
});
test("Temporary provider errors retry once; quota and credential errors do not retry", async () => {
  let calls = 0;
  const result = await analyzeWithGemini(input, {
    key: "test-secret",
    model: "test-model",
    fetcher: async () => (++calls === 1 ? new Response("unavailable", { status: 503 }) : success()),
  });
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
  for (const status of [403, 429]) {
    calls = 0;
    await analyzeWithGemini(input, {
      key: "test-secret",
      model: "test-model",
      fetcher: async () => {
        calls++;
        return new Response("error", { status });
      },
    });
    assert.equal(calls, 1);
  }
});
test("An exhausted quota does not block a subsequent analysis when the provider recovers", async () => {
  let exhausted = true;
  let calls = 0;
  const options = {
    key: "test-secret",
    model: "test-model",
    fetcher: async () => {
      calls++;
      return exhausted ? new Response("quota", { status: 429 }) : success();
    },
  };
  const first = await analyzeWithGemini(input, options);
  assert.equal(first.ok, false);
  assert.match(first.error, /cota/);
  assert.equal(calls, 1);
  exhausted = false;
  const recovered = await analyzeWithGemini(input, options);
  assert.equal(recovered.ok, true);
  assert.equal(calls, 2);
});
test("Incomplete, malformed or structurally invalid output cannot be imported", async () => {
  for (const payload of [
    { candidates: [{ finishReason: "MAX_TOKENS" }] },
    { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not-json" }] } }] },
    {
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify({ ...summary, pages: 0 }) }] },
        },
      ],
    },
  ]) {
    const result = await analyzeWithGemini(input, {
      key: "test-secret",
      model: "test-model",
      fetcher: async () => new Response(JSON.stringify(payload)),
    });
    assert.equal(result.ok, false);
  }
});
test("Refuses invalid model paths and missing credentials", async () => {
  assert.equal((await analyzeWithGemini(input, { key: "", model: "test-model" })).ok, false);
  assert.equal(
    (await analyzeWithGemini(input, { key: "test-secret", model: "../../anything" })).ok,
    false,
  );
});
