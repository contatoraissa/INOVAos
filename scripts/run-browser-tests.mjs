import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { resolve, join, relative, sep } from "node:path";

// Sequential: all smoke tests share one Chrome CDP target and one local demo server.
const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
const host = new URL(base).hostname;
if (
  !/^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
    host,
  )
)
  throw new Error("Browser tests require a local demonstration server.");
await fetch(base, { signal: AbortSignal.timeout(10000) });
await fetch("http://127.0.0.1:9222/json/version", { signal: AbortSignal.timeout(5000) });
const output = resolve("artifacts/regression");
mkdirSync(output, { recursive: true });
const store = resolve(".inova-demo");
function files(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Symlink in demo test storage.");
    return entry.isDirectory() ? files(path) : [path];
  });
}
const before = new Map(files(store).map((path) => [path, readFileSync(path)]));
const cases = [
  ["smoke-access"],
  ["smoke-workspace"],
  ["smoke-patient", "--audio"],
  ["smoke-orders"],
  ["smoke-care"],
  ["smoke-usability"],
  ["smoke-genetics"],
  ["smoke-agenda"],
  ["smoke-calendar-design"],
  ["smoke-exam-calendar"],
  ["smoke-agenda-upcoming"],
  ["smoke-profile-settings"],
  ["smoke-reports-admin"],
  ["simulate-s2-order"],
  ["simulate-preparation-delivery"],
  ["smoke-doctor-notifications"],
  ["smoke-demo-network"],
  ["smoke-navigation"],
  ["smoke-recovery"],
];
const results = [];
try {
  for (const [name, ...args] of cases) {
    const start = Date.now();
    console.log("RUN: " + name);
    const result = spawnSync(process.execPath, ["scripts/" + name + ".mjs", ...args], {
      env: { ...process.env, INOVA_TEST_URL: base },
      encoding: "utf8",
      timeout: 150000,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
    const log = (result.stdout ?? "") + (result.stderr ?? "") + (result.error?.message ?? "");
    writeFileSync(join(output, name + ".log"), log);
    const passed = result.status === 0;
    results.push({
      name,
      passed,
      durationMs: Date.now() - start,
      log: "artifacts/regression/" + name + ".log",
    });
    console.log((passed ? "PASS: " : "FAIL: ") + name);
    if (!passed) console.log(log.slice(-1800));
  }
} finally {
  // Restore persistent demo files; delete only new files beneath the verified store root.
  for (const path of files(store)) {
    const local = relative(store, path);
    if (local.startsWith(".." + sep) || local === ".." || resolve(store, local) !== path)
      throw new Error("Unexpected path in demo test storage.");
    if (!before.has(path)) unlinkSync(path);
  }
  for (const [path, content] of before) {
    mkdirSync(resolve(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
  writeFileSync(
    join(output, "results.json"),
    JSON.stringify({ at: new Date().toISOString(), base, results }, null, 2),
  );
}
console.log(`${results.filter((r) => r.passed).length}/${results.length} browser flows passed.`);
if (results.some((r) => !r.passed)) process.exitCode = 1;
