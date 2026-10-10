import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { presentationBrowser } from "./presentation-browser.mjs";
import { inovaInfinityPath } from "../src/data/inova-brand.ts";

const output = resolve("docs/entregaveis/instagram/INOVA_contexto_2026-10-10");
mkdirSync(output, { recursive: true });
const infinity = `<svg viewBox="0 0 160 80" fill="none" aria-hidden="true"><path d="${inovaInfinityPath}" stroke="currentColor" stroke-width="11" stroke-linecap="round"/></svg>`;
const logo = `<div class="logo" aria-label="INOVA">IN${infinity}VA</div>`;
const arrow = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 16h20M18 8l8 8-8 8"/></svg>`;
const icons = {
  document: `<path d="M8 3h13l7 7v25H8zM21 3v8h7M13 18h10M13 24h10M13 30h7"/>`,
  message: `<path d="M5 6h30v23H14l-9 7zM12 14h16M12 21h11"/>`,
  history: `<path d="M7 13a15 15 0 1 1-1 13M7 4v9h9M20 10v12l8 5"/>`,
  patient: `<circle cx="20" cy="12" r="7"/><path d="M7 36v-4c0-15 26-15 26 0v4"/>`,
  spark: `<path d="m20 4 4 12 12 4-12 4-4 12-4-12L4 20l12-4zM33 4v8M29 8h8"/>`,
  check: `<path d="m8 20 8 8L33 11"/><circle cx="20" cy="20" r="17"/>`,
};
const icon = (name) =>
  `<svg class="icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
function slide(number, theme, body) {
  return `<section class="slide ${theme}" id="slide-${number}"><header>${logo}<span class="series">CUIDADO EM PERSPECTIVA</span></header><main>${body}</main><footer><span>INOVA · Apresentação do produto</span><div class="pagination">${Array.from({ length: 6 }, (_, i) => `<i class="${i + 1 === number ? "selected" : ""}"></i>`).join("")}<b>${String(number).padStart(2, "0")} / 06</b></div></footer></section>`;
}
const graph = `<svg class="history-graph" viewBox="0 0 800 226" role="img" aria-label="Valores fictícios de LDL: 132, 128, 126, 121, 124 e 108 mg/dL."><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#00b8e6" stop-opacity=".20"/><stop offset="1" stop-color="#00b8e6" stop-opacity="0"/></linearGradient></defs><g stroke="#dfe9ef" stroke-dasharray="5 8"><path d="M25 40H775M25 100H775M25 160H775"/></g><path d="M25 40 175 63 325 75 475 104 625 86 775 180V198H25Z" fill="url(#area)"/><path d="M25 40 175 63 325 75 475 104 625 86 775 180" fill="none" stroke="#009bc4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><g fill="#009bc4">${[
  [25, 40],
  [175, 63],
  [325, 75],
  [475, 104],
  [625, 86],
  [775, 180],
]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`)
  .join(
    "",
  )}</g><g fill="#617589" font-size="19" font-family="DM Sans" text-anchor="middle">${["Mar/25", "Jun/25", "Nov/25", "Mar/26", "Jun/26", "Set/26"].map((label, i) => `<text x="${25 + i * 150}" y="223">${label}</text>`).join("")}</g></svg>`;

const slides = [
  slide(
    1,
    "dark cover",
    `<div class="eyebrow">PARA QUEM ACOMPANHA HISTÓRIAS, NÃO SÓ EXAMES.</div><h1>Um resultado<br>conta uma parte.<br><em>O histórico<br>conecta a história.</em></h1><p class="lead">Laudos, relatos e evolução.<br>Mais contexto para a consulta.</p><div class="cover-orbit"><div class="orbit o1"></div><div class="orbit o2"></div><div class="orbit o3"></div><div class="orbit-symbol">${infinity}</div><span class="orbit-tag t1">RESULTADOS</span><span class="orbit-tag t2">HISTÓRICO</span><span class="orbit-tag t3">PACIENTE</span></div><div class="swipe">Conheça o INOVA <span>${arrow}</span></div>`,
  ),
  slide(
    2,
    "light scattered",
    `<div class="eyebrow">ANTES DA CONSULTA</div><h1>O cuidado continua.<br><em>A informação<br>se espalha.</em></h1><p class="lead">Um laudo aqui. Um relato ali.<br>E o contexto precisa ser reconstruído.</p><div class="fragment f1">${icon("document")}<div><small>ARQUIVO RECEBIDO</small><strong>Laudo do laboratório.pdf</strong><span>Um documento para conferir.</span></div><b>PDF</b></div><div class="fragment f2">${icon("message")}<div><small>RELATO DO PACIENTE</small><strong>“Doutor, também queria falar…”</strong><span>Sintomas, medicamentos e dúvidas.</span></div></div><div class="fragment f3">${icon("history")}<div><small>COLETAS ANTERIORES</small><strong>O que mudou desde o último exame?</strong><span>Resultados de diferentes momentos.</span></div></div><div class="insight">A proposta do INOVA:<br><strong>reunir as informações para revisar.</strong></div>`,
  ),
  slide(
    3,
    "dark context",
    `<div class="eyebrow">DO VALOR AO CONTEXTO</div><h1>O LDL é <em>108 mg/dL.</em><br>E a história?</h1><p class="lead">A evolução ajuda a formular perguntas.<br>A interpretação depende do contexto clínico.</p><div class="chart-card"><div class="chart-head"><div><small>PERFIL FICTÍCIO · MARIANA OLIVEIRA</small><h2>Colesterol LDL</h2></div><span class="badge">6 coletas</span></div><div class="value"><strong>108</strong><span>mg/dL<br><small>Set/26 · dado fictício</small></span></div>${graph}<div class="chart-questions"><span>${icon("history")} O que mudou?</span><span>${icon("patient")} Qual é o histórico?</span></div></div><p class="under-note">Um valor isolado não define a meta individual.<br>O médico confere o laudo, o histórico e as condições do paciente.</p><div class="micro">Exemplo demonstrativo. Não representa diagnóstico ou orientação de tratamento.</div>`,
  ),
  slide(
    4,
    "light journey",
    `<div class="eyebrow">UMA JORNADA CONECTADA</div><h1>O paciente prepara.<br>O médico confere.<br><em>O cuidado continua.</em></h1><div class="journey-list"><article><span class="step">01</span><div>${icon("message")}<h2>Antes da consulta</h2><p>O paciente reúne dúvidas, relatos<br>e documentos para enviar ao médico.</p></div></article><article><span class="step">02</span><div>${icon("document")}<h2>Na revisão</h2><p>O médico consulta os envios,<br>os laudos e a evolução dos resultados.</p></div></article><article><span class="step">03</span><div>${icon("history")}<h2>No acompanhamento</h2><p>Pedidos, orientações e próximos passos<br>ajudam a dar continuidade à jornada.</p></div></article></div><div class="bottom-statement">Duas perspectivas.<br><strong>Uma história de cuidado.</strong></div>`,
  ),
  slide(
    5,
    "dark intelligence",
    `<div class="eyebrow">INTELIGÊNCIA COMO APOIO</div><h1>A IA organiza.<br><em>O médico decide.</em></h1><p class="lead">Um resumo para apoiar a preparação.<br>As fontes e a revisão continuam essenciais.</p><div class="ai-card"><div class="ai-head">${icon("spark")}<div><h2>Prepare seu dia com IA</h2><small>ASSISTENTE PRÉ-CONSULTA · DEMONSTRAÇÃO</small></div></div><div class="ai-row"><span>01</span><div><h3>Envios disponíveis</h3><p>Relatos e informações registrados<br>para a preparação da consulta.</p></div></div><div class="ai-row"><span>02</span><div><h3>Pontos para conferir</h3><p>Questões e lacunas para orientar<br>a revisão das informações.</p></div></div><div class="ai-row"><span>03</span><div><h3>Conferência das fontes</h3><p>O profissional revisa os textos<br>e o resumo antes de utilizá-lo.</p></div></div></div><div class="ai-note">${icon("check")}<span>A decisão clínica permanece com o médico.<br>A IA pode errar e não estabelece diagnóstico.</span></div>`,
  ),
  slide(
    6,
    "dark closing",
    `<div class="eyebrow">CONHEÇA O INOVA</div><h1>Mais contexto.<br>Mais continuidade.<br><em>Mais cuidado.</em></h1><p class="lead">Uma plataforma para conectar<br>preparação, revisão e acompanhamento.</p><div class="closing-symbol">${infinity}</div><div class="cta"><div><small>PARA MÉDICOS</small><h2>Quer conhecer na prática?</h2><p>Peça uma demonstração.</p></div><span>${arrow}</span></div><p class="closing-note">Conheça a jornada no ambiente demonstrativo.<br>Recursos e dados apresentados nesta sequência são ilustrativos.</p>`,
  ),
];
const css = `
@import url('./assets/fonts/manrope.css');@import url('./assets/fonts/dm-sans.css');
@page{size:1080px 1350px;margin:0}*{box-sizing:border-box}html,body{margin:0}body{background:#dce6ed;font-family:'DM Sans',Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}svg{display:block}h1,h2,h3,p{margin:0}.slide{width:1080px;height:1350px;padding:72px;position:relative;overflow:hidden;break-after:page}.slide:last-child{break-after:auto}.dark{background:radial-gradient(ellipse at 97% 95%,#06364c 0,transparent 48%),linear-gradient(135deg,#041431,#020b25);color:#fff}.light{background:radial-gradient(ellipse at 0 90%,#def4f8 0,transparent 55%),#f5f8fb;color:#0b213c}header{height:100px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #94bbd632;position:relative;z-index:2}.logo{display:flex;align-items:center;font-family:'Manrope',sans-serif;font-size:46px;font-weight:400;letter-spacing:7px;gap:4px;line-height:1}.logo svg{color:#00b8e6;width:83px;height:44px}.series{font-size:16px;letter-spacing:2.2px;font-weight:600;line-height:1.7;margin-top:13px;color:#9cb7cd}.light .series{color:#47768e}main{position:relative;z-index:1;padding-top:47px}h1{font-family:'Manrope',sans-serif;font-weight:700;font-size:67px;line-height:1.16;letter-spacing:-2.9px}em{font-style:normal;color:#27cef1}.light em{color:#007a9e}.eyebrow{color:#59dcf5;font-size:19px;line-height:1.55;letter-spacing:2.2px;font-weight:600;margin-bottom:26px}.light .eyebrow{color:#007792}.lead{font-size:29px;line-height:1.48;color:#aec8dc;margin-top:28px}.light .lead{color:#587084}footer{position:absolute;left:72px;right:72px;bottom:43px;border-top:1px solid #96b9d22b;padding-top:25px;display:flex;justify-content:space-between;align-items:center;font-size:17px;color:#9bb5ca}.light footer{color:#5f798b;border-top-color:#ccdfe8}.pagination{display:flex;gap:9px;align-items:center}.pagination i{height:6px;width:6px;background:#839eb95c;border-radius:50%}.pagination i.selected{background:#00b8e6;width:23px;border-radius:20px}.pagination b{font-size:16px;font-weight:500;margin-left:16px}.icon{width:45px;height:45px;flex-shrink:0;color:#009ec5}.cover h1{font-size:72px}.cover .eyebrow{font-size:17px}.cover-orbit{height:328px;position:relative;margin-top:25px}.orbit{position:absolute;border:1px solid #3b86a147;border-radius:50%;left:50%;top:49%;transform:translate(-50%,-50%)}.o1{width:400px;height:240px;transform:translate(-50%,-50%) rotate(-19deg)}.o2{width:620px;height:235px;transform:translate(-50%,-50%) rotate(14deg)}.o3{width:845px;height:255px;transform:translate(-50%,-50%) rotate(-9deg)}.orbit-symbol{position:absolute;width:272px;left:50%;top:50%;transform:translate(-50%,-50%);color:#00b8e6;filter:drop-shadow(0 0 28px #00b8e633)}.orbit-tag{position:absolute;border:1px solid #32799191;border-radius:30px;background:#072039;padding:13px 23px;letter-spacing:1.8px;font-size:15px;color:#9cdfed}.t1{left:7px;top:79px}.t2{right:5px;top:175px}.t3{left:195px;bottom:5px}.swipe{font-size:24px;display:flex;gap:24px;align-items:center;margin-top:12px;color:#63def7}.swipe span{width:40px;height:40px;border:1px solid #57d6ef88;border-radius:50%;padding:7px}.fragment{display:flex;gap:24px;align-items:center;padding:31px 28px;border:1px solid #d8e5ed;border-radius:23px;box-shadow:0 14px 40px #1737520b;background:#fff;position:relative;width:872px}.fragment small{display:block;color:#7593a5;font-size:16px;letter-spacing:1.6px;margin-bottom:10px}.fragment strong{display:block;font-size:28px;font-weight:600;color:#162f49}.fragment span{display:block;font-size:23px;color:#6a8091;margin-top:8px}.fragment>b{margin-left:auto;border:1px solid #dce8ef;border-radius:8px;color:#567b8f;padding:10px;font-size:18px}.f1{margin-top:54px;transform:rotate(-2deg);margin-left:4px}.f2{margin-top:27px;transform:rotate(1.5deg);margin-left:43px}.f3{margin-top:27px;transform:rotate(-1deg);margin-left:8px}.insight{font-size:28px;line-height:1.5;margin-top:57px;color:#587286}.insight strong{color:#007f9f;font-weight:600}.context h1{font-size:66px}.chart-card{margin-top:38px;padding:34px 38px 28px;background:#fff;border-radius:26px;color:#122b43;box-shadow:0 25px 70px #0002}.chart-head{display:flex;justify-content:space-between;align-items:center}.chart-head small{color:#6a8091;font-size:17px;letter-spacing:1.4px}.chart-head h2{font-size:28px;font-weight:600;margin-top:15px}.badge{color:#007b9e;background:#e7f5fa;padding:10px 17px;border-radius:30px;font-size:18px}.value{display:flex;align-items:center;gap:24px;margin-top:27px}.value strong{font-family:'Manrope';font-size:91px;line-height:1.1;letter-spacing:-4px;font-weight:600}.value>span{color:#647c8f;font-size:25px;line-height:1.7}.value small{font-size:20px}.history-graph{margin-top:27px;height:235px;width:100%;overflow:visible}.chart-questions{display:flex;gap:30px;border-top:1px solid #e3edf3;margin-top:25px;padding-top:25px;font-size:22px;color:#477185}.chart-questions span{display:flex;align-items:center;gap:11px}.chart-questions .icon{width:28px;height:28px}.under-note{font-size:25px;line-height:1.45;color:#bad1df;margin-top:32px}.micro{color:#81a4bb;font-size:18px;line-height:1.45;margin-top:17px;max-width:900px}.journey h1{font-size:62px}.journey-list{margin-top:49px}.journey-list article{display:flex;align-items:flex-start;gap:32px;border-bottom:1px solid #cddfe7;padding:29px 0 31px}.journey-list article:first-child{padding-top:0}.journey-list article:last-child{border-bottom:0}.step{font-family:'Manrope';font-size:37px;line-height:1;color:#007d9e;background:#e0f1f5;border-radius:20px;width:81px;height:81px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.journey-list article>div{position:relative;padding-right:5px;flex:1}.journey-list .icon{position:absolute;right:0;top:0;width:33px;height:33px}.journey-list h2{font-size:31px;font-weight:600;line-height:1.25}.journey-list p{font-size:26px;color:#61798c;line-height:1.42;margin-top:12px}.bottom-statement{font-size:32px;line-height:1.4;border-left:3px solid #00b8e6;padding-left:27px;margin-top:33px;color:#5c7489}.bottom-statement strong{color:#007b9b;font-weight:600}.intelligence h1{font-size:78px}.ai-card{border:1px solid #215472;background:linear-gradient(130deg,#0a2745,#07182f);border-radius:28px;padding:35px 36px;margin-top:43px}.ai-head{display:flex;gap:20px;align-items:center;padding-bottom:29px;border-bottom:1px solid #6388a438}.ai-head .icon{color:#38d4f4}.ai-head h2{font-size:29px;font-weight:600}.ai-head small{display:block;letter-spacing:1.4px;font-size:16px;color:#78a3ba;margin-top:10px}.ai-row{display:flex;gap:24px;padding-top:25px}.ai-row>span{color:#3fd9f4;font-size:19px;width:43px;height:43px;background:#10405c;border-radius:50%;display:flex;justify-content:center;align-items:center;flex-shrink:0}.ai-row h3{font-size:27px;font-weight:600}.ai-row p{font-size:25px;color:#a5c2d7;line-height:1.4;margin-top:8px}.ai-note{display:flex;gap:20px;align-items:center;margin-top:32px;font-size:24px;line-height:1.5;color:#c1d6e5}.ai-note .icon{width:33px;height:33px;color:#32cdeb}.closing h1{font-size:78px}.closing .lead{font-size:31px}.closing-symbol{width:420px;height:258px;display:flex;align-items:center;margin:30px auto 20px;color:#00b8e6;filter:drop-shadow(0 0 50px #00b8e62e)}.cta{border:1px solid #00b8e680;padding:34px;border-radius:23px;background:#00b8e610;display:flex;justify-content:space-between;align-items:center}.cta small{color:#61dff6;letter-spacing:2px;font-size:17px}.cta h2{font-size:31px;font-weight:600;margin-top:13px}.cta p{font-size:29px;color:#b8d5e3;margin-top:10px}.cta>span{width:68px;height:68px;background:#00b8e6;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#03213a}.cta svg{width:38px}.closing-note{font-size:20px;line-height:1.5;color:#90aebe;margin-top:24px}body.export .slide{display:none}body.export .slide.active{display:block}
.scattered h1{font-size:61px}.scattered .lead{font-size:27px}.scattered .fragment{padding:24px 26px}.scattered .fragment strong{font-size:26px}.scattered .fragment span{font-size:21px;margin-top:6px}.scattered .f1{margin-top:42px}.scattered .f2,.scattered .f3{margin-top:20px}.scattered .insight{margin-top:30px;font-size:27px}
.context .lead{font-size:27px}.context .chart-card{padding:28px 36px 24px;margin-top:30px}.context .history-graph{height:190px;margin-top:20px}.context .value strong{font-size:80px}.context .value{margin-top:20px}.context .under-note{font-size:23px;margin-top:26px}.context .micro{font-size:17px;margin-top:13px}
.intelligence h1{font-size:74px}.intelligence .ai-card{padding:30px 35px;margin-top:34px}.intelligence .ai-row{padding-top:21px}.intelligence .ai-row p{font-size:23px}.intelligence .ai-note{font-size:22px;margin-top:25px}
.closing .closing-symbol{height:230px;margin-top:22px}
@media print{body.export .slide{display:block}.slide{break-after:page}}
`;
writeFileSync(
  join(output, "carrossel-editavel.html"),
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>INOVA · O histórico conecta a história</title><style>${css}</style></head><body>${slides.join("\n")}</body></html>`,
);

const videoScenes = [
  {
    eyebrow: "CUIDADO EM PERSPECTIVA",
    title: "Um resultado<br>conta uma parte.",
    highlight: "O histórico<br>conecta a história.",
    subtitle: "Mais contexto para a consulta.",
    visual: `<div class="film-symbol">${infinity}</div>`,
  },
  {
    eyebrow: "UMA JORNADA CONECTADA",
    title: "O paciente prepara.<br>O médico confere.",
    highlight: "O cuidado continua.",
    subtitle: "Relatos, laudos e evolução<br>na jornada demonstrativa do INOVA.",
    visual: `<div class="film-steps"><span>${icon("message")} PREPARAR</span><span>${icon("document")} REVISAR</span><span>${icon("history")} ACOMPANHAR</span></div>`,
  },
  {
    eyebrow: "INTELIGÊNCIA COMO APOIO",
    title: "A IA organiza.",
    highlight: "O médico decide.",
    subtitle: "Resumo pré-consulta para apoiar<br>a preparação do profissional.",
    visual: `<div class="film-ai">${icon("spark")}<h2>Mais clareza para revisar.</h2><p>A IA pode errar.<br>A decisão clínica permanece com o médico.</p></div>`,
  },
  {
    eyebrow: "CONHEÇA O INOVA",
    title: "Mais contexto.<br>Mais continuidade.",
    highlight: "Mais cuidado.",
    subtitle: "Quer conhecer na prática?<br>Peça uma demonstração.",
    visual: `<div class="film-symbol">${infinity}</div>`,
  },
];
const filmCss = `@import url('./assets/fonts/manrope.css');@import url('./assets/fonts/dm-sans.css');*{box-sizing:border-box}html,body{margin:0;overflow:hidden}body{width:1080px;height:1920px;background:#03102b;color:white;font-family:'DM Sans',Arial,sans-serif}#film{width:1080px;height:1920px;position:relative;padding:205px 86px 195px;background:radial-gradient(ellipse at 100% 85%,#074154 0,transparent 55%),linear-gradient(140deg,#061733,#020b24);overflow:hidden}.logo{display:flex;align-items:center;gap:5px;font-family:'Manrope';font-size:56px;letter-spacing:8px}.logo svg{width:101px;height:53px;color:#00b8e6}header{border-bottom:1px solid #7eb8d03b;padding-bottom:50px}.scene{position:absolute;top:392px;left:86px;right:86px;opacity:0}.scene .eyebrow{font-size:22px;letter-spacing:3px;color:#64def5;margin-bottom:49px}.scene h1{font-family:'Manrope';font-size:79px;letter-spacing:-3px;line-height:1.2;margin:0;font-weight:700}.scene h1 em{font-style:normal;color:#20ccf1;display:block;margin-top:13px}.scene .subtitle{font-size:34px;line-height:1.5;color:#b6cbdc;margin-top:40px}.film-symbol{width:480px;margin:100px auto 0;color:#00b8e6;filter:drop-shadow(0 0 45px #00b8e62d)}.film-steps{margin-top:95px;display:flex;gap:20px;flex-direction:column}.film-steps>span{display:flex;align-items:center;gap:32px;border:1px solid #3c6a85;background:#0c2c47;padding:30px;border-radius:20px;font-size:24px;letter-spacing:2px}.icon{width:51px;height:51px;color:#37d2ee}.film-ai{border:1px solid #306b88;background:#0b2843;border-radius:25px;margin-top:100px;padding:45px}.film-ai h2{font-size:35px;margin:28px 0 15px;font-weight:500}.film-ai p{color:#aec9da;font-size:29px;line-height:1.5;margin:0}footer{position:absolute;left:86px;right:86px;bottom:208px;border-top:1px solid #74adca4b;padding-top:31px;display:flex;align-items:center;justify-content:space-between;font-size:21px;color:#8aafc5}.progress{position:absolute;left:86px;right:86px;bottom:177px;height:3px;background:#164660}.progress i{display:block;height:100%;background:#00b8e6;transform-origin:left;transform:scaleX(0)}.film-watermark{position:absolute;width:1150px;right:-675px;top:1130px;opacity:.04;color:#39d5ef;transform:rotate(-25deg)}`;
writeFileSync(
  join(output, "video-editavel.html"),
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>INOVA · Vídeo curto</title><style>${filmCss}</style></head><body><div id="film"><header>${logo}</header><div class="film-watermark">${infinity}</div>${videoScenes.map((scene, i) => `<section class="scene" data-scene="${i}"><div class="eyebrow">${scene.eyebrow}</div><h1>${scene.title}<em>${scene.highlight}</em></h1><p class="subtitle">${scene.subtitle}</p>${scene.visual}</section>`).join("")}<footer><span>INOVA · Cuidado em perspectiva</span><span>Apresentação do produto</span></footer><div class="progress"><i></i></div></div><script>window.renderFrame=function(t){const duration=24;document.querySelectorAll('.scene').forEach((scene,i)=>{const local=t-i*6;const fadeIn=Math.min(1,Math.max(0,local/.5));const fadeOut=i===3?1:Math.min(1,Math.max(0,(6-local)/.45));scene.style.opacity=local>=0&&local<6?fadeIn*fadeOut:0;scene.style.transform='translateY('+(1-fadeIn)*26+'px)';});document.querySelector('.progress i').style.transform='scaleX('+Math.min(1,t/duration)+')';};window.renderFrame(0.8);</script></body></html>`,
);

const browser = await presentationBrowser();
try {
  await browser.command("Emulation.setDeviceMetricsOverride", {
    width: 1080,
    height: 1350,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await browser.command("Page.navigate", {
    url: pathToFileURL(join(output, "carrossel-editavel.html")).href,
  });
  await browser.wait("document.querySelectorAll('.slide').length===6");
  await browser.evaluate("document.fonts.ready");
  const loaded = await browser.evaluate(
    "document.fonts.check('700 72px Manrope') && document.fonts.check('400 29px \"DM Sans\"')",
  );
  if (!loaded) throw new Error("Brand fonts did not load.");
  await browser.evaluate("document.body.classList.add('export')");
  const validation = [];
  for (let i = 1; i <= 6; i++) {
    await browser.evaluate(
      `document.querySelectorAll('.slide').forEach(s=>s.classList.remove('active'));document.querySelector('#slide-${i}').classList.add('active')`,
    );
    await browser.pause(80);
    const checks = await browser.evaluate(
      `(()=>{const s=document.querySelector('.slide.active'),footer=s.querySelector('footer').getBoundingClientRect();return {slide:${i},width:s.offsetWidth,height:s.offsetHeight,overflow:s.scrollHeight>s.clientHeight||s.scrollWidth>s.clientWidth,contentBottom:s.querySelector('main').getBoundingClientRect().bottom,footerTop:footer.top};})()`,
    );
    if (checks.overflow || checks.contentBottom > checks.footerTop - 12)
      throw new Error("Slide overflow: " + JSON.stringify(checks));
    validation.push(checks);
    const image = await browser.command("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 1080, height: 1350, scale: 1 },
    });
    writeFileSync(
      join(output, `${String(i).padStart(2, "0")}-INOVA.png`),
      Buffer.from(image.data, "base64"),
    );
  }
  await browser.evaluate("document.body.classList.remove('export')");
  const pdf = await browser.command("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
  });
  writeFileSync(join(output, "INOVA-carrossel-contexto.pdf"), Buffer.from(pdf.data, "base64"));
  const contact = `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:#04132e}body{padding:32px;width:1200px;font-family:Arial,sans-serif;color:#fff}header{display:flex;justify-content:space-between;font-size:20px;letter-spacing:2px;padding:0 0 25px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}img{width:100%;display:block;border-radius:8px;border:1px solid #4fb0c638}small{display:block;font-size:13px;color:#87b0c8;padding-top:11px}</style></head><body><header><span>INOVA · CUIDADO EM PERSPECTIVA</span><span>CARROSSEL · 6 ARTES</span></header><main>${slides.map((_, i) => `<div><img src="${String(i + 1).padStart(2, "0")}-INOVA.png"><small>0${i + 1} / 06</small></div>`).join("")}</main></body></html>`;
  writeFileSync(join(output, "previa.html"), contact);
  await browser.command("Emulation.setDeviceMetricsOverride", {
    width: 1200,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await browser.command("Page.navigate", { url: pathToFileURL(join(output, "previa.html")).href });
  await browser.wait("document.images.length===6");
  await browser.evaluate("Promise.all([...document.images].map(image=>image.decode()))");
  const size = await browser.evaluate(
    "({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})",
  );
  const preview = await browser.command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 },
  });
  writeFileSync(join(output, "previa-carrossel.png"), Buffer.from(preview.data, "base64"));
  writeFileSync(
    join(output, "validation.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        brandFontsLoaded: loaded,
        slides: validation,
        examples: "Fictional demonstration data; no diagnosis or prescription.",
      },
      null,
      2,
    ),
  );
  console.log("Rendered six 1080x1350 PNGs, PDF, editable HTML and overview.");
} finally {
  await browser.close();
}

const caption = `# INOVA — carrossel: o histórico conecta a história

## Legenda sugerida

Um resultado conta uma parte. O histórico conecta a história.

Antes da consulta, laudos, relatos e dúvidas podem chegar por caminhos diferentes. A proposta do INOVA é reunir essas informações para apoiar a preparação do paciente, a revisão médica e o acompanhamento.

Na demonstração, você acompanha uma jornada: o paciente envia informações, o médico confere os documentos e os resultados podem ser vistos ao longo do tempo. A IA auxilia na organização, com revisão pelo profissional.

Quer conhecer o INOVA na prática? Envie uma mensagem para pedir uma demonstração.

Os exemplos e dados são fictícios. A IA pode errar e não estabelece diagnóstico. A interpretação e a decisão clínica permanecem com o médico.

#INOVA #SaudeDigital #TecnologiaNaSaude #AcompanhamentoMedico

## Arquivos

- Carrossel: publicar as imagens 01-INOVA.png a 06-INOVA.png, nessa ordem. Todas têm 1080 × 1350 px.
- PDF: revisão da sequência; os arquivos PNG são as artes para o carrossel.
- Prévia: previa-carrossel.png apresenta as seis artes juntas.
- HTMLs e fontes: arquivos editáveis, locais e independentes do sistema.
- Vídeo: versão vertical de 24 segundos, sem áudio, com animação e texto na tela. A narração abaixo é opcional.

## Narração sugerida para o vídeo

0–6 s: Um resultado conta uma parte. O histórico conecta a história.

6–12 s: O paciente prepara. O médico confere. O cuidado continua.

12–18 s: A inteligência artificial organiza as informações. O médico revisa e decide.

18–24 s: INOVA. Mais contexto, mais continuidade, mais cuidado. Peça uma demonstração.

## Direção visual e limites

Identidade baseada no logo com infinito já usado no projeto e na apresentação aprovada. Azul profundo, ciano #00B8E6, azul #0077B6 e branco; Manrope e DM Sans. A composição é original, inspirada no formato editorial enviado pelo usuário.

Material para apresentar o produto demonstrativo. Não apresenta métricas comerciais, certificações, garantia de conformidade, diagnóstico, prescrição ou resultados clínicos prometidos. Não foi publicado em nenhuma rede social. O sistema não foi alterado para gerar estas peças.
`;
writeFileSync(join(output, "legenda-e-roteiro.md"), caption);

// Export metadata also allows the animation to be reproduced without changing the app.
writeFileSync(
  join(output, "video-spec.json"),
  JSON.stringify(
    { width: 1080, height: 1920, seconds: 24, fps: 24, sceneSeconds: 6, audio: false },
    null,
    2,
  ),
);
// Keep the generated deliverables deterministic; filenames do not depend on machine paths.
const fontsExist = readFileSync(join(output, "assets/fonts/manrope.css"), "utf8").length > 0;
if (!fontsExist) throw new Error("Missing brand fonts.");
