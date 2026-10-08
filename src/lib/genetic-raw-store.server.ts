import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { rawImportInput, type RawGeneticRecord } from "./genetic-raw-contract.ts";
import { parseRawGenetics } from "./genetic-raw-parser.ts";
export function createRawGeneticStore(directory: string, now = () => Date.now()) {
  const root = resolve(directory);
  function files(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Identificador de arquivo inválido.");
    return { meta: join(root, `${id}.json`), raw: join(root, `${id}.txt`) };
  }
  function all(): RawGeneticRecord[] {
    if (!existsSync(root)) return [];
    return readdirSync(root)
      .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name))
      .map((name) => JSON.parse(readFileSync(join(root, name), "utf8")) as RawGeneticRecord);
  }
  function get(id: string, patientId: string) {
    const item = all().find((record) => record.id === id && record.patientId === patientId);
    if (!item) throw new Error("Arquivo não encontrado para este paciente.");
    return item;
  }
  function save(item: RawGeneticRecord) {
    const path = files(item.id).meta;
    const temp = `${path}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temp, JSON.stringify(item), { encoding: "utf8", mode: 0o600 });
      renameSync(temp, path);
    } finally {
      if (existsSync(temp)) unlinkSync(temp);
    }
  }
  return {
    list(patientId: string) {
      return all()
        .filter((item) => item.patientId === patientId)
        .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    },
    import(raw: unknown) {
      const input = rawImportInput.parse(raw);
      if (input.audience === "patient" && input.patientId !== "mariana-oliveira")
        throw new Error("Perfil do paciente indisponível nesta demonstração.");
      const stats = parseRawGenetics(input.text);
      const bytes = Buffer.byteLength(input.text, "utf8");
      const sha256 = createHash("sha256").update(input.text).digest("hex");
      const records = all();
      const previous = records.find(
        (item) => item.patientId === input.patientId && item.sha256 === sha256,
      );
      if (previous) return { record: previous, duplicate: true };
      if (records.filter((item) => item.patientId === input.patientId).length >= 3)
        throw new Error(
          "Limite de três versões por paciente. Exclua uma versão antes de importar outra.",
        );
      if (
        records.length >= 20 ||
        records.reduce((total, item) => total + item.bytes, 0) + bytes > 100 * 1024 * 1024
      )
        throw new Error("Limite de armazenamento da demonstração atingido.");
      mkdirSync(root, { recursive: true });
      const record: RawGeneticRecord = {
        id: randomUUID(),
        patientId: input.patientId,
        name: input.name,
        importedAt: new Date(now()).toISOString(),
        importedBy: input.audience,
        bytes,
        sha256,
        stats,
        reviewedAt: null,
        reviewer: null,
        scoring: "not_configured",
      };
      const path = files(record.id).raw;
      try {
        writeFileSync(path, input.text, { encoding: "utf8", flag: "wx", mode: 0o600 });
        save(record);
      } catch (error) {
        if (existsSync(path)) unlinkSync(path);
        throw error;
      }
      return { record, duplicate: false };
    },
    original(id: string, patientId: string) {
      const record = get(id, patientId);
      const text = readFileSync(files(id).raw, "utf8");
      if (createHash("sha256").update(text).digest("hex") !== record.sha256)
        throw new Error("Integridade do arquivo alterada; confira a cópia original.");
      return { name: record.name, text };
    },
    review(id: string, patientId: string) {
      const record = get(id, patientId);
      this.original(id, patientId);
      const first = record.reviewedAt === null;
      if (first) {
        record.reviewedAt = new Date(now()).toISOString();
        record.reviewer = "Dr. Rafael Mendes";
        save(record);
      }
      return { record, first };
    },
    remove(id: string, patientId: string) {
      get(id, patientId);
      const paths = files(id);
      unlinkSync(paths.meta);
      if (existsSync(paths.raw)) unlinkSync(paths.raw);
    },
  };
}
export const rawGeneticStore = createRawGeneticStore(
  resolve(process.cwd(), ".inova-demo/genetics"),
);
