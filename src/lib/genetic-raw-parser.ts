import { MAX_GENETIC_BYTES, type RawStats, type RawVariant } from "./genetic-raw-contract.ts";
const MAX_MARKERS = 1_200_000;
export function parseRawGenetics(text: string): RawStats {
  if (new TextEncoder().encode(text).byteLength > MAX_GENETIC_BYTES)
    throw new Error("Escolha um TXT de até 25 MB.");
  if (text.includes(String.fromCharCode(0)) || text.includes("\uFFFD"))
    throw new Error("Use um arquivo de texto UTF-8 válido, extraído do ZIP.");
  const variants = new Map<string, RawVariant>();
  const chromosomes = new Set<string>();
  let header = false;
  let duplicates = 0;
  let called = 0;
  let uncalled = 0;
  let comments = "";
  let lineNumber = 0;
  for (const original of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    lineNumber++;
    const line = original.trim();
    if (!line) continue;
    const columns = line.replace(/^#\s*/, "").split(/\s+/);
    if (
      columns.map((item) => item.toLowerCase()).join(" ") === "rsid chromosome position genotype"
    ) {
      header = true;
      continue;
    }
    if (line.startsWith("#")) {
      if (comments.length < 100_000) comments += line + "\n";
      continue;
    }
    if (!header) throw new Error("Cabeçalho ausente: rsid, chromosome, position e genotype.");
    if (columns.length !== 4)
      throw new Error(`Linha ${lineNumber}: esperado formato de quatro colunas.`);
    const [marker = "", chromosomeRaw = "", positionRaw = "", genotypeRaw = ""] = columns;
    const chromosome =
      ({ "23": "X", "24": "Y", "26": "MT", M: "MT" } as Record<string, string>)[
        chromosomeRaw.toUpperCase()
      ] ?? chromosomeRaw.toUpperCase();
    const genotype = genotypeRaw.toUpperCase();
    const position = Number(positionRaw);
    if (
      !/^(rs\d+|i\d+)$/.test(marker) ||
      !/^(?:[1-9]|1\d|2[0-2]|X|Y|MT)$/.test(chromosome) ||
      !/^\d+$/.test(positionRaw) ||
      !Number.isSafeInteger(position) ||
      position < 1 ||
      position > 500_000_000 ||
      !/^(?:[ACGTID]{1,2}|--)$/.test(genotype)
    )
      throw new Error(`Linha ${lineNumber}: marcador, cromossomo, posição ou genótipo inválido.`);
    const variant = { marker, chromosome, position, genotype };
    const previous = variants.get(marker);
    if (previous) {
      if (
        previous.chromosome !== chromosome ||
        previous.position !== position ||
        previous.genotype !== genotype
      )
        throw new Error(`Linha ${lineNumber}: marcador duplicado com dados conflitantes.`);
      duplicates++;
      continue;
    }
    if (variants.size >= MAX_MARKERS)
      throw new Error("O limite é de 1,2 milhão de marcadores por arquivo.");
    variants.set(marker, variant);
    chromosomes.add(chromosome);
    if (genotype === "--") uncalled++;
    else called++;
  }
  if (!header || !variants.size)
    throw new Error("O arquivo não contém registros no formato bruto 23andMe.");
  const build37 = /(?:build\s*37|GRCh37)/i.test(comments);
  const build38 = /(?:build\s*38|GRCh38)/i.test(comments);
  if (build37 && build38) throw new Error("O cabeçalho informa versões de genoma conflitantes.");
  const build = build37 ? "GRCh37" : build38 ? "GRCh38" : "Não identificado";
  const strand = /(?:plus\s*\(\+\)\s*strand|plus strand|strand\s*[:=]\s*\+)/i.test(comments)
    ? "+"
    : "Não identificada";
  const warnings: string[] = [];
  if (build === "Não identificado")
    warnings.push("Versão do genoma não identificada no cabeçalho.");
  if (strand === "Não identificada")
    warnings.push("Orientação dos alelos não identificada no cabeçalho.");
  if (uncalled)
    warnings.push(`${uncalled} marcador(es) sem chamada (--); não representa resultado negativo.`);
  if (duplicates)
    warnings.push(`${duplicates} linha(s) idêntica(s) repetida(s); contadas uma vez no resumo.`);
  warnings.push(
    "O formato não comprova a origem, identidade do titular ou validade clínica dos genótipos.",
  );
  return {
    markers: variants.size,
    called,
    uncalled,
    duplicates,
    callRate: (called / variants.size) * 100,
    build,
    strand,
    chromosomes: [...chromosomes],
    preview: [...variants.values()].slice(0, 25),
    warnings,
  };
}
