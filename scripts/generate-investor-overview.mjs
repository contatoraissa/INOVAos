import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { presentationBrowser } from "./presentation-browser.mjs";

const basename = "INOVA_visao_completa_e_viabilidade_2026-10-09";
const directory = resolve("docs/entregaveis");
const assets = resolve(directory, "assets/INOVA_visao_completa_2026-10-09");
const assumptions = JSON.parse(
  readFileSync(resolve(directory, basename + "_premissas.json"), "utf8"),
);
const money = (v, digits = 0) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
const number = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const percent = (v) => (100 * v).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
const escape = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const sum = (items) => items.reduce((a, b) => a + b.value, 0);
const ticket = assumptions.pricesBRL.reduce((a, p, i) => a + p * assumptions.mix[i], 0);
const fixed = sum(assumptions.fixedMonthlyCosts);
const rate = assumptions.operatingRevenueDeductionsRate + assumptions.paymentFeesRate;
const variable = assumptions.variableCostPerDoctorBRL;
const contribution = ticket * (1 - rate) - variable;
const setup = sum(assumptions.setupInvestment);
const breakEven = Math.ceil(fixed / contribution);
let cash = -setup;
const ramp = assumptions.monthlyAveragePayingDoctors.map((doctors, i) => {
  const revenue = doctors * ticket,
    ebitda = doctors * contribution - fixed;
  cash += ebitda;
  return {
    month: i + 1,
    doctors,
    revenue,
    ebitda,
    cumulativeBeforeFunding: cash,
    cashAfterFunding: cash + assumptions.illustrativeFundingBRL,
  };
});
const scenarios = assumptions.steadyScenarios.map((s) => {
  const revenue = s.doctors * ticket,
    deductions = revenue * assumptions.operatingRevenueDeductionsRate;
  const payment = revenue * assumptions.paymentFeesRate,
    usage = s.doctors * variable;
  const ebitda = revenue - deductions - payment - usage - s.fixedCosts;
  return {
    ...s,
    revenue,
    deductions,
    payment,
    usage,
    contribution: revenue - deductions - payment - usage,
    ebitda,
    margin: ebitda / revenue,
  };
});
const yearRevenue = ramp.reduce((a, m) => a + m.revenue, 0),
  yearEbitda = ramp.reduce((a, m) => a + m.ebitda, 0);
const peakNeed = -Math.min(-setup, ...ramp.map((m) => m.cumulativeBeforeFunding));
const requiredWithReserve = peakNeed * (1 + assumptions.bufferRate);
assert.equal(sum(assumptions.variableCostBreakdown), variable);
assert.equal(
  assumptions.mix.reduce((a, b) => a + b, 0),
  1,
);
assert.equal(fixed, 25000);
assert.equal(ticket, 199);
assert.equal(breakEven, 167);
assert.ok(assumptions.illustrativeFundingBRL >= requiredWithReserve);
assert.ok(ramp.every((m) => m.cashAfterFunding >= 0));
const financials = {
  ticket,
  fixed,
  variable,
  rate,
  contribution,
  breakEven,
  setup,
  scenarios,
  ramp,
  yearRevenue,
  yearEbitda,
  peakNeed,
  requiredWithReserve,
  illustrativeFunding: assumptions.illustrativeFundingBRL,
};
writeFileSync(resolve(directory, basename + "_calculos.json"), JSON.stringify(financials, null, 2));

const usedImages = new Set();
function image(name, label) {
  const path = resolve(assets, name + ".jpg");
  if (!existsSync(path)) throw new Error("Missing screenshot: " + name);
  usedImages.add(name);
  return `<img src="data:image/jpeg;base64,${readFileSync(path).toString("base64")}" alt="${escape(label)}">`;
}
const logo = '<span class="logo">IN<span>∞</span>VA</span>';
const iconInfinity =
  '<svg viewBox="0 0 180 90" fill="none"><path d="M90 45C67 12 48 5 28 12C-2 23-2 67 28 78C48 85 67 78 90 45C113 12 132 5 152 12C182 23 182 67 152 78C132 85 113 78 90 45Z" stroke="currentColor" stroke-width="8"/></svg>';
const card = (label, value, detail = "", tone = "") =>
  `<div class="metric ${tone}"><span>${label}</span><b>${value}</b><small>${detail}</small></div>`;
const note = (text, tone = "") => `<div class="note ${tone}">${text}</div>`;
const points = (items) =>
  items
    .map(
      ([title, text], i) =>
        `<div class="point"><span class="step">${String(i + 1).padStart(2, "0")}</span><div><h3>${title}</h3><p>${text}</p></div></div>`,
    )
    .join("");
const panel = (title, text) => `<div class="panel"><h3>${title}</h3><p>${text}</p></div>`;
const figure = (name, label) =>
  `<figure><div class="screen">${image(name, label)}</div><figcaption>${label} · captura da demonstração INOVA</figcaption></figure>`;
const slides = [];
function add(chapter, title, subtitle, body, { id, kind = "", status = "DEMONSTRAÇÃO" } = {}) {
  slides.push({
    chapter,
    title,
    subtitle,
    body,
    id: id ?? "slide-" + (slides.length + 1),
    kind,
    status,
  });
}
function tour(
  chapter,
  title,
  subtitle,
  name,
  label,
  items,
  value,
  limit = "Dados e pessoas fictícios. Captura da versão atual do sistema.",
) {
  add(
    chapter,
    title,
    subtitle,
    `<div class="tour">${figure(name, label)}<aside>${points(items)}<div class="value"><span>VALOR PROPOSTO</span><p>${value}</p></div></aside></div>${note(limit)}`,
  );
}
function pair(
  chapter,
  title,
  subtitle,
  a,
  b,
  items,
  limit = "Demonstração com dados fictícios; benefícios ainda precisam ser medidos no piloto.",
) {
  add(
    chapter,
    title,
    subtitle,
    `<div class="gallery">${figure(...a)}${figure(...b)}</div><div class="explain-grid">${items.map(([t, p]) => panel(t, p)).join("")}</div>${note(limit)}`,
    { kind: "pair" },
  );
}
function bars(rows, { moneyLabels = true, height = 300 } = {}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  return `<div class="bars" style="height:${height}px">${rows.map((r) => `<div class="barrow"><span>${r.label}</span><div class="track"><i style="width:${(Math.abs(r.value) / max) * 100}%;background:${r.color ?? "var(--cyan)"}"></i></div><b>${moneyLabels ? money(r.value) : number(r.value)}</b></div>`).join("")}</div>`;
}
function chart(series, { colors = ["#00b8e6", "#8fd9aa"], height = 300, yLabel = "R$ mil" } = {}) {
  const W = 1120,
    H = height,
    left = 72,
    right = 35,
    top = 30,
    bottom = 45;
  const values = series.flatMap((s) => s.values),
    min = Math.min(0, ...values),
    max = Math.max(...values) * 1.13;
  const y = (v) => top + ((max - v) / (max - min || 1)) * (H - top - bottom),
    x = (i) => left + (i * (W - left - right)) / (series[0].values.length - 1);
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(series.map((s) => s.name).join(" e "))}">
    ${ticks.map((v) => `<line x1="${left}" y1="${y(v)}" x2="${W - right}" y2="${y(v)}" stroke="#ffffff22" stroke-dasharray="4 7"/><text x="${left - 12}" y="${y(v) + 5}" text-anchor="end" fill="#aac0d2" font-size="16">${number(v / 1000)}</text>`).join("")}
    <text x="8" y="18" fill="#aac0d2" font-size="14">${yLabel}</text>
    <line x1="${left}" y1="${y(0)}" x2="${W - right}" y2="${y(0)}" stroke="#ffffff77"/>
    ${series.map((s, j) => `<polyline points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" fill="none" stroke="${colors[j]}" stroke-width="4"/>${s.values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${colors[j]}"/>`).join("")}`).join("")}
    ${series[0].values.map((v, i) => `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" fill="#c9d1d9" font-size="15">M${i + 1}</text>`).join("")}
  </svg><div class="legend">${series.map((s, i) => `<span><i style="background:${colors[i]}"></i>${s.name}</span>`).join("")}</div>`;
}

add(
  "INOVA · CUIDADO EM PERSPECTIVA",
  "Uma história de saúde.<br><em>Uma visão mais clara.</em>",
  "Sistema, experiência e viabilidade econômica para investidores.",
  `<div class="cover-logo">${logo}</div><div class="cover-line">MÉDICO <span>↔</span> PACIENTE <span>↔</span> GESTÃO</div><div class="cover-bottom"><p>Apresentação completa com capturas reais da demonstração e um modelo financeiro transparente.</p><span>09 OUTUBRO 2026<br>VERSÃO ${"1e5cbbf".toUpperCase()}</span></div><div class="infinity-art">${iconInfinity}</div>`,
  { id: "inicio", kind: "cover", status: "VISÃO COMPLETA" },
);

add(
  "PAINEL EXECUTIVO",
  "O produto está demonstrado.<br><em>O negócio será validado.</em>",
  "Indicadores técnicos observados e hipóteses econômicas apresentados separadamente.",
  `<div class="metrics four">${card("REGRAS E CONTRATOS", "76", "Testes passaram em 09/10")}${card("FLUXOS DE NAVEGADOR", "19", "Cenários passaram na execução final")}${card("PORTAIS", "3", "Médico, paciente e administração")}${card("IA VERIFICADA", "6 fluxos", "Chamadas reais com dados fictícios")}</div>
  <div class="dashboard-bottom"><div class="panel"><div class="eyebrow">MODELO PROPOSTO · NÃO REALIZADO</div><div class="metrics two">${card("TICKET PONDERADO", money(ticket), "Mix 50/50 de R$ 149 e R$ 249")}${card("EQUILÍBRIO OPERACIONAL", breakEven + " médicos", "Custos fixos de R$ 25 mil/mês")}</div><p>A oportunidade é organizar uma rotina recorrente de consulta e acompanhamento. Demanda, retenção e disposição de pagar ainda precisam de evidências.</p></div><div class="panel"><div class="eyebrow">O QUE NÃO É TRAÇÃO</div><h3>Usuários das telas são fictícios.</h3><p>MRR administrativo, avaliações e atividades mostrados no portal são dados de demonstração. Nenhum deles comprova clientes pagantes ou receita recebida.</p><p>A cotação S2 é simulada. Genética bruta não possui escores de predisposição calculados.</p></div></div>`,
  { id: "executivo", status: "EVIDÊNCIAS + HIPÓTESES" },
);

add(
  "COMO LER ESTA APRESENTAÇÃO",
  "Uma jornada conectada.<br><em>Quatro capítulos para explorar.</em>",
  "Use o roteiro completo como material de consulta; conduza a reunião pela história de Mariana e Rafael.",
  `<div class="chapter-links"><a href="#publico"><b>01</b><h3>Entrada no INOVA</h3><p>Proposta de valor e caminhos de acesso.</p></a><a href="#medico"><b>02</b><h3>Rotina médica</h3><p>Receber, conferir, orientar e acompanhar.</p></a><a href="#paciente"><b>03</b><h3>Participação do paciente</h3><p>Preparação, pedidos, documentos e agenda.</p></a><a href="#gestao"><b>04</b><h3>Gestão e negócio</h3><p>Relacionamento, indicadores e viabilidade.</p></a></div>
  <div class="journey"><div><b>Mariana prepara</b><p>Relato + perguntas + PDF</p></div><span>→</span><div><b>Rafael confere</b><p>Notificação + histórico + revisão</p></div><span>→</span><div><b>O cuidado continua</b><p>Pedido + coleta + orientação + retorno</p></div></div>
  ${note('Roteiro de reunião: entrada → preparação do paciente → recebimento médico → agenda → administração → <a href="#financeiro">painéis financeiros</a>. Os demais slides detalham cada função.')} `,
  { id: "roteiro", status: "MAPA DO SISTEMA" },
);

tour(
  "01 · PÁGINA INICIAL",
  "O primeiro contato vende clareza.",
  "A página pública apresenta o INOVA e encaminha cada pessoa ao seu espaço.",
  "home",
  "Página inicial",
  [
    [
      "Proposta de valor",
      "Conecta resultados, laudos e acompanhamento para chegar à consulta com informações organizadas.",
    ],
    [
      "Acessos principais",
      "Entrar na conta médica e entrar na conta paciente recebem destaque. A demonstração permite conhecer a experiência.",
    ],
    [
      "Acesso institucional",
      "Colaborador INOVA aparece de forma discreta e direciona ao portal administrativo.",
    ],
  ],
  "Apresentar o problema resolvido antes de listar ferramentas.",
  "Página pública atual. Demonstração não equivale a uma conta real autenticada.",
);
slides.at(-1).id = "publico";
pair(
  "01 · ACESSOS",
  "Uma entrada para cada perfil.",
  "O público escolhe seu papel; a demonstração permite explorar sem usar dados reais.",
  ["access-doctor", "Entrada da conta médica"],
  ["access-patient", "Entrada da conta paciente"],
  [
    [
      "Médico",
      "A página oferece acesso à conta e à demonstração de Rafael. Ver demonstração médica abre o ambiente demonstrativo.",
    ],
    [
      "Paciente",
      "Explorar demonstração gratuita abre Mariana. O caminho de conta real permanece distinto e precisa de validação de produção.",
    ],
  ],
  "As capturas representam acessos demonstrativos. Gestão de contas reais e autorização administrativa não são comprovadas por estas telas.",
);

tour(
  "02 · MÉDICO",
  "O que precisa da atenção do Rafael?",
  "A visão geral começa pela fila de trabalho e facilita a entrada no acompanhamento.",
  "doctor-home",
  "Visão geral médica",
  [
    [
      "Fila de pendências",
      "Reúne envios, pedidos e orientações do ambiente demonstrativo. Filtros ajudam a escolher uma categoria.",
    ],
    [
      "Notificações",
      "O sininho mostra preparações recebidas e leva aos envios do paciente. Ler um aviso não significa revisar o conteúdo.",
    ],
    [
      "Atalhos de trabalho",
      "Explorar pacientes e cadastrar um novo paciente iniciam a organização da carteira.",
    ],
  ],
  "Reduzir a busca por informações antes de começar uma consulta.",
  "Fila e notificações demonstrativas usam o servidor local. Não atribuem urgência clínica.",
);
slides.at(-1).id = "medico";
pair(
  "02 · MÉDICO",
  "Organizar a carteira e iniciar um cadastro.",
  "Cada paciente tem seu próprio contexto; um cadastro novo não herda resultados de outra pessoa.",
  ["doctor-patients", "Diretório de pacientes"],
  ["doctor-new", "Cadastro demonstrativo de paciente"],
  [
    [
      "Pacientes",
      "Busca, filtros e abertura do perfil organizam a carteira demonstrativa do médico. Mariana e Carlos possuem históricos detalhados.",
    ],
    [
      "Novo paciente",
      "Registra dados de um perfil demonstrativo na sessão. O teste verificou que um cadastro novo fica sem histórico clínico emprestado.",
    ],
  ],
  "O cadastro demonstrativo não cria uma conta Auth nem um prontuário real no Supabase.",
);
pair(
  "02 · MÉDICO",
  "Um perfil, várias formas de conferir.",
  "O prontuário demonstrativo organiza consulta, resultados e documentos em grupos de navegação.",
  ["doctor-patient-header", "Identificação e navegação do paciente"],
  ["doctor-summary", "Resumo da consulta"],
  [
    [
      "Identificação e contexto",
      "Nome, dados fictícios e última atualização ajudam a conferir o paciente selecionado. Os grupos separam comunicação, evolução e laudos.",
    ],
    [
      "Resumo da consulta",
      "Apresenta informações e pendências para revisão. O médico confere o resumo antes de registrar que o revisou e seguir para orientações.",
    ],
  ],
  "O resumo organiza registros disponíveis; não constitui uma conclusão clínica automática.",
);
tour(
  "02 · MÉDICO",
  "A preparação chega à caixa do médico.",
  "Esta captura mostra uma mensagem de Mariana e um PDF fictício enviados pelo portal do paciente.",
  "doctor-inbox",
  "Envios do paciente",
  [
    [
      "Mensagem recebida",
      "As respostas aparecem por tema: sintomas, medicamentos e perguntas para a consulta.",
    ],
    [
      "Arquivos originais",
      "PDFs podem ser abertos. Áudios são reproduzidos no original; não há transcrição automática neste fluxo.",
    ],
    [
      "Estado de revisão",
      "O médico pode marcar o envio como revisado. A notificação e o registro de revisão têm significados distintos.",
    ],
  ],
  "Chegar ao encontro sabendo o que o paciente quis comunicar.",
  "Envio criado apenas para esta apresentação. A caixa demonstrativa é temporária, por até 24 horas ou reinício do servidor.",
);
pair(
  "02 · MÉDICO + IA",
  "Laudo original e síntese lado a lado.",
  "O PDF permanece disponível para conferir cada achado; a IA auxilia a organização da revisão.",
  ["doctor-lab-document", "Documento laboratorial fictício original"],
  ["doctor-lab-ai", "Síntese real do Gemini sobre o exemplo fictício"],
  [
    [
      "Laudos laboratoriais",
      "O médico seleciona um PDF e abre o original. O envio ao Gemini exige confirmação explícita. A síntese apresenta achados, limitações e referências de página.",
    ],
    [
      "Revisão assistida",
      "A resposta estruturada passa por validação de limites e citações no servidor. O profissional deve confrontar a síntese com o laudo e o contexto.",
    ],
  ],
  "A análise desta captura foi produzida pelo Gemini a partir do PDF fictício incluído no projeto. Não é um laudo médico nem validação clínica.",
);
pair(
  "02 · MÉDICO",
  "Encontrar o resultado e conferir os valores.",
  "A lista de novos resultados leva à revisão; a seção do paciente detalha os marcadores disponíveis.",
  ["doctor-results", "Novos resultados da carteira"],
  ["doctor-patient-results", "Resultados do paciente"],
  [
    [
      "Novos resultados",
      "Permite pesquisar e filtrar períodos do histórico demonstrativo. Preparar consulta abre o paciente para revisão.",
    ],
    [
      "Resultados do paciente",
      "Mostra valores, unidades, coleta e referências disponíveis. Os gráficos e indicadores numéricos são exemplos fictícios.",
    ],
  ],
  "A lista demonstrativa não comprova recebimento automático de exames de laboratórios reais.",
);
pair(
  "02 · MÉDICO",
  "A história aparece ao longo do tempo.",
  "O histórico da carteira localiza exames; os gráficos do paciente mostram a evolução entre coletas.",
  ["doctor-history", "Histórico de exames da carteira"],
  ["doctor-patient-history", "Evolução dos resultados do paciente"],
  [
    [
      "Histórico de exames",
      "Ajuda a reencontrar resultados anteriores por paciente, exame e período.",
    ],
    [
      "Evolução individual",
      "Apresenta séries de glicemia, LDL, hemoglobina e vitamina D. O médico avalia tendências com o histórico e a condição clínica.",
    ],
  ],
  "Variação numérica não estabelece diagnóstico nem melhora clínica isoladamente.",
);
pair(
  "02 · MÉDICO",
  "Comparar duas coletas com contexto.",
  "A comparação numérica explicita o que mudou entre períodos selecionados.",
  ["doctor-comparison", "Comparação na carteira médica"],
  ["doctor-patient-comparison", "Comparação dentro do perfil do paciente"],
  [
    [
      "Diferenças visíveis",
      "Seleção de coletas e marcadores permite conferir valores anteriores, atuais e variações.",
    ],
    [
      "Leitura contextual",
      "Relaciona resultados ao histórico disponível. A prévia de inteligência nesta seção é demonstrativa, sem uma chamada de IA conectada.",
    ],
  ],
  "Não apresentar esta prévia como diagnóstico, predição clínica ou resposta real do Gemini.",
);
pair(
  "02 · MÉDICO",
  "Resultados e histórico familiar se complementam.",
  "O perfil reúne informações úteis para a avaliação profissional.",
  ["doctor-overview", "Visão geral do paciente"],
  ["doctor-family", "Histórico familiar"],
  [
    [
      "Visão geral",
      "Agrupa indicadores recentes e atalhos para aprofundar resultados, laudos e acompanhamento.",
    ],
    [
      "Histórico familiar",
      "Exibe informações familiares registradas no cenário. São contexto para conversar e investigar, não uma conclusão genética.",
    ],
  ],
  "Informações fictícias de demonstração. O médico precisa confirmar autoria, atualização e relevância dos registros.",
);
tour(
  "02 · MÉDICO",
  "O pedido vira um próximo passo para o paciente.",
  "Salvar um pedido e liberá-lo são etapas distintas.",
  "doctor-orders",
  "Solicitar exames",
  [
    [
      "Selecionar e registrar",
      "O médico escolhe exames e salva o pedido para conferir seu conteúdo.",
    ],
    [
      "Liberar para o paciente",
      "Depois da liberação, o pedido aparece no portal e como pendência da agenda do paciente.",
    ],
    [
      "Acompanhar ou cancelar",
      "O cancelamento fica registrado e cancela a coleta vinculada dentro do INOVA.",
    ],
  ],
  "Conectar a decisão do médico à tarefa que o paciente precisa cumprir.",
  "Pedido demonstrativo não emite guia de convênio, assinatura legal ou reserva externa.",
);
pair(
  "02 · MÉDICO",
  "Orientar e acompanhar depois da consulta.",
  "A orientação é preparada, revisada e publicada para o paciente consultar.",
  ["doctor-guidance", "Orientações ao paciente"],
  ["doctor-followup", "Acompanhamento médico"],
  [
    [
      "Orientações",
      "Permite escrever uma orientação, salvar rascunho e confirmar publicação. Instruções de preparo dependem de uma fonte conferida e do pedido.",
    ],
    [
      "Acompanhamento",
      "Reúne os próximos passos e situações demonstrativas para localizar quem precisa de revisão ou continuidade.",
    ],
  ],
  "Não há prescrição, instrução de jejum ou mudança de medicação criada automaticamente.",
);
tour(
  "02 · MÉDICO",
  "Uma agenda para preparar o próximo encontro.",
  "Navegação mensal, detalhes dos eventos e apoio de IA para planejar a revisão.",
  "doctor-agenda",
  "Agenda médica",
  [
    [
      "Compromissos",
      "Consulta, retorno e previsão de resultado têm estados distintos. O médico filtra pacientes e navega por meses e dias.",
    ],
    [
      "Histórico de alterações",
      "Confirmar ou cancelar mantém o registro. Motivos incluem guia do convênio ainda não emitida; a alteração aparece no outro perfil.",
    ],
    [
      "Briefing com IA",
      "Dia selecionado ou próximos 30 dias: reúne textos disponíveis, suspeitas registradas e lacunas, mediante autorização.",
    ],
  ],
  "Preparar o dia com contexto antes de abrir cada paciente.",
  "O briefing não envia o conteúdo dos anexos. Datas são informadas manualmente; não há reserva ou cancelamento externo automático.",
);
tour(
  "02 · MÉDICO",
  "O médico vê a própria atividade.",
  "Meus relatórios substitui os indicadores gerais da plataforma na área médica.",
  "doctor-reports",
  "Meus relatórios",
  [
    [
      "Escopo da carteira",
      "Conta pacientes e atividades do Rafael no ambiente demonstrativo, sem apresentar números gerais do INOVA.",
    ],
    [
      "Filtros e gráficos",
      "Período, envios, PDFs, áudios e revisões mostram a rotina registrada no cenário.",
    ],
    ["Compartilhar um resumo", "A versão de impressão permite salvar em PDF pelo navegador."],
  ],
  "Entender a utilização da ferramenta e a sequência do próprio atendimento.",
  "A atividade demonstrativa não mede produtividade ou ganho de tempo comprovado.",
);
pair(
  "02 · MÉDICO",
  "Perfil profissional e preferências pessoais.",
  "Dados profissionais ficam no perfil; ajustes de experiência ficam nas configurações.",
  ["doctor-profile", "Meu perfil médico"],
  ["doctor-settings", "Configurações médicas"],
  [
    [
      "Meu perfil",
      "Nome, CRM, consultório, apresentação e informações demonstrativas de plano. Substitui o diretório de outros médicos.",
    ],
    [
      "Configurações",
      "Preferências de notificações, leitura e acompanhamento, com prévia local. Salvar e cancelar foram exercitados nos testes.",
    ],
  ],
  "Essas preferências ficam no navegador. Não alteram autenticação, cobrança ou entrega externa de notificações.",
);
pair(
  "02 · MÉDICO",
  "Genética e genômica têm papéis distintos.",
  "O médico organiza arquivos brutos e consulta laudos interpretados.",
  ["doctor-genetics", "Genética: arquivo bruto TXT e revisão"],
  ["doctor-genomics", "Genômica: organização de laudos PDF"],
  [
    [
      "Genética",
      "Importa TXT no formato bruto 23andMe, confere marcadores e versões, registra revisão e permite download. Os quatro domínios são organizadores.",
    ],
    [
      "Genômica",
      "Recebe um laudo PDF e permite solicitar uma síntese por IA com fontes para conferir, da mesma forma que a análise documental.",
    ],
  ],
  "Quantidade de marcadores e taxa de chamadas não são risco genético. Escores clínicos do TXT continuam pendentes de metodologia validada.",
);
tour(
  "02 · MÉDICO",
  "Localizar os documentos para revisar.",
  "A biblioteca organiza o acesso às categorias de documentos do paciente.",
  "doctor-documents",
  "Documentos no perfil médico",
  [
    [
      "Organização",
      "Reúne documentos disponíveis na sessão e os relaciona às suas seções de revisão.",
    ],
    [
      "Original preservado",
      "O profissional abre o arquivo de origem, em vez de depender apenas de uma interpretação resumida.",
    ],
    [
      "Consulta preparada",
      "Documentos conferidos podem compor a sequência de preparação e revisão da consulta.",
    ],
  ],
  "Evitar que laudos relevantes fiquem perdidos entre diferentes telas.",
  "Adicionar um arquivo à biblioteca e enviar uma preparação são operações distintas. Persistência depende do módulo.",
);

tour(
  "03 · PACIENTE",
  "Mariana entende por onde começar.",
  "Minha saúde destaca informações recentes e próximos passos.",
  "patient-home",
  "Minha saúde",
  [
    [
      "Panorama",
      "Mostra o que está disponível, o que precisa de conferência e a última coleta fictícia.",
    ],
    [
      "Resultados e evolução",
      "Cartões dão acesso aos valores e aos gráficos. Referências dependem do laudo e do contexto individual.",
    ],
    [
      "Participação",
      "Atalhos levam à preparação, agenda, exames e orientações; busca e acessibilidade ajudam na navegação.",
    ],
  ],
  "Transformar informação dispersa em uma sequência compreensível.",
  "O panorama não define o estado geral de saúde. LDL sem meta individual é uma referência a confirmar, não um diagnóstico.",
);
slides.at(-1).id = "paciente";
tour(
  "03 · PACIENTE",
  "A consulta começa antes da consulta.",
  "Mariana prepara o que quer conversar com Rafael.",
  "patient-preparation",
  "Preparar consulta",
  [
    [
      "Relato estruturado",
      "Sintomas, medicamentos e perguntas podem ser escritos ou acompanhados de áudio. O rascunho é salvo neste navegador.",
    ],
    [
      "PDFs e confirmação",
      "A paciente adiciona laudos, seleciona os documentos e confere o resumo antes de confirmar o envio.",
    ],
    [
      "Recepção e acompanhamento",
      "O sistema informa recebimento na caixa demonstrativa. O médico recebe um aviso e pode revisar.",
    ],
  ],
  "Dar voz ao paciente e organizar a conversa com antecedência.",
  "A captura mostra conteúdo fictício. O envio não é canal de urgência nem garantia de resposta imediata.",
);
pair(
  "03 · PACIENTE",
  "Pedido pendente e compromisso marcado são diferentes.",
  "O exame liberado aparece como tarefa; a coleta entra no calendário quando uma data é informada.",
  ["patient-agenda", "Minha agenda"],
  ["patient-orders", "Exames solicitados"],
  [
    [
      "Minha agenda",
      "Consulta, retorno e previsão de resultado ficam visíveis. O paciente pode propor eventos e cancelar com motivo, mantendo o histórico compartilhado.",
    ],
    [
      "Exames solicitados",
      "Apresenta pedidos liberados, consulta de valores fictícios e vínculo para informar uma coleta combinada. Depois, o resultado pode ser enviado na preparação.",
    ],
  ],
  "Informar a coleta no INOVA não confirma agendamento com um laboratório ou autorização de convênio.",
);
tour(
  "03 · PACIENTE + S2",
  "Comparar opções antes de combinar a coleta.",
  "A jornada inspirada na S2 mostra como o pedido pode levar à escolha de um laboratório.",
  "patient-s2",
  "Cotação demonstrativa de laboratórios",
  [
    [
      "Pedido e carrinho",
      "Os exames da guia entram na exploração de opções; o carrinho não reescreve o pedido original do médico.",
    ],
    [
      "Comparação",
      "Laboratórios, valores, localização e atendimento domiciliar são exibidos para ilustrar a decisão.",
    ],
    [
      "Revisão da escolha",
      "Escolher um laboratório termina em uma conferência demonstrativa, com indicação clara de simulação.",
    ],
  ],
  "Conectar a solicitação à etapa seguinte da jornada de exames.",
  "Preços, unidades e distâncias fictícios. Sem API S2 real, parceria comercial comprovada, reserva, pagamento ou receita de comissão.",
);
pair(
  "03 · PACIENTE",
  "Ver o resultado e acompanhar mudanças.",
  "O paciente consulta o histórico e pode solicitar uma explicação assistida.",
  ["patient-results", "Meus resultados"],
  ["patient-evolution-charts", "Minha evolução: gráficos do histórico"],
  [
    [
      "Meus resultados",
      "Valores, unidades e períodos apresentam o histórico fictício. A explicação com Gemini exige autorização e envia os dados selecionados.",
    ],
    [
      "Minha evolução",
      "Gráficos e filtros mostram variações entre coletas, referências de consulta e dados do perfil. A IA pode explicar mudanças, sem orientar tratamento.",
    ],
  ],
  "A IA pode errar. O paciente deve conferir o laudo e conversar com o médico; variações não classificam a saúde automaticamente.",
);
pair(
  "03 · PACIENTE",
  "Saber o próximo passo e perceber uma atualização.",
  "Tarefas pendentes e avisos dão continuidade ao que acontece entre os encontros.",
  ["patient-next", "Próximos passos"],
  ["patient-alerts", "Avisos"],
  [
    [
      "Próximos passos",
      "Organiza pendências disponíveis: preparar consulta, conferir pedidos, resultados e orientações.",
    ],
    [
      "Avisos e sininho",
      "Reúne atualizações demonstrativas de pedidos, orientações e agenda. Aviso lido não substitui execução da tarefa ou revisão médica.",
    ],
  ],
  "Os avisos são do ambiente demonstrativo e não comprovam disparo de e-mail ou WhatsApp.",
);
pair(
  "03 · PACIENTE",
  "Orientações e preparo devem ter uma origem.",
  "A paciente consulta o que foi publicado pelo médico, sem instruções clínicas inventadas pelo sistema.",
  ["patient-guidance", "Orientações do médico"],
  ["patient-exam-preparation", "Preparo dos exames"],
  [
    [
      "Orientações publicadas",
      "Exibe conteúdos liberados para a paciente, após revisão do médico. Um rascunho não aparece como orientação pronta.",
    ],
    [
      "Preparo dos exames",
      "Instruções aparecem quando existe uma fonte conferida vinculada a um pedido ativo. Sem publicação, a tela informa que o preparo não foi informado.",
    ],
  ],
  "Confirmar as instruções com o médico e com a unidade. A demonstração não gera jejum, coleta ou suspensão de medicação automaticamente.",
);
pair(
  "03 · PACIENTE",
  "Guardar preferências e reencontrar a história.",
  "Contatos de laboratórios e a sequência do cuidado complementam a rotina.",
  ["patient-favorites", "Laboratórios favoritos"],
  ["patient-timeline", "Linha do tempo"],
  [
    [
      "Laboratórios favoritos",
      "Guarda preferências demonstrativas para reencontrar contatos. A consulta de opções usa dados fictícios da jornada S2.",
    ],
    [
      "Linha do tempo",
      "Mostra coletas, envios e atualizações em sequência, com busca e filtros por categoria. Abrir detalhe leva ao contexto correspondente.",
    ],
  ],
  "Favoritar um local não reserva serviço. A linha do tempo mistura registros históricos fictícios com eventos demonstrativos da sessão.",
);
tour(
  "03 · PACIENTE",
  "Um lugar para organizar os laudos.",
  "Meus documentos permite adicionar PDFs e consultar o original.",
  "patient-documents",
  "Meus documentos",
  [
    [
      "Biblioteca pessoal",
      "Classificação por tipo e busca pelo nome ajudam a localizar os arquivos.",
    ],
    ["Visualização", "Selecionar um documento permite abrir o original e conferir seu conteúdo."],
    [
      "Enviar ao médico",
      "Para compartilhar, a paciente segue para Preparar consulta, seleciona os documentos e confirma o envio.",
    ],
  ],
  "Separar organização de arquivos da decisão de compartilhá-los.",
  "Adicionar um PDF não o envia automaticamente. O rascunho de preparação tem armazenamento local próprio.",
);
tour(
  "03 · PACIENTE",
  "Importar genética sem inventar um score.",
  "Minha genética organiza um TXT bruto e seu estado de revisão.",
  "patient-genetics",
  "Minha genética",
  [
    [
      "Formato de entrada",
      "O arquivo bruto contém identificadores, cromossomo, posição e genótipo. A importação atual aceita TXT no formato previsto.",
    ],
    [
      "Versões e conferência",
      "O módulo mantém versões locais demonstrativas, informações técnicas, download e registro de revisão.",
    ],
    [
      "Quatro domínios",
      "Neurologia, metabolismo, imunidade e nutrição são categorias de organização; os escores não estão configurados.",
    ],
  ],
  "Preparar a revisão documental com transparência sobre o que foi calculado.",
  "Um PDF interpretado não equivale ao TXT bruto. Organização de dados genéticos não estabelece predisposição clínica.",
);
tour(
  "03 · PACIENTE",
  "Dados de contato e navegação acessível.",
  "O perfil permite conferir os dados demonstrativos e ajustar informações de contato na sessão.",
  "patient-profile",
  "Meu perfil do paciente",
  [
    [
      "Dados do perfil",
      "Mariana consulta informações de identificação do cenário fictício e atualiza os contatos locais.",
    ],
    [
      "Busca no espaço",
      "O campo comum localiza exames, pedidos, documentos ou orientações dentro da experiência disponível.",
    ],
    [
      "Acessibilidade",
      "Controles de leitura ajudam a utilizar o portal. A navegação foi exercitada em larguras de computador e celular.",
    ],
  ],
  "Permitir que o paciente encontre informação e seja identificado corretamente.",
  "Editar esse perfil não altera uma conta real do Supabase nem comprova sincronização de dados pessoais em produção.",
);

tour(
  "04 · ADMINISTRAÇÃO",
  "Entender quem chega.<br> Acompanhar quem fica.",
  "O portal administrativo reúne operação e relacionamento, separado do atendimento clínico.",
  "admin-home",
  "Visão geral administrativa",
  [
    [
      "Panorama da base",
      "Usuários cadastrados, uso recente e contas habilitadas ou desativadas são medidas distintas.",
    ],
    [
      "Negócio e satisfação",
      "MRR simulado e notas explícitas mostram como acompanhar assinatura e feedback, sem confundir uso com satisfação.",
    ],
    [
      "Gráficos e prioridades",
      "Distribuições e atividades apontam onde investigar, contatar ou pedir uma avaliação.",
    ],
  ],
  "Gerir a plataforma com contexto, sem expor esses indicadores na rotina de cada médico.",
  "A base administrativa contém 14 usuários fictícios e referência de atividade em 08/10/2026. Não representa tração comercial.",
);
slides.at(-1).id = "gestao";
tour(
  "04 · ADMINISTRAÇÃO",
  "Saber quem é a pessoa antes de agir.",
  "A área Usuários oferece filtros, contatos e conferência do perfil.",
  "admin-users",
  "Usuários do INOVA",
  [
    [
      "Encontrar e filtrar",
      "Busca por nome/e-mail, perfil médico ou paciente, situação da conta, participação e satisfação.",
    ],
    [
      "Contato e vínculos",
      "Detalhes mostram informações fictícias para planejar uma conversa e conferir vínculos disponíveis.",
    ],
    [
      "Ativar ou desativar",
      "Mudança de status exige confirmação e motivo; o histórico local registra a ação.",
    ],
  ],
  "Localizar a pessoa certa para entender dificuldades e acompanhar o relacionamento.",
  "Ações persistem neste navegador. Não desativam contas reais, não alteram prontuários e não disparam mensagens.",
);
tour(
  "04 · ADMINISTRAÇÃO",
  "Uso recente é uma evidência de participação.",
  "Gráficos de atividade ajudam a observar frequência e funcionalidades exploradas.",
  "admin-activity",
  "Atividade administrativa",
  [
    [
      "Recorte por perfil e período",
      "Filtros separam médicos/pacientes e intervalos do histórico demonstrativo.",
    ],
    [
      "Volume e frequência",
      "Interações, usuários participantes e média diária indicam o que foi registrado, não satisfação.",
    ],
    [
      "Uso por função",
      "Acesso, agenda, envios, resultados e pedidos compõem o mapa de utilização do cenário.",
    ],
  ],
  "Priorizar entrevistas e ajustes a partir de padrões de uso.",
  "Os eventos são fictícios. Ausência de acesso pode justificar contato; não prova descontentamento ou abandono.",
);
tour(
  "04 · ADMINISTRAÇÃO",
  "Separar assinatura ativa de dinheiro recebido.",
  "O painel de assinaturas organiza planos e situações de pagamento demonstrativas.",
  "admin-subscriptions",
  "Assinaturas administrativas",
  [
    [
      "MRR simulado",
      "Soma as mensalidades das assinaturas marcadas como ativas. Não é saldo bancário nem receita recebida.",
    ],
    [
      "Situações distintas",
      "Teste, ativa, pagamento pendente e cancelada permitem simular uma operação de assinatura.",
    ],
    [
      "Planos e condições",
      "Exibe exemplos de R$ 149 e R$ 249 para experimentar apresentação e gestão dos planos.",
    ],
  ],
  "Construir a visão de receita recorrente e acompanhar situações comerciais.",
  "Nenhum gateway ou cobrança real está conectado nesta demonstração. Os cenários financeiros seguintes usam premissas próprias.",
);
pair(
  "04 · ADMINISTRAÇÃO",
  "Entrar em contato e ouvir a resposta.",
  "A gestão de relacionamento organiza o trabalho humano antes de qualquer automação.",
  ["admin-contacts", "Contatos e reativação"],
  ["admin-feedback", "Feedbacks dos usuários"],
  [
    [
      "Contatos e reativação",
      "Planeja tarefas, canal, data e situação; oferece mensagem sugerida e registro de acompanhamento. Telefone/e-mail do cenário ajudam a preparar a conversa.",
    ],
    [
      "Feedbacks",
      "Registra nota, categoria e comentário explícito. Distingue avaliações positivas, neutras, negativas e pessoas que ainda não responderam.",
    ],
  ],
  "Não há envio automático. Os contatos e comentários destas capturas são fictícios, não depoimentos de clientes.",
);
tour(
  "04 · ADMINISTRAÇÃO + IA",
  "Resumo para investigar e decidir.",
  "A IA administrativa organiza indicadores disponíveis e propõe próximos passos.",
  "admin-ai-result",
  "Resumo administrativo real sobre dados fictícios",
  [
    ["Participação", "Distingue pessoas em uso, em atenção, sem uso recente e contas desativadas."],
    [
      "Satisfação e relacionamento",
      "Usa notas explícitas e pendências de contato. Não conclui que alguém está insatisfeito só por não acessar.",
    ],
    [
      "Minimização e revisão",
      "Envia contagens e referências U1/U2, sem nomes, e-mails, prontuários ou comentários livres. Exige autorização.",
    ],
  ],
  "Transformar indicadores em perguntas e prioridades para a equipe.",
  "A captura mostra resposta real do Gemini sobre o cenário fictício. Recomendações não executam ações ou confirmam a causa de inatividade.",
);

add(
  "ESTÁGIO DO PRODUTO",
  "Uma demonstração testada.<br><em>Um caminho definido para produção.</em>",
  "O que foi verificado e o que precisa de validação adicional antes de usuários reais.",
  `<div class="metrics four">${card("TESTES", "76", "Regras e contratos")}${card("NAVEGADOR", "19 cenários", "Fluxos locais completos")}${card("NAVEGAÇÃO", "16 + 15", "Rotas + seções do paciente")}${card("TELAS", "1440 / 390", "Larguras de computador e celular")}</div><div class="columns three">${panel("Confirmado no ambiente local", "Envios com áudio/PDF, notificações, revisão, pedidos, S2 simulada, agenda, administração e recuperação após falha de conexão. TypeScript e build passaram.")}${panel("Ainda demonstrativo", "Usuários e histórico clínico fictícios; S2 sem conexão externa; contratos e MRR administrativos simulados; genética bruta sem escores de risco.")}${panel("Próximo marco técnico", "Validar autenticação, permissões por vínculo, persistência, backups/restauração e operação com contas reais, preservando as interfaces aprovadas.")}</div>${note("Referência: docs/testes-funcionais-2026-10-09.md. Testes técnicos não comprovam benefício clínico, ganho de tempo, demanda ou segurança de uma implantação de produção.")}`,
  { status: "EVIDÊNCIA TÉCNICA" },
);

add(
  "05 · MODELO COMERCIAL",
  "Por que testar R$ 149 e R$ 249?",
  "São hipóteses coerentes com os exemplos já usados no INOVA, não preços oficiais ou médias de mercado.",
  `<div class="columns three"><div class="price-panel"><span>PROPOSTA DE ENTRADA</span><b>R$ 149<small>/médico/mês</small></b><p>Testar uma barreira de contratação menor para a rotina principal. O piloto precisa confirmar se o preço sustenta uso, atendimento e retenção.</p></div><div class="price-panel"><span>PROPOSTA COM MAIOR COBERTURA</span><b>R$ 249<small>/médico/mês</small></b><p>Testar mais espaço econômico para suporte e volume de IA. Escopo e limites precisam ser definidos antes de oferecer o pacote comercial.</p></div><div class="price-panel accent"><span>TICKET CENTRAL DA SIMULAÇÃO</span><b>R$ 199<small>/médico/mês</small></b><p>50% × R$ 149 + 50% × R$ 249. O mix é arbitrado para comparar cenários; não foi observado em vendas.</p></div></div>
  <div class="metrics three">${card("CUSTO DIRETO PROPOSTO", money(variable), "Por médico pagante/mês")}${card("CONTRIBUIÇÃO CENTRAL", money(contribution, 2), "Após deduções e custo direto")}${card("OFERTA A VALIDAR", "Paciente incluído", "Assinatura por profissional")}</div>${note("Não atribuir diferenças de produto ainda não construídas a esses preços. Validar pacote, limites de uso, conversão, suporte e disposição de pagar em entrevistas e propostas comparáveis.")}`,
  { id: "financeiro", status: "HIPÓTESES DE PREÇO" },
);

add(
  "05 · CUSTOS PROGRAMADOS",
  "Custos fixos para uma operação enxuta.",
  "Orçamento proposto: equipe, atendimento e aquisição pesam mais que a licença de infraestrutura.",
  `<div class="finance-split"><div class="panel"><h3>Orçamento recorrente mensal</h3>${bars(
    assumptions.fixedMonthlyCosts.map((c) => ({ label: c.name, value: c.value })),
    { height: 465 },
  )}</div><div class="stack"><div class="metrics two">${card("TOTAL FIXO", money(fixed), "Proposta mensal")}${card("TOTAL ANUAL", money(fixed * 12), "Mantendo a mesma estrutura")}</div>${panel("Variável: R$ 25 por médico", "R$ 10 de IA + R$ 8 de armazenamento/tráfego incremental + R$ 7 de suporte incremental. São provisões; o uso real precisa ser medido.")}${panel("Deduções e cobrança", "8% da receita: reserva hipotética de deduções operacionais. 4%: provisão de cobrança. Nenhuma taxa é uma alíquota legal ou cotação contratada.")}${panel("Reforço na escala", "O cenário de 500 médicos usa R$ 35 mil fixos: R$ 8 mil de equipe e R$ 2 mil de infraestrutura adicionais ao orçamento base.")}</div></div>${note("Valores propostos, sem contratos ou despesas atuais comprovadas. Nenhum custo de captação, dívida ou tributo sobre lucro foi incluído.")}`,
  { status: "ORÇAMENTO HIPOTÉTICO" },
);

add(
  "05 · RECEITA E EBITDA",
  "A viabilidade muda com a base pagante.",
  "Comparação mensal com ticket de R$ 199, deduções de 12% e custo variável de R$ 25 por médico.",
  `<div class="metrics three">${scenarios.map((s) => card(s.doctors + " MÉDICOS", money(s.revenue) + " MRR", "EBITDA recorrente: " + money(s.ebitda), s.ebitda < 0 ? "negative" : "positive")).join("")}</div><table class="financial"><thead><tr><th>Modelo mensal em R$</th>${scenarios.map((s) => `<th>${s.doctors} médicos</th>`).join("")}</tr></thead><tbody>${[
    ["Receita bruta recorrente", "revenue"],
    ["Deduções operacionais · 8%", "deductions"],
    ["Cobrança · 4%", "payment"],
    ["Custo variável de utilização", "usage"],
    ["Margem de contribuição", "contribution"],
    ["Despesas fixas recorrentes", "fixedCosts"],
    ["EBITDA recorrente estimado", "ebitda"],
    ["Margem EBITDA", "margin"],
  ]
    .map(
      ([label, key]) =>
        `<tr class="${key === "ebitda" ? "total" : ""}"><td>${label}</td>${scenarios.map((s) => `<td class="${key === "ebitda" ? (s.ebitda < 0 ? "red" : "green") : ""}">${key === "margin" ? percent(s[key]) : money(s[key], 0)}</td>`).join("")}</tr>`,
    )
    .join(
      "",
    )}</tbody></table>${note("EBITDA recorrente = receita − deduções − cobrança − custo de uso − despesas fixas. Não é lucro líquido nem caixa. Implantação, juros, tributos sobre lucro, depreciação e amortização ficam fora desta aproximação.")}`,
  { status: "CENÁRIOS · NÃO REALIZADO" },
);

add(
  "05 · PONTO DE EQUILÍBRIO",
  "Quantos médicos cobrem a operação?",
  "O preço precisa conversar com o custo, a intensidade de uso e a aceitação pelo cliente.",
  `<div class="metrics three">${card("CONTRIBUIÇÃO / MÉDICO", money(contribution, 2), "R$ 199 × 88% − R$ 25")}${card("FIXO / CONTRIBUIÇÃO", number(fixed / contribution), "Arredondar para cima")}${card("BASE DE EQUILÍBRIO", breakEven + " médicos", "EBITDA recorrente ≥ zero")}</div><div class="finance-split"><div class="panel"><h3>Sensibilidade: assinantes para cobrir R$ 25 mil fixos</h3><table class="heatmap"><thead><tr><th>Custo de uso / médico</th><th>R$ 149</th><th>R$ 199</th><th>R$ 249</th></tr></thead><tbody>${[25, 45, 65].map((v) => `<tr><td>${money(v)}</td>${[149, 199, 249].map((p) => `<td style="background:rgba(0,184,230,${0.08 + (p - 149) / 700})">${Math.ceil(fixed / (p * (1 - rate) - v))}</td>`).join("")}</tr>`).join("")}</tbody></table><p>Menor preço ou maior consumo exige mais assinantes. O orçamento com R$ 35 mil fixos exige ${Math.ceil(35000 / contribution)} médicos no ticket central.</p></div><div class="stack">${panel("Economia por assinatura", "R$ 199 brutos − R$ 23,88 de deduções/cobrança − R$ 25 de uso = R$ 150,12 para pagar despesas fixas e gerar resultado.")}${panel("Aquisição: exemplo separado", "Se o CAC completo fosse R$ 400, o payback de contribuição seria 2,7 meses, antes de distribuir despesas fixas. CAC e retenção ainda não foram medidos.")}${panel("Como validar", "Medir consumo de IA, armazenamento, tempo de atendimento, custo de implantação e conversão. Evitar prometer uso ilimitado sem orçamento.")}</div></div>${note("CAC é um diagnóstico ilustrativo; aquisição e pró-labore já constam no fixo. O modelo não deduz R$ 400 novamente por cadastro.")}`,
  { status: "SENSIBILIDADE FINANCEIRA" },
);

add(
  "05 · SIMULAÇÃO DE 12 MESES",
  "Receita e resultado ao longo de 12 meses.",
  "Bases pagantes arbitradas para explorar o caixa; não são previsão baseada em vendas ou retenção.",
  `<div class="metrics four">${card("RECEITA NO EXERCÍCIO", money(yearRevenue), "Soma dos 12 meses")}${card("EBITDA DO EXERCÍCIO", money(yearEbitda), "Resultado recorrente negativo", "negative")}${card("PRIMEIRO MÊS POSITIVO", "M11", "190 médicos pagantes médios")}${card("MRR NO M12", money(ramp.at(-1).revenue), "220 médicos pagantes médios")}</div><div class="panel">${chart(
    [
      { name: "Receita mensal", values: ramp.map((m) => m.revenue) },
      { name: "EBITDA recorrente", values: ramp.map((m) => m.ebitda) },
    ],
    { colors: ["#00b8e6", "#a9dfb8"], height: 285 },
  )}</div><div class="month-base">${ramp.map((m) => `<div><span>M${m.month}</span><b>${m.doctors}</b></div>`).join("")}</div>${note("Números abaixo do gráfico = médicos pagantes médios no mês, líquidos de eventuais saídas. Sem estimativa de funil ou churn. Fixo R$ 25 mil/mês, ticket R$ 199. A base precisa ser conquistada; equilíbrio no M11 não elimina o prejuízo acumulado.")}`,
  { status: "EXERCÍCIO HIPOTÉTICO" },
);

add(
  "05 · CAPITAL E USO DO RECURSO",
  "Dimensionar caixa com margem para aprender.",
  "Exemplo de capital inicial: R$ 225 mil. Não é uma captação aprovada nem uma proposta de participação.",
  `<div class="metrics four">${card("IMPLANTAÇÃO INICIAL", money(setup), "Desembolso segregado")}${card("NECESSIDADE MÁXIMA", money(peakNeed), "Antes de aporte; pico no M10")}${card("COM RESERVA DE 20%", money(requiredWithReserve), "Sobre a necessidade máxima")}${card("CAPITAL ILUSTRATIVO", money(assumptions.illustrativeFundingBRL), "Arredondamento com folga")}</div><div class="finance-split"><div class="panel"><h3>Caixa estimado após o aporte e a implantação</h3>${chart([{ name: "Saldo de caixa simplificado", values: ramp.map((m) => m.cashAfterFunding) }], { height: 275 })}<p>Mínimo no exercício: <b>${money(Math.min(...ramp.map((m) => m.cashAfterFunding)))}</b>. Final do M12: <b>${money(ramp.at(-1).cashAfterFunding)}</b>.</p></div><div class="stack">${panel("Implantação inicial: R$ 40 mil", assumptions.setupInvestment.map((c) => `${c.name}: ${money(c.value)}.`).join("<br>"))}${panel("Operação enquanto valida", "Financiar o déficit recorrente até conquistar a base. O orçamento já inclui desenvolvimento, suporte, gestão e relacionamento.")}${panel("Condições para avançar", "Liberar etapas por entregas: piloto observado, produção validada e proposta comercial testada. Definir valor e termos somente após orçamento e negociação.")}</div></div>${note("Caixa supõe entradas e pagamentos no mesmo mês, sem inadimplência extraordinária, dívida ou capital de giro adicional. Implantação pode conter despesas ou investimento: classificação contábil a validar. Não é promessa de retorno ou de 12 meses de operação em qualquer cenário.")}`,
  { status: "CAPITAL HIPOTÉTICO" },
);

add(
  "05 · REFERÊNCIAS DE INFRAESTRUTURA",
  "O custo da IA precisa ser medido por uso.",
  "Tarifas consultadas em fontes oficiais; elas são referências, não a fatura atual do INOVA.",
  `<div class="columns three"><div class="panel"><span class="eyebrow">BANCO E ARQUIVOS</span><h3>Supabase Pro</h3><b class="cost-value">US$ 25/mês</b><p>Referência inicial para organização Pro, com créditos de compute. Projetos, recursos adicionais e excedentes mudam o custo.</p><p><a href="https://supabase.com/pricing">Fonte: Supabase Pricing</a> · 09/10/2026</p></div><div class="panel"><span class="eyebrow">HOSPEDAGEM POSSÍVEL</span><h3>Vercel Pro</h3><b class="cost-value">US$ 20/mês</b><p>Preço de referência, com crédito de uso. Assentos, consumo e adicionais dependem da configuração. Hospedagem de produção ainda a definir.</p><p><a href="https://vercel.com/pricing">Fonte: Vercel Pricing</a> · 09/10/2026</p></div><div class="panel"><span class="eyebrow">MODELO VERIFICADO</span><h3>Gemini 2.5 Flash</h3><b class="cost-value">US$ 0,30 / 2,50</b><p>Por 1 milhão de tokens: entrada de texto/imagem/vídeo e saída, respectivamente. Saída inclui raciocínio. Standard, faixa paga.</p><p><a href="https://ai.google.dev/gemini-api/docs/pricing">Fonte: Google Pricing</a> · 09/10/2026</p></div></div><div class="finance-split lower"><div class="panel"><h3>Exemplo de consumo, não medição do sistema</h3><p>100 análises/médico/mês × (8.000 tokens de entrada + 2.000 de saída) ≈ <b>US$ 0,74</b> de geração. Com 4.000 tokens de saída: <b>US$ 1,24</b>. Retries, laudos extensos, raciocínio e serviços adicionais podem elevar o consumo.</p><p>A R$ 5,50/US$ como premissa cambial: R$ 4,07 a R$ 6,82. A reserva de IA de R$ 10 por médico precisa ser confrontada com o uso real.</p></div><div class="panel"><h3>Referência mínima não é orçamento total</h3><p>US$ 45 × R$ 5,50 = <b>R$ 247,50/mês</b>, apenas somando as duas referências iniciais de plataforma. O fixo prevê R$ 1.200 para infraestrutura base e monitoramento, além de consumo incremental.</p><p>R$ 5,50 é taxa de planejamento, não cotação atual. Equipe, suporte, operação e contratação permanecem os maiores itens do modelo.</p></div></div>`,
  { status: "FONTES + PREMISSAS" },
);

add(
  "VALIDAÇÃO COMERCIAL",
  "O investidor precisa de evidência de valor.",
  "O próximo objetivo é provar utilidade recorrente e disposição de pagar, preservando a experiência atual.",
  `<div class="columns three">${panel("Problema a validar", "Médicos recebem relatos, documentos e pendências por canais diferentes. Investigar quanto isso atrapalha a preparação e o retorno, antes de quantificar o ganho.")}${panel("Piloto orientado", "Começar com 3 a 5 médicos, uma rotina principal e tarefas comparáveis. Primeiro usar dados fictícios; dados reais exigem concluir os requisitos de produção.")}${panel("Proposta e aprendizado", "Testar R$ 149 e R$ 249 com escopo definido, limites e apoio de implantação. Registrar aceitação, recusa, motivo e uso continuado.")}</div><div class="metrics four">${card("ATIVAÇÃO", "Rotina concluída", "Receber → revisar → orientar")}${card("RECORRÊNCIA", "Uso semanal", "Repetição com contexto real")}${card("VALOR", "Tempo observado", "Antes/depois em tarefas comparáveis")}${card("CONVERSÃO", "Aceita pagar", "Preço e escopo definidos")}</div>${note("Metas propostas: 3 de 5 médicos repetirem a rotina em semanas distintas; 2 aceitarem uma proposta condicionada à entrega. Não são resultados históricos. Benefício comercial ou clínico precisa ser demonstrado, não presumido.")}`,
  { status: "PLANO PROPOSTO" },
);

add(
  "MÉTODO E FONTES",
  "Transparência para apresentar com confiança.",
  "Telas atuais, testes documentados e contas reproduzíveis.",
  `<div class="columns three">${panel("Produto e capturas", "Demonstração local em 09/10/2026, versão GitHub 1e5cbbf. Rafael, Mariana e a base administrativa são fictícios. Prints recortados para destacar conteúdo, sem redesenhar as interfaces.")}${panel("Evidência técnica", "Relatório testes-funcionais-2026-10-09.md: 76 testes, 19 cenários de navegador e 6 fluxos Gemini verificados. Capturas extras de IA usam apenas dados fictícios.")}${panel("Premissas econômicas", "Arquivo _premissas.json permite revisar preços, custos e bases mensais. _calculos.json contém DRE, equilíbrio, projeção e caixa derivados do mesmo modelo.")}</div>
  <div class="panel sources"><h3>Fontes oficiais de tarifas consultadas em 09/10/2026</h3>${assumptions.sources.map((s) => `<p><a href="${s.url}">${s.title}</a><span>${escape(s.url)}</span></p>`).join("")}<p><a href="https://github.com/contatoraissa/INOVAos/commit/1e5cbbf5531d940de0f8a8850ffb0a6206ab22b8">Versão do projeto usada nas capturas</a><span>GitHub · commit 1e5cbbf</span></p></div>${note("Não foram realizadas pesquisa de tamanho de mercado, avaliação jurídica, auditoria contábil ou validação clínica. Nenhuma tela é prova de cliente, parceria ou receita real. O material descreve o estágio atual e um caminho econômico hipotético.")}`,
  { status: "REFERÊNCIAS" },
);

add(
  "PRÓXIMO MARCO",
  "Do sistema demonstrado<br><em>ao valor comprovado.</em>",
  "Conectar a preparação do paciente, a revisão do médico e a continuidade do cuidado.",
  `<div class="closing-mark">${iconInfinity}</div><div class="closing-grid">${panel("Preservar", "Manter as interfaces aprovadas e a versão testada como base de evolução.")}${panel("Validar", "Observar o uso por médicos, concluir produção e testar propostas com preço definido.")}${panel("Investir com critério", "Vincular recursos a entregas e evidências. Revisar o orçamento com consumo, aquisição e retenção medidos.")}</div><div class="closing-quote">“Qual parte desta jornada justificaria uma assinatura na rotina do seu consultório?”</div>`,
  { kind: "closing", status: "INOVA · 2026" },
);

for (const slide of slides) if (slide.chapter.startsWith("05")) slide.kind += " finance";
const styles = `
@page{size:1600px 900px;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#03112d;color:#fff;font-family:'Segoe UI',Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{--cyan:#00b8e6;--blue:#0077b6;--muted:#c9d1d9;--panel:#0a203f}a{color:#53d6f7;text-decoration:none}em{font-style:normal;color:#43d2f0}.slide{width:1600px;height:900px;position:relative;padding:30px 44px 58px;break-after:page;background:radial-gradient(ellipse at 90% 0%,#0a2e5080 0,transparent 50%),#03112d;overflow:hidden}.slide:last-child{break-after:auto}header{height:41px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #9bd2e72b;padding-bottom:12px}.logo{font-weight:300;font-size:30px;letter-spacing:7px;white-space:nowrap}.logo span{color:var(--cyan);letter-spacing:0;margin:0 3px}.header-label{font-size:12px;letter-spacing:2px;color:#91b3c9}.status{padding:7px 11px;border:1px solid #40cdec44;border-radius:20px;font-size:10px;color:#71d9ec;letter-spacing:1.2px}.eyebrow{font-size:12px;letter-spacing:2px;color:#4cd7f4;font-weight:600;margin-bottom:13px}h1{font-weight:550;font-size:43px;line-height:1.13;letter-spacing:-1.1px;margin:17px 0 10px}h2,h3{margin:0 0 10px}h3{font-size:23px;font-weight:550;line-height:1.25}.subtitle{font-size:18px;line-height:1.4;color:#b4c9d9;max-width:1350px;margin:0 0 21px}.body{display:flex;flex-direction:column;gap:18px}p{font-size:18px;line-height:1.47;color:#c9d1d9;margin:0 0 13px}footer{position:absolute;bottom:19px;left:44px;right:44px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #ffffff22;padding-top:11px;font-size:11px;color:#9db4c9}footer b{color:#48d3f2;font-size:13px;font-weight:500}.tour{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:28px;align-items:start}.tour aside{padding-top:6px;display:flex;flex-direction:column;gap:19px}.point{display:flex;gap:13px}.step{font-size:13px;color:#51d4f0;border:1px solid #40d6f14a;border-radius:10px;flex-shrink:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center}.point h3{font-size:21px;margin:0 0 6px}.point p{font-size:16px;line-height:1.45;margin:0}.value{margin-top:8px;padding:18px 19px;background:#00b8e612;border-left:3px solid #00b8e6;border-radius:0 13px 13px 0}.value span{font-size:10px;letter-spacing:2px;color:#43d2f0}.value p{font-size:19px;line-height:1.4;color:#fff;margin:8px 0 0}figure{margin:0;min-width:0}.screen{border:1px solid #7ad4ef55;border-radius:15px;overflow:hidden;background:#eaf2f6;height:544px;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 40px #00000022}.screen img{width:100%;height:100%;object-fit:contain}.screen img[src]{color:transparent}figcaption{font-size:12px;line-height:1.4;color:#a9c4d4;margin-top:8px}.note{font-size:14px;line-height:1.45;padding:13px 17px;border:1px solid #63c9e52e;border-radius:12px;background:#00b8e60c;color:#c9d8e5}.gallery{display:grid;grid-template-columns:1fr 1fr;gap:22px}.gallery .screen{height:360px}.explain-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.explain-grid .panel{padding:18px 20px}.explain-grid h3{font-size:22px}.explain-grid p{font-size:17px;margin:0}.panel{border:1px solid #9ccae22c;border-radius:18px;background:#0a203fcc;padding:23px;min-width:0}.panel p:last-child{margin-bottom:0}.columns{display:grid;gap:22px}.columns.three{grid-template-columns:repeat(3,1fr)}.columns.two{grid-template-columns:repeat(2,1fr)}.columns .panel{padding:25px;min-height:200px}.metrics{display:grid;gap:17px}.metrics.four{grid-template-columns:repeat(4,1fr)}.metrics.three{grid-template-columns:repeat(3,1fr)}.metrics.two{grid-template-columns:repeat(2,1fr)}.metric{border:1px solid #66cbea35;border-radius:16px;padding:20px 22px;background:linear-gradient(135deg,#0a2946,#081b38);min-height:140px}.metric span{display:block;color:#9dbace;font-size:11px;letter-spacing:1.3px}.metric b{display:block;font-size:36px;font-weight:550;letter-spacing:-1px;color:#fff;margin:14px 0 6px;line-height:1.2}.metric small{display:block;font-size:14px;color:#afc8d6;line-height:1.4}.metric.negative b,.red{color:#ffa4a4}.metric.positive b,.green{color:#9ae0b3}.dashboard-bottom{display:grid;grid-template-columns:1.4fr 1fr;gap:22px}.dashboard-bottom .metrics{margin-bottom:22px}.dashboard-bottom .metric{background:#071a34}.dashboard-bottom p{font-size:19px}.chapter-links{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.chapter-links a{padding:27px;border:1px solid #63c9e555;border-radius:18px;background:#0c2844}.chapter-links b{color:#46d5f1;font-size:44px;font-weight:300}.chapter-links h3{color:#fff;margin:19px 0 12px}.chapter-links p{font-size:17px}.journey{display:flex;gap:20px;align-items:center;padding:25px 10px}.journey div{padding:26px;background:#ffffff08;border-radius:15px;flex:1}.journey b{font-size:25px;font-weight:500}.journey p{margin:8px 0 0;font-size:17px}.journey>span{font-size:38px;color:#4dd7f5}.finance-split{display:grid;grid-template-columns:1.45fr 1fr;gap:23px;min-width:0}.stack{display:flex;flex-direction:column;gap:15px}.stack .panel{padding:19px}.stack .panel h3{font-size:21px}.stack .panel p{font-size:16px}.bars{display:flex;flex-direction:column;justify-content:space-evenly;gap:12px}.barrow{display:grid;grid-template-columns:245px 1fr 112px;gap:14px;align-items:center;font-size:16px}.barrow b{font-weight:500;text-align:right;color:#ccecf6}.track{height:14px;border-radius:8px;background:#ffffff0d;overflow:hidden}.track i{display:block;height:100%;border-radius:8px}.financial{width:100%;border-collapse:collapse;font-size:18px}.financial th{color:#59d6f1;font-size:17px;text-align:right;padding:13px 18px;background:#0d2947}.financial th:first-child{text-align:left}.financial td{padding:12px 18px;border-bottom:1px solid #ffffff16;text-align:right}.financial td:first-child{text-align:left;color:#bacee0}.financial .total td{background:#00b8e616;font-weight:600;border-top:2px solid #00b8e670}.heatmap{width:100%;border-collapse:separate;border-spacing:6px;margin:19px 0}.heatmap th{font-size:16px;color:#a6c4d6;font-weight:500;padding:10px}.heatmap td{font-size:27px;text-align:center;border-radius:12px;padding:25px 10px}.heatmap td:first-child{font-size:17px;text-align:left;white-space:nowrap}.chart{width:100%;display:block;max-height:300px}.legend{display:flex;gap:25px;justify-content:center;color:#b8cdda;font-size:14px;margin:7px 0}.legend span{display:flex;align-items:center;gap:8px}.legend i{height:8px;width:21px;display:inline-block;border-radius:5px}.month-base{display:grid;grid-template-columns:repeat(12,1fr);gap:9px}.month-base div{padding:9px;border:1px solid #ffffff22;border-radius:10px;text-align:center}.month-base span{display:block;font-size:11px;color:#9ab9ce}.month-base b{display:block;font-size:20px;font-weight:500;margin-top:3px}.price-panel{border:1px solid #67d2ec55;background:#0d2844;padding:28px;border-radius:19px;min-height:292px}.price-panel>span{font-size:11px;letter-spacing:1.6px;color:#84cee0}.price-panel>b{display:block;font-size:53px;font-weight:450;color:#52d6ef;margin:25px 0}.price-panel small{font-size:17px;font-weight:400;color:#b1cddb;display:block;margin-top:7px}.price-panel p{font-size:18px}.price-panel.accent{background:#0077b630}.cost-value{display:block;font-size:34px;color:#51d3ef;margin:22px 0}.lower{margin-top:0}.lower .panel p{font-size:17px}.sources p{display:flex;justify-content:space-between;align-items:center;font-size:17px;border-bottom:1px solid #ffffff1a;padding-bottom:12px;gap:15px}.sources p:last-child{border:0}.sources span{font-size:14px;color:#9dbace}.cover h1{font-size:70px;max-width:1100px;margin-top:166px;margin-bottom:20px;line-height:1.05}.cover .subtitle{font-size:23px;max-width:900px}.cover-logo{position:absolute;top:116px;left:44px}.cover-logo .logo{font-size:54px;letter-spacing:13px}.cover-line{font-size:15px;letter-spacing:3px;color:#a8c6d5;margin-top:26px}.cover-line span{color:#44d3ed;padding:0 23px}.cover-bottom{position:absolute;bottom:116px;left:44px;right:44px;display:flex;justify-content:space-between;align-items:end}.cover-bottom p{font-size:21px;max-width:760px}.cover-bottom>span{font-size:13px;letter-spacing:2px;color:#a9c6db;text-align:right;line-height:1.8}.infinity-art{position:absolute;width:650px;right:-92px;top:238px;color:#00b8e6;opacity:.09;transform:rotate(-20deg)}.infinity-art svg{width:100%}.closing h1{font-size:65px;margin-top:40px}.closing .subtitle{font-size:23px}.closing-mark{position:absolute;right:50px;top:105px;width:300px;color:#00b8e6;opacity:.15}.closing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:23px;margin-top:39px}.closing-grid .panel{min-height:190px}.closing-quote{margin-top:24px;padding:27px;border:1px solid #00b8e64d;background:#00b8e613;border-radius:17px;font-size:29px;line-height:1.35;color:#dcf6fb}
#gestao .screen{height:510px}.finance .metric{min-height:115px;padding:16px 20px}.finance .metric b{font-size:32px;margin-top:10px}.finance .chart{height:240px;max-height:240px}.finance .panel{padding:20px}.finance .heatmap td{padding:18px 10px;font-size:24px}.finance .heatmap td:first-child{font-size:17px}.finance .body{gap:16px}.finance .financial td{padding:10px 18px}.finance .stack .panel{padding:17px}.finance .month-base div{padding:7px}
`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>INOVA — Visão completa e viabilidade para investidores</title><meta name="author" content="INOVA"><style>${styles}</style></head><body>${slides
  .map(
    (s, i) => `
<section class="slide ${s.kind}" id="${s.id}"><header>${logo}<span class="header-label">${s.chapter}</span><span class="status">${s.status}</span></header><h1>${s.title}</h1><p class="subtitle">${s.subtitle}</p><div class="body">${s.body}</div><footer><span>INOVA · CUIDADO EM PERSPECTIVA</span><span>Telas com dados fictícios · valores financeiros hipotéticos · 09/10/2026</span><b>${String(i + 1).padStart(2, "0")} / ${slides.length}</b></footer></section>`,
  )
  .join("")}</body></html>`;
writeFileSync(resolve(directory, basename + ".html"), html, "utf8");
const outline = [
  "# INOVA — Visão completa e viabilidade",
  "",
  "Documento de apresentação para investidores · 09/10/2026",
  "",
  "As telas mostram a demonstração local. Pessoas, históricos, contratos, contatos e avaliações são fictícios. Os cenários financeiros são hipóteses, não receita realizada.",
  "",
  ...slides.flatMap((s, i) => [
    `## ${String(i + 1).padStart(2, "0")} · ${s.title.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")}`,
    s.subtitle,
    "",
  ]),
  "## Premissas financeiras",
  ...assumptions.notes.map((n) => "- " + n),
  "",
  `Ticket: ${money(ticket)}. Fixo: ${money(fixed)}. Contribuição: ${money(contribution, 2)}. Equilíbrio: ${breakEven} médicos.`,
  `Receita do exercício: ${money(yearRevenue)}. EBITDA recorrente do exercício: ${money(yearEbitda, 2)}. Necessidade máxima de caixa antes de aporte: ${money(peakNeed)}.`,
  "",
  "## Fontes",
  ...assumptions.sources.map((s) => `- [${s.title}](${s.url}) · consulta ${s.consulted}.`),
  "",
  "## Regerar",
  "`node scripts/capture-investor-presentation.mjs` — exige servidor local e Chrome CDP 9222.",
  "`node scripts/capture-investor-details.mjs` — capturas adicionais com Gemini, somente dados fictícios.",
  "`node scripts/generate-investor-overview.mjs` — gera HTML, PDF, cálculos, roteiro e validação.",
  "",
  "Nenhuma interface ou rota do sistema foi modificada para esta entrega.",
];
writeFileSync(resolve(directory, basename + "_roteiro.md"), outline.join("\n"), "utf8");

const browser = await presentationBrowser();
const { command, evaluate, pause } = browser;
try {
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const { frameTree } = await command("Page.getFrameTree");
  await command("Page.setDocumentContent", { frameId: frameTree.frame.id, html });
  await evaluate("Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode())])");
  await pause(250);
  const layout = await evaluate(`(()=>{
    return [...document.querySelectorAll('.slide')].map((s,i)=>{
      const r=s.getBoundingClientRect(),footer=s.querySelector('footer').getBoundingClientRect(),body=s.querySelector('.body').getBoundingClientRect();
      const outside=[...s.querySelectorAll('.body *')].filter(e=>{if(e.closest('.infinity-art'))return false;const b=e.getBoundingClientRect();return b.width>0&&(b.right>r.right+1||b.left<r.left-1||b.bottom>footer.top-6)}).map(e=>e.tagName+':'+(e.textContent??'').trim().slice(0,60));
      return {page:i+1,title:s.querySelector('h1').textContent,height:s.clientHeight,contentBottom:Math.round(body.bottom-r.top),footerTop:Math.round(footer.top-r.top),outside};
    });
  })()`);
  const failures = layout.filter((p) => p.outside.length);
  const validImages = await evaluate("[...document.images].every(i=>i.complete&&i.naturalWidth>0)");
  const validation = {
    date: "2026-10-09",
    pages: slides.length,
    images: [...usedImages],
    financials: {
      ticket,
      fixed,
      breakEven,
      contribution,
      yearRevenue,
      yearEbitda,
      peakNeed,
      requiredWithReserve,
    },
    validImages,
    layout,
  };
  writeFileSync(
    resolve(directory, basename + ".validation.json"),
    JSON.stringify(validation, null, 2),
  );
  if (failures.length)
    throw new Error(
      "Layout overflow: " +
        JSON.stringify(failures.map((p) => ({ page: p.page, outside: p.outside }))),
    );
  assert.equal(validImages, true);
  const result = await command("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    generateTaggedPDF: true,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
  });
  const pdf = Buffer.from(result.data, "base64");
  const count = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
  assert.equal(count, slides.length, "Unexpected PDF page count");
  writeFileSync(resolve(directory, basename + ".pdf"), pdf);
  mkdirSync(resolve("artifacts/investor-overview"), { recursive: true });
  for (const page of [1, 2, 9, 22, 33, 40, 42, 44, 45]) {
    await evaluate(`document.querySelectorAll('.slide')[${page - 1}].scrollIntoView()`);
    const preview = await command("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    writeFileSync(
      resolve("artifacts/investor-overview", String(page).padStart(2, "0") + ".png"),
      Buffer.from(preview.data, "base64"),
    );
  }
  console.log(
    JSON.stringify(
      {
        pdf: resolve(directory, basename + ".pdf"),
        pages: count,
        bytes: pdf.length,
        images: usedImages.size,
        layout: "PASS",
        financials: { ticket, fixed, breakEven, yearRevenue, yearEbitda, peakNeed },
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
