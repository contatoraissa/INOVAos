import { readFileSync } from "node:fs";
import { analyzeWithGemini } from "../src/lib/gemini-core.server.ts";
const modelResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
  headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
  signal: AbortSignal.timeout(15000),
});
if (!modelResponse.ok) {
  const payload = await modelResponse.json().catch(() => ({}));
  const text = String(payload.error?.message ?? "");
  console.log(
    JSON.stringify({
      modelListStatus: modelResponse.status,
      invalidKey: /api.?key.*(invalid|not valid)/i.test(text),
    }),
  );
  process.exit(1);
}
const modelList = await modelResponse.json();
const models = (modelList.models ?? []).map((item) => item.name?.replace("models/", ""));
console.log(
  JSON.stringify({
    configuredModelAvailable: models.includes(process.env.GEMINI_MODEL),
    flash25Available: models.includes("gemini-2.5-flash"),
  }),
);
const safeFetch = async (url, options) => {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    console.log(JSON.stringify({ networkError: error.name, code: error.cause?.code ?? null }));
    throw error;
  }
  if (!response.ok) {
    const data = await response
      .clone()
      .json()
      .catch(() => ({}));
    const reasons = (data.error?.details ?? [])
      .map((item) => item.reason)
      .filter((value) => typeof value === "string" && /^[A-Z_]+$/.test(value));
    const message = String(data.error?.message ?? "");
    const category = /api.?key.*(invalid|not valid)|API_KEY_INVALID/i.test(message)
      ? "INVALID_API_KEY"
      : /responseFormat|response_format/i.test(message)
        ? "UNSUPPORTED_RESPONSE_FORMAT"
        : /not found|not supported/i.test(message)
          ? "MODEL_OR_REQUEST_UNSUPPORTED"
          : /billing|quota/i.test(message)
            ? "BILLING_OR_QUOTA"
            : "OTHER_PROVIDER_ERROR";
    console.log(JSON.stringify({ providerStatus: response.status, reasons, category }));
  }
  return response;
};
const result = await analyzeWithGemini(
  {
    kind: "Laboratorial",
    pdf: readFileSync("public/examples/laudo-laboratorial-ficticio.pdf").toString("base64"),
  },
  {
    key: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
    fetcher: safeFetch,
  },
);
if (!result.ok) {
  console.log(result.error);
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({
      ok: true,
      model: result.model,
      pages: result.summary.pages,
      findings: result.summary.findings.length,
      observations: result.summary.observations.length,
    }),
  );
}
