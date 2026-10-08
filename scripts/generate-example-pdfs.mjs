import { mkdirSync, writeFileSync } from "node:fs";
export function makePdf(pages) {
  const objects = [
    null,
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const ids = [];
  for (const lines of pages) {
    const pageId = objects.length;
    const streamId = pageId + 1;
    ids.push(pageId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`,
    );
    const escaped = (text) =>
      text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const stream =
      "BT /F1 12 Tf 50 785 Td 20 TL " +
      lines.map((line, index) => (index ? "T* " : "") + `(${escaped(line)}) Tj`).join("\n") +
      " ET";
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${ids.map((id) => `${id} 0 R`).join(" ")}] >>`;
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index++) {
    offsets.push(Buffer.byteLength(output));
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const offset = Buffer.byteLength(output);
  output +=
    `xref\n0 ${objects.length}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((value) => `${String(value).padStart(10, "0")} 00000 n \n`)
      .join("");
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  return Buffer.from(output);
}
if (process.argv[1]?.endsWith("generate-example-pdfs.mjs")) {
  mkdirSync("public/examples", { recursive: true });
  writeFileSync(
    "public/examples/laudo-laboratorial-ficticio.pdf",
    makePdf([
      [
        "INOVA - LAUDO FICTICIO PARA TESTE DE SOFTWARE",
        "Nao usar para atendimento ou decisao clinica.",
        "Paciente ficticio: Mariana Oliveira",
        "Coleta ficticia: 18/09/2026",
        "Pagina 1 de 2",
        "Glicemia: 92 mg/dL",
        "Hemoglobina: 13,8 g/dL",
        "LDL: 108 mg/dL",
        "Vitamina D: 34,6 ng/mL",
      ],
      [
        "INOVA - LIMITACOES DO EXEMPLO",
        "Pagina 2 de 2",
        "Nao ha faixas de referencia clinicamente validadas neste exemplo.",
        "Nao ha classificacao de valor critico neste documento.",
        "Metodo analitico e laboratorio executor: nao informados.",
        "Nenhum diagnostico ou conduta terapeutica e estabelecido.",
        "Os dados sao inteiramente ficticios.",
      ],
    ]),
  );
  writeFileSync(
    "public/examples/laudo-genomico-ficticio.pdf",
    makePdf([
      [
        "INOVA - EXEMPLO FICTICIO DE DOCUMENTO GENOMICO",
        "Nao usar para atendimento.",
        "Paciente ficticio: Mariana Oliveira",
        "Pagina 1 de 3",
        "Escopo: demonstrar a organizacao de um laudo extenso.",
        "Este documento nao representa um teste genomico real.",
      ],
      [
        "Pagina 2 de 3 - Achados do exemplo",
        "Nao ha genes ou variantes moleculares reais neste documento.",
        "Classificacao de variantes: nao disponivel.",
        "Nao inferir predisposicoes, diagnostico ou risco.",
      ],
      [
        "Pagina 3 de 3 - Limitacoes",
        "Cobertura tecnica: nao informada.",
        "Qualidade do sequenciamento: nao informada.",
        "Referencias e validacao laboratorial: nao disponiveis.",
        "Conclusao: documento de teste de software, sem validade clinica.",
      ],
    ]),
  );
  console.log("Created two fictional PDF examples.");
}
