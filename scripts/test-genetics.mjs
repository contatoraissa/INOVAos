import test from "node:test";
import assert from "node:assert/strict";
import { join, resolve, sep } from "node:path";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { parseRawGenetics } from "../src/lib/genetic-raw-parser.ts";
import { createRawGeneticStore } from "../src/lib/genetic-raw-store.server.ts";
import {
  rawImportInput,
  geneticDomains,
  MAX_GENETIC_BYTES,
} from "../src/lib/genetic-raw-contract.ts";
const fixture = readFileSync("public/examples/23andme-exemplo-ficticio.txt", "utf8");
const input = {
  patientId: "mariana-oliveira",
  name: "exemplo.txt",
  text: fixture,
  audience: "patient",
  fictionalConfirmed: true,
  associationConfirmed: true,
};
function storeFor(t) {
  const root = resolve("artifacts");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, "raw-genetics-test-"));
  t.after(() => {
    const target = resolve(directory);
    if (
      !target.startsWith(root + sep) ||
      !target.slice(root.length + 1).startsWith("raw-genetics-test-")
    )
      throw new Error("Unexpected test directory");
    rmSync(target, { recursive: true, force: true });
  });
  return { directory, store: createRawGeneticStore(directory) };
}
test("Parses 23andMe columns, haploid alleles, indels and missing calls without health scores", () => {
  const stats = parseRawGenetics(fixture);
  assert.equal(stats.markers, 12);
  assert.equal(stats.called, 10);
  assert.equal(stats.uncalled, 2);
  assert.equal(stats.build, "GRCh37");
  assert.equal(stats.strand, "+");
  assert.ok(stats.preview.some((item) => item.genotype === "A"));
  assert.ok(stats.preview.some((item) => item.genotype === "II"));
  assert.equal(geneticDomains.length, 4);
  assert.equal("predisposition" in stats, false);
});
test("Handles BOM, CRLF, plain headers, numeric sex chromosomes and an unidentified build", () => {
  const stats = parseRawGenetics(
    "\uFEFFrsid\tchromosome\tposition\tgenotype\r\ni123\t23\t12345\tA\r\nrs123\t26\t12346\tG\r\n",
  );
  assert.equal(stats.build, "Não identificado");
  assert.deepEqual(stats.chromosomes, ["X", "MT"]);
  assert.match(stats.warnings.join(" "), /não identificada/);
});
test("Identical duplicates are counted once; conflicting identifiers reject the entire file", () => {
  assert.equal(parseRawGenetics(fixture + "rs9000000001\t1\t100001\tAA\n").duplicates, 1);
  assert.throws(() => parseRawGenetics(fixture + "rs9000000001\t1\t100001\tTT\n"), /conflitantes/);
  assert.throws(() => parseRawGenetics(fixture + "rs9000000001\t2\t100001\tAA\n"), /conflitantes/);
});
test("Rejects invalid structure, unsupported calls, binary, oversized input and conflicting genome builds", () => {
  for (const text of [
    "hello",
    "rsid chromosome position genotype",
    "rsid chromosome position genotype\nrs1 1 0 AA",
    "rsid chromosome position genotype\nrs1 25 1 AA",
    "rsid chromosome position genotype\nrs1 1 1 ZZ",
    "rsid chromosome position genotype\nrs1 1 1 AA extra",
    fixture + "\0",
    fixture + "\uFFFD",
    "# GRCh38\n" + fixture,
  ])
    assert.throws(() => parseRawGenetics(text));
  assert.throws(() => parseRawGenetics("a".repeat(MAX_GENETIC_BYTES + 1)), /25 MB/);
});
test("Requires explicit fictitious data and patient association confirmations", () => {
  assert.throws(() => rawImportInput.parse({ ...input, fictionalConfirmed: false }));
  assert.throws(() => rawImportInput.parse({ ...input, associationConfirmed: false }));
  assert.throws(() => rawImportInput.parse({ ...input, name: "file.zip" }));
  assert.throws(() => rawImportInput.parse({ ...input, patientId: "../escape" }));
});
test("Persists raw UTF-8, metadata and review across newly created store instances", (t) => {
  const { directory, store } = storeFor(t);
  const { record } = store.import(input);
  assert.equal(record.scoring, "not_configured");
  assert.equal(record.reviewedAt, null);
  assert.equal(store.original(record.id, input.patientId).text, fixture);
  const restarted = createRawGeneticStore(directory);
  assert.equal(restarted.list(input.patientId)[0].id, record.id);
  const first = restarted.review(record.id, input.patientId);
  assert.equal(first.first, true);
  assert.equal(createRawGeneticStore(directory).review(record.id, input.patientId).first, false);
  assert.equal(
    createRawGeneticStore(directory).list(input.patientId)[0].reviewedAt,
    first.record.reviewedAt,
  );
});
test("Repeated raw files are deduplicated per patient and other patients cannot read or delete them", (t) => {
  const { store } = storeFor(t);
  const { record } = store.import(input);
  assert.equal(store.import(input).duplicate, true);
  assert.equal(store.list(input.patientId).length, 1);
  assert.deepEqual(store.list("carlos-henrique"), []);
  assert.throws(() => store.original(record.id, "carlos-henrique"));
  assert.throws(() => store.remove(record.id, "carlos-henrique"));
  assert.throws(() => store.import({ ...input, patientId: "carlos-henrique" }));
  const other = store.import({ ...input, audience: "doctor", patientId: "carlos-henrique" });
  assert.notEqual(other.record.id, record.id);
});
test("Invalid imports are atomic; version limit retains existing originals", (t) => {
  const { directory, store } = storeFor(t);
  assert.throws(() => store.import({ ...input, text: fixture + "broken" }));
  assert.deepEqual(readdirSync(directory), []);
  for (let index = 0; index < 3; index++)
    store.import({ ...input, text: fixture + `# version ${index}\n` });
  assert.throws(() => store.import({ ...input, text: fixture + "# fourth\n" }), /três versões/);
  assert.equal(store.list(input.patientId).length, 3);
});
test("Tampered raw files fail integrity checks before download or review", (t) => {
  const { directory, store } = storeFor(t);
  const { record } = store.import(input);
  writeFileSync(join(directory, `${record.id}.txt`), fixture + "# altered\n");
  assert.throws(() => store.original(record.id, input.patientId), /Integridade/);
  assert.throws(() => store.review(record.id, input.patientId), /Integridade/);
  assert.equal(store.list(input.patientId)[0].reviewedAt, null);
});
test("Explicit deletion removes both original and metadata and persists after restart", (t) => {
  const { directory, store } = storeFor(t);
  const { record } = store.import(input);
  store.remove(record.id, input.patientId);
  assert.deepEqual(readdirSync(directory), []);
  assert.deepEqual(createRawGeneticStore(directory).list(input.patientId), []);
});
