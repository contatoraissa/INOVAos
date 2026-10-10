import { mkdirSync, writeFileSync, cpSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { presentationBrowser } from "./presentation-browser.mjs";
import { inovaInfinityPath, inovaLogoCyan } from "../src/data/inova-brand.ts";

const output = resolve("docs/entregaveis/instagram/INOVA_posts_fixos_2026-10-10");
mkdirSync(join(output, "assets"), { recursive: true });
cpSync(
  resolve("docs/entregaveis/instagram/INOVA_contexto_2026-10-10/assets/fonts"),
  join(output, "assets/fonts"),
  { recursive: true },
);
const infinity = `<svg viewBox="0 0 160 80" fill="none" aria-hidden="true"><path d="${inovaInfinityPath}" stroke="currentColor" stroke-width="11" stroke-linecap="round"/></svg>`;
const logo = `<div class="logo" aria-label="INOVA">IN${infinity}VA</div>`;
const arrow = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 16h21M18 8l8 8-8 8"/></svg>`;
const icons = {
  doctor: `<path d="M9 4v9a8 8 0 0 0 16 0V4M6 4h6M22 4h6M17 21v6a9 9 0 0 0 18 0v-3"/><circle cx="35" cy="20" r="4"/>`,
  patient: `<circle cx="20" cy="11" r="7"/><path d="M7 35v-4c0-15 26-15 26 0v4"/>`,
  document: `<path d="M8 3h14l7 7v25H8zM22 3v8h7M13 18h11M13 25h11"/>`,
  message: `<path d="M4 6h31v23H14l-10 7zM11 14h17M11 21h12"/>`,
  history: `<path d="M7 13a15 15 0 1 1-1 13M7 4v9h9M20 10v11l8 5"/>`,
  spark: `<path d="m20 4 4 12 12 4-12 4-4 12-4-12L4 20l12-4zM33 4v8M29 8h8"/>`,
  check: `<circle cx="20" cy="20" r="16"/><path d="m11 20 6 6 12-13"/>`,
  calendar: `<rect x="5" y="8" width="30" height="28" rx="4"/><path d="M12 3v10M28 3v10M5 18h30M12 25h4M23 25h4M12 31h4"/>`,
};
const icon = (key) =>
  `<svg class="icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
const list = (items) =>
  `<div class="feature-list">${items.map(([key, title, text]) => `<article>${icon(key)}<div><h2>${title}</h2><p>${text}</p></div></article>`).join("")}</div>`;
const step = (number, title, text) =>
  `<article class="step"><span>${number}</span><div><h2>${title}</h2><p>${text}</p></div></article>`;
const note = (text) => `<p class="note">${text}</p>`;
const footerCta = (text = "Arraste para conhecer") =>
  `<div class="swipe">${text}<span>${arrow}</span></div>`;
const card = (role, title, description, key) =>
  `<article class="role-card"><span class="role-icon">${icon(key)}</span><div><small>${role}</small><h2>${title}</h2><p>${description}</p></div></article>`;
const slides = (post, pages) =>
  pages
    .map(
      (page, i) =>
        `<section class="slide ${page.light ? "light" : "dark"} ${i === 0 ? "cover" : ""}" id="slide-${i + 1}"><header>${logo}<div class="post-label"><span>0${post}</span><small>${["CONHEÇA", "PROPÓSITO", "NA PRÁTICA"][post - 1]}</small></div></header><main><p class="eyebrow">${page.eyebrow}</p><h1>${page.title}</h1>${page.lead ? `<p class="lead">${page.lead}</p>` : ""}${page.body}</main><footer><span>INOVA · Cuidado em perspectiva</span><div class="counter">${Array.from({ length: pages.length }, (_, index) => `<i class="${index === i ? "active" : ""}"></i>`).join("")}<b>${String(i + 1).padStart(2, "0")} / ${String(pages.length).padStart(2, "0")}</b></div></footer></section>`,
    )
    .join("\n");

const posts = [
  {
    id: "post-01-conheca-o-inova",
    title: "O que é o INOVA: médico e paciente",
    pages: [
      {
        eyebrow: "INOVA MÉDICO + INOVA PACIENTE",
        title: "Uma história<br>de saúde.<br><em>Duas perspectivas.</em>",
        lead: "Um espaço para quem cuida.<br>Outro para quem participa do cuidado.",
        body: `<div class="role-pair">${card("INOVA MÉDICO", "Revisar com contexto", "Envios, documentos e evolução.", "doctor")}${card("INOVA PACIENTE", "Participar do cuidado", "Preparação e acompanhamento.", "patient")}</div>${footerCta()}`,
      },
      {
        light: true,
        eyebrow: "INOVA MÉDICO",
        title: "Seu espaço para<br><em>conectar as<br>informações.</em>",
        lead: "Uma plataforma para apoiar<br>a revisão e o acompanhamento médico.",
        body:
          list([
            [
              "document",
              "Laudos e resultados",
              "Consulte documentos e valores<br>registrados no prontuário.",
            ],
            [
              "history",
              "Histórico e evolução",
              "Veja o que mudou entre coletas<br>e confira o contexto do paciente.",
            ],
            [
              "message",
              "Preparação da consulta",
              "Reúna relatos, dúvidas e envios<br>antes de conversar com o paciente.",
            ],
          ]) + note("O médico confere as informações<br>e mantém a decisão clínica."),
      },
      {
        light: true,
        eyebrow: "INOVA PACIENTE",
        title: "Sua saúde.<br><em>Sua participação.</em>",
        lead: "Um espaço para se preparar<br>e acompanhar a própria jornada.",
        body:
          list([
            [
              "message",
              "Prepare a conversa",
              "Registre dúvidas, sintomas<br>e medicamentos para a consulta.",
            ],
            [
              "document",
              "Envie seus documentos",
              "Compartilhe laudos e informações<br>para a revisão do médico.",
            ],
            [
              "calendar",
              "Acompanhe os próximos passos",
              "Confira pedidos, orientações<br>e eventos da sua jornada.",
            ],
          ]) + note("Informações disponíveis para você,<br>com os dados liberados pelo médico."),
      },
      {
        eyebrow: "A PROPOSTA DO INOVA",
        title: "Preparar.<br>Conferir.<br><em>Acompanhar.</em>",
        lead: "Conectar paciente e médico<br>com mais contexto na jornada.",
        body: `<div class="connection"><span>${icon("patient")} PACIENTE</span><div>${infinity}</div><span>${icon("doctor")} MÉDICO</span></div><div class="cta"><h2>Conheça as duas perspectivas.</h2><p>Envie <strong>INOVA</strong> por mensagem<br>para pedir uma demonstração.</p>${arrow}</div>${note("As funcionalidades apresentadas fazem parte<br>da jornada demonstrativa do produto.")}`,
      },
    ],
    caption: `Uma história de saúde. Duas perspectivas.

O INOVA é uma plataforma que conecta a preparação do paciente, a revisão médica e o acompanhamento.

No INOVA Médico, o profissional consulta envios, documentos, resultados e histórico para revisar as informações com contexto.

No INOVA Paciente, a pessoa prepara dúvidas e relatos, envia documentos e acompanha os dados e orientações disponíveis para sua jornada.

São dois espaços com uma proposta em comum: conectar as informações que ajudam a preparar a conversa e dar continuidade ao cuidado.

Quer conhecer? Envie INOVA por mensagem para pedir uma demonstração.

Esta publicação apresenta a jornada demonstrativa do produto. O INOVA apoia a organização das informações; a interpretação e a decisão clínica permanecem com o médico.

#INOVA #SaudeDigital #TecnologiaNaSaude #CuidadoEmPerspectiva`,
  },
  {
    id: "post-02-por-que-o-inova",
    title: "A necessidade que inspira o INOVA",
    pages: [
      {
        eyebrow: "POR QUE O INOVA?",
        title: "O cuidado<br>continua.<br><em>A informação<br>se espalha.</em>",
        lead: "Laudos, relatos e dúvidas<br>nem sempre chegam juntos à consulta.",
        body: `<div class="fragments"><div>${icon("document")}<span>UM PDF NO E-MAIL</span></div><div>${icon("message")}<span>UM RELATO NA MENSAGEM</span></div><div>${icon("history")}<span>UM EXAME PARA COMPARAR</span></div></div>${footerCta("Entenda de onde veio a ideia")}`,
      },
      {
        light: true,
        eyebrow: "A NECESSIDADE",
        title: "Reunir as peças<br><em>também faz parte<br>do trabalho.</em>",
        lead: "Quando a informação chega por caminhos<br>diferentes, reconstruir o contexto exige atenção.",
        body: `<div class="question-stack"><article><span>01</span><h2>Onde está o laudo anterior?</h2></article><article><span>02</span><h2>O paciente já enviou suas dúvidas?</h2></article><article><span>03</span><h2>O que mudou desde a última coleta?</h2></article></div>${note("O problema que o INOVA se propõe a resolver:<br><strong>informação fragmentada na jornada de cuidado.</strong>")}`,
      },
      {
        eyebrow: "FOI DESSA NECESSIDADE QUE VEIO A PROPOSTA",
        title: "Conectar o que<br><em>ficava separado.</em>",
        lead: "Uma história que pode ser revisada<br>antes, durante e depois da consulta.",
        body: `<div class="steps">${step("01", "A preparação", "Relatos, dúvidas e documentos<br>enviados pelo paciente.")}${step("02", "A revisão", "Laudos, valores e histórico<br>consultados pelo médico.")}${step("03", "A continuidade", "Pedidos, orientações e próximos passos<br>na jornada demonstrativa.")}</div>${note("Essa é a proposta do INOVA:<br>organizar a informação para apoiar o acompanhamento.")}`,
      },
      {
        eyebrow: "CUIDADO EM PERSPECTIVA",
        title: "Um documento<br>é parte da história.<br><em>O contexto<br>conecta as partes.</em>",
        body: `<div class="principles"><span>${icon("document")} RESULTADOS</span><span>${icon("history")} HISTÓRICO</span><span>${icon("patient")} PARTICIPAÇÃO</span></div><div class="cta"><h2>Essa situação faz parte da sua rotina?</h2><p>Conte como você organiza<br>as informações da consulta hoje.</p>${arrow}</div>${note("Conheça a proposta no ambiente demonstrativo.<br>Do relato inicial aos próximos passos.")}`,
      },
    ],
    caption: `O cuidado continua. A informação se espalha.

Um laudo no e-mail. Um relato em uma mensagem. Um exame anterior que precisa ser encontrado para comparar.

Foi dessa necessidade de conectar as informações que surgiu a proposta do INOVA: reunir preparação, revisão e acompanhamento em uma jornada organizada.

O objetivo é apoiar o paciente a preparar sua participação e o médico a conferir documentos, resultados e histórico com contexto.

O problema é reconhecível. A utilidade da solução precisa ser demonstrada na rotina — e é isso que queremos construir com quem cuida e com quem é cuidado.

Como você organiza hoje as informações antes de uma consulta? Conte nos comentários.

Publicação sobre a proposta do produto e sua jornada demonstrativa. Não apresenta resultados clínicos ou ganhos de tempo comprovados.

#INOVA #SaudeDigital #JornadaDoPaciente #CuidadoEmPerspectiva`,
  },
  {
    id: "post-03-inova-na-pratica",
    title: "Como o INOVA funciona na prática",
    pages: [
      {
        eyebrow: "CONHEÇA A JORNADA",
        title: "Antes, durante<br>e depois<br><em>da consulta.</em>",
        lead: "Veja como médico e paciente participam<br>da jornada demonstrativa do INOVA.",
        body: `<div class="journey-visual"><div>${icon("message")}<small>01</small><h2>Preparar</h2></div><span>${arrow}</span><div>${icon("document")}<small>02</small><h2>Conferir</h2></div><span>${arrow}</span><div>${icon("history")}<small>03</small><h2>Acompanhar</h2></div></div>${footerCta("Veja o INOVA na prática")}`,
      },
      {
        light: true,
        eyebrow: "01 · ANTES DA CONSULTA",
        title: "Prepare<br><em>a conversa.</em>",
        lead: "O paciente chega à consulta<br>com suas informações organizadas.",
        body: `<div class="mock-card"><div class="mock-head">${icon("patient")}<div><small>ESPAÇO DO PACIENTE</small><h2>Preparar consulta</h2></div></div><div class="mock-field"><span>O que quero conversar</span><p>Minhas dúvidas e relatos para o médico.</p></div><div class="mock-field"><span>Medicamentos e informações</span><p>O que precisa ser conferido na consulta.</p></div><div class="attachment">${icon("document")}<div><b>Laudo do laboratório.pdf</b><small>Documento de exemplo para revisão.</small></div></div></div>${note("Textos, documentos e áudios podem compor<br>a preparação no ambiente demonstrativo.")}`,
      },
      {
        light: true,
        eyebrow: "02 · NA REVISÃO MÉDICA",
        title: "Revise com<br><em>contexto.</em>",
        lead: "O médico consulta os envios<br>e acompanha as informações do prontuário.",
        body: `<div class="mock-card"><div class="mock-head">${icon("doctor")}<div><small>ESPAÇO DO MÉDICO</small><h2>Informações para conferir</h2></div></div><div class="review-item">${icon("message")}<span>Relatos e dúvidas do paciente</span></div><div class="review-item">${icon("document")}<span>Laudos e documentos originais</span></div><div class="review-item">${icon("history")}<span>Resultados ao longo do tempo</span></div><div class="review-item">${icon("patient")}<span>Histórico informado no prontuário</span></div></div>${note("A revisão e a interpretação permanecem<br>com o profissional responsável.")}`,
      },
      {
        eyebrow: "INTELIGÊNCIA COMO APOIO",
        title: "A IA organiza.<br><em>O médico decide.</em>",
        lead: "O resumo pré-consulta apoia<br>a preparação do profissional.",
        body:
          list([
            [
              "spark",
              "Resumo das informações",
              "Organize os textos disponíveis<br>para o período selecionado.",
            ],
            [
              "message",
              "Pontos para conferir",
              "Veja questões e lacunas<br>que precisam de revisão.",
            ],
            [
              "document",
              "Fontes para consultar",
              "Confira os textos e o resumo<br>antes de utilizar as informações.",
            ],
          ]) +
          note(
            "A IA pode errar. O resumo precisa de conferência<br>e não estabelece diagnóstico nem prescreve tratamento.",
          ),
      },
      {
        eyebrow: "03 · NO ACOMPANHAMENTO",
        title: "A consulta termina.<br><em>A jornada<br>continua.</em>",
        lead: "Pedidos, orientações e eventos ajudam<br>a organizar os próximos passos.",
        body: `<div class="follow-up"><span>${icon("document")} CONFERIR OS PEDIDOS</span><span>${icon("message")} CONSULTAR AS ORIENTAÇÕES</span><span>${icon("calendar")} ACOMPANHAR A AGENDA</span></div><div class="cta"><h2>Quer ver a jornada completa?</h2><p>Envie <strong>INOVA</strong> por mensagem<br>para pedir uma demonstração.</p>${arrow}</div>${note("Exemplo da jornada demonstrativa.<br>Datas e agendamentos externos precisam de confirmação.")}`,
      },
    ],
    caption: `Antes, durante e depois da consulta.

Na jornada demonstrativa do INOVA, o paciente prepara relatos, dúvidas e documentos. O médico consulta os envios, os laudos e o histórico para revisar as informações com contexto.

O assistente de IA apoia a preparação com resumos de textos disponíveis e pontos para conferir. O profissional revisa as fontes e mantém a decisão clínica.

Depois da consulta, pedidos, orientações e eventos ajudam a organizar o acompanhamento.

Quer conhecer esse caminho na prática? Envie INOVA por mensagem para pedir uma demonstração.

As telas e os exemplos deste carrossel são ilustrações da jornada demonstrativa do produto. A IA pode errar, não estabelece diagnóstico e não substitui o médico. Agendamentos externos precisam ser confirmados com os prestadores.

#INOVA #SaudeDigital #TecnologiaNaSaude #JornadaDoPaciente`,
  },
];

const css = `
@import url('../assets/fonts/manrope.css');@import url('../assets/fonts/dm-sans.css');
@page{size:1080px 1350px;margin:0}*{box-sizing:border-box}html,body{margin:0}body{background:#06132c;font-family:'DM Sans',Arial,sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}h1,h2,p{margin:0}svg{display:block}.slide{width:1080px;height:1350px;padding:72px;position:relative;overflow:hidden;break-after:page}.slide:last-child{break-after:auto}.dark{color:#fff;background:radial-gradient(ellipse at 95% 100%,#07364b 0,transparent 53%),linear-gradient(135deg,#05172f,#030c27)}.light{color:#0f283f;background:radial-gradient(ellipse at 0 100%,#def3f8 0,transparent 55%),#f6f9fb}header{height:101px;border-bottom:1px solid #93b7d22e;display:flex;align-items:flex-start;justify-content:space-between}.light header{border-bottom-color:#d3e0e8}.logo{display:flex;align-items:center;font-family:'Manrope';font-size:46px;letter-spacing:7px;font-weight:400;gap:4px;line-height:1}.logo svg{width:83px;height:44px;color:${inovaLogoCyan}}.post-label{display:flex;align-items:center;gap:17px;color:#89adc5;margin-top:5px}.post-label>span{border:1px solid #00b8e654;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#4ed8f4;font-size:16px}.post-label small{font-size:17px;letter-spacing:2.4px}.light .post-label{color:#537b91}.light .post-label>span{color:#0084a8}main{padding-top:45px}.eyebrow{color:#64dbf3;font-size:18px;letter-spacing:2px;line-height:1.5;margin-bottom:25px;font-weight:500}.light .eyebrow{color:#007d9b}h1{font-family:'Manrope';font-weight:700;font-size:68px;letter-spacing:-2.7px;line-height:1.15}h1 em{font-style:normal;color:#29cef0}.light h1 em{color:#007d9e}.cover h1{font-size:76px;letter-spacing:-3.2px}.lead{font-size:29px;line-height:1.5;color:#b2cada;margin-top:28px}.light .lead{color:#5e778a}.icon{width:44px;height:44px;color:#27ccef;flex-shrink:0}.light .icon{color:#008cac}h2{font-size:31px;font-weight:600;line-height:1.3}.note{border-left:3px solid #00b8e6;padding-left:23px;font-size:23px;line-height:1.5;color:#a3c0d4;margin-top:33px}.light .note{color:#577587}.note strong{color:#007d9e;font-weight:600}.feature-list{margin-top:44px;display:flex;flex-direction:column;gap:19px}.feature-list article{display:flex;gap:26px;align-items:flex-start;border:1px solid #34617c81;border-radius:22px;background:#0b264044;padding:26px 29px}.light .feature-list article{background:#fff;border-color:#d5e4ec}.feature-list p{font-size:26px;line-height:1.43;color:#a9c5d7;margin-top:10px}.light .feature-list p{color:#637d8f}.feature-list .icon{margin-top:5px}.role-pair{display:flex;flex-direction:column;gap:17px;margin-top:42px}.role-card{display:flex;align-items:center;gap:25px;border:1px solid #28668288;background:linear-gradient(125deg,#0b2b45,#0a1a32);border-radius:22px;padding:27px 31px}.role-icon{width:65px;height:65px;border-radius:20px;background:#0d3e58;display:flex;align-items:center;justify-content:center;flex-shrink:0}.role-icon svg{width:36px;height:36px}.role-card small{display:block;font-size:16px;letter-spacing:2px;color:#60d8ef;margin-bottom:10px}.role-card h2{font-size:29px}.role-card p{font-size:24px;line-height:1.4;color:#96b8cc;margin-top:8px}.swipe{display:flex;align-items:center;gap:23px;font-size:25px;color:#65dff5;margin-top:35px}.swipe>span{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:1px solid #53badb80;border-radius:50%}.swipe svg{width:28px}.connection{margin-top:60px;display:flex;justify-content:space-around;align-items:center}.connection>span{display:flex;flex-direction:column;align-items:center;gap:22px;font-size:19px;letter-spacing:2px;color:#a6c8d9}.connection>div{color:#00b8e6;width:250px}.connection .icon{width:57px;height:57px}.cta{position:relative;background:#00b8e60b;border:1px solid #00b8e661;padding:31px;border-radius:24px;margin-top:48px}.cta h2{font-size:31px;padding-right:58px}.cta p{font-size:28px;color:#b5d0df;line-height:1.5;margin-top:13px}.cta strong{font-weight:600;color:#51d9f3}.cta>svg{position:absolute;right:28px;bottom:38px;width:44px;color:#41d5f0}.fragments{position:relative;margin-top:43px;display:flex;flex-direction:column;gap:15px}.fragments>div{display:flex;align-items:center;gap:24px;background:#092840;border:1px solid #30698288;border-radius:18px;padding:21px 26px;width:90%;color:#b6d3df;font-size:19px;letter-spacing:1.5px}.fragments>div:first-child{transform:rotate(-2deg);margin-left:4px}.fragments>div:nth-child(2){transform:rotate(1deg);margin-left:63px}.fragments>div:last-child{transform:rotate(-1deg);margin-left:12px}.fragments .icon{width:31px;height:31px}.question-stack{display:flex;flex-direction:column;gap:19px;margin-top:49px}.question-stack article{border:1px solid #d6e4ec;border-radius:21px;padding:35px 30px;background:#fff;display:flex;align-items:center;gap:24px}.question-stack article>span{color:#0099bd;background:#eaf7fa;border-radius:50%;width:53px;height:53px;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0}.question-stack h2{font-size:30px}.steps{margin-top:42px;display:flex;flex-direction:column}.step{display:flex;align-items:flex-start;gap:30px;border-bottom:1px solid #4b778d45;padding:27px 0}.step:last-child{border-bottom:0}.step>span{color:#54d7f0;background:#0a354f;border-radius:17px;width:65px;height:65px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0}.step p{color:#a6c4d6;font-size:27px;line-height:1.45;margin-top:11px}.principles{display:flex;flex-wrap:wrap;gap:15px;margin-top:50px}.principles>span{border:1px solid #4488a46b;padding:17px 24px;border-radius:35px;background:#09273f;display:flex;align-items:center;gap:15px;color:#8ddbef;font-size:19px;letter-spacing:1.2px}.principles .icon{width:28px;height:28px}.journey-visual{display:flex;align-items:center;justify-content:space-between;border:1px solid #3f7b985e;border-radius:28px;background:#09284188;margin-top:64px;padding:33px 32px}.journey-visual>div{display:flex;flex-direction:column;align-items:center;gap:15px}.journey-visual small{color:#6cb7d0;font-size:18px;letter-spacing:1px}.journey-visual h2{font-size:26px}.journey-visual>span svg{width:31px;color:#568ca5}.journey-visual .icon{width:48px;height:48px;margin-bottom:3px}.mock-card{margin-top:42px;padding:33px 36px;background:#fff;border:1px solid #d7e6ed;border-radius:26px;box-shadow:0 20px 60px #34556909}.mock-head{display:flex;align-items:center;gap:24px;border-bottom:1px solid #e2ebf0;padding-bottom:28px}.mock-head small{font-size:16px;color:#6b889a;letter-spacing:2px;display:block;margin-bottom:10px}.mock-head h2{font-size:30px}.mock-field{margin-top:26px}.mock-field>span{font-size:23px;display:block;color:#143349;margin-bottom:13px;font-weight:500}.mock-field p{padding:19px 22px;border:1px solid #dfebf0;border-radius:12px;color:#698091;font-size:24px;line-height:1.4}.attachment{border:1px solid #d8e8ee;border-radius:17px;background:#edf8fb;padding:22px 24px;display:flex;align-items:center;gap:23px;margin-top:26px}.attachment b{display:block;font-size:25px;font-weight:500}.attachment small{display:block;font-size:20px;color:#647f91;margin-top:8px}.review-item{display:flex;gap:23px;align-items:center;border-bottom:1px solid #e3edf2;padding:27px 0;color:#425e72;font-size:27px}.review-item:last-child{border:0;padding-bottom:8px}.review-item .icon{width:33px;height:33px}.follow-up{margin-top:40px;display:flex;flex-direction:column;gap:19px}.follow-up>span{display:flex;align-items:center;gap:23px;padding:21px 25px;background:#0a2b4380;border:1px solid #346c895a;border-radius:17px;font-size:19px;letter-spacing:1.4px;color:#a1d1e1}.follow-up .icon{height:32px;width:32px}footer{position:absolute;left:72px;right:72px;bottom:42px;border-top:1px solid #83afc82e;padding-top:25px;display:flex;justify-content:space-between;align-items:center;color:#85a9bf;font-size:17px}.light footer{color:#668394;border-top-color:#d3e3eb}.counter{display:flex;align-items:center;gap:9px}.counter i{height:6px;width:6px;border-radius:20px;background:#64889f6e}.counter i.active{background:#00b8e6;width:22px}.counter b{font-weight:400;font-size:16px;letter-spacing:1px;margin-left:17px}body.export .slide{display:none}body.export .slide.active{display:block}.slide:not(.cover) h1{font-size:64px}.feature-list{gap:14px;margin-top:34px}.feature-list article{padding:22px 29px}.feature-list h2{font-size:28px}.feature-list p{font-size:24px;line-height:1.4;margin-top:8px}.note{font-size:22px;margin-top:27px}.mock-card{padding:28px 34px}.mock-head{padding-bottom:24px}.mock-field{margin-top:22px}.follow-up{margin-top:32px;gap:16px}.cta{margin-top:42px}@media print{body.export .slide{display:block}}
`;

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const folder = join(output, post.id);
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(folder, "carrossel-editavel.html"),
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>INOVA · ${post.title}</title><style>${css}</style></head><body>${slides(i + 1, post.pages)}</body></html>`,
  );
  writeFileSync(join(folder, "legenda.txt"), post.caption + "\n");
  writeFileSync(
    join(folder, "texto-das-artes.md"),
    `# ${post.title}\n\n` +
      post.pages
        .map(
          (page, index) =>
            `## Arte ${index + 1}\n\n${page.eyebrow}\n\n${page.title.replaceAll(/<br\s*\/?\s*>/g, "\n").replaceAll(/<[^>]*>/g, "")}\n\n${page.lead?.replaceAll("<br>", "\n") ?? ""}\n`,
        )
        .join("\n"),
  );
}

const browser = await presentationBrowser();
const validation = [];
try {
  await browser.command("Emulation.setDeviceMetricsOverride", {
    width: 1080,
    height: 1350,
    deviceScaleFactor: 1,
    mobile: false,
  });
  for (const post of posts) {
    const folder = join(output, post.id);
    await browser.command("Page.navigate", {
      url: pathToFileURL(join(folder, "carrossel-editavel.html")).href,
    });
    await browser.wait(`document.querySelectorAll('.slide').length===${post.pages.length}`);
    await browser.evaluate("document.fonts.ready");
    const fonts = await browser.evaluate(
      "document.fonts.check('700 76px Manrope') && document.fonts.check('400 29px \"DM Sans\"')",
    );
    if (!fonts) throw new Error("Brand fonts unavailable.");
    await browser.evaluate("document.body.classList.add('export')");
    for (let i = 1; i <= post.pages.length; i++) {
      await browser.evaluate(
        `document.querySelectorAll('.slide').forEach(s=>s.classList.remove('active'));document.querySelector('#slide-${i}').classList.add('active')`,
      );
      const check = await browser.evaluate(
        `(()=>{const s=document.querySelector('.slide.active');return {post:${JSON.stringify(post.id)},slide:${i},width:s.offsetWidth,height:s.offsetHeight,overflow:s.scrollWidth>s.clientWidth||s.scrollHeight>s.clientHeight,bottom:s.querySelector('main').getBoundingClientRect().bottom,footerTop:s.querySelector('footer').getBoundingClientRect().top,path:s.querySelector('.logo path').getAttribute('d')};})()`,
      );
      if (check.overflow || check.bottom > check.footerTop - 15 || check.path !== inovaInfinityPath)
        throw new Error("Layout/brand check failed: " + JSON.stringify(check));
      validation.push(check);
      const png = await browser.command("Page.captureScreenshot", {
        format: "png",
        clip: { x: 0, y: 0, width: 1080, height: 1350, scale: 1 },
        captureBeyondViewport: true,
      });
      writeFileSync(
        join(folder, `${String(i).padStart(2, "0")}${i === 1 ? "-capa" : "-INOVA"}.png`),
        Buffer.from(png.data, "base64"),
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
    writeFileSync(join(folder, "carrossel.pdf"), Buffer.from(pdf.data, "base64"));
    console.log(`Rendered ${post.id}: ${post.pages.length} PNGs and PDF.`);
  }
  const preview = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>@import url('./assets/fonts/manrope.css');*{box-sizing:border-box}html,body{margin:0;background:#06132c}body{width:1440px;padding:37px;color:#fff;font-family:Manrope,Arial}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #568aa13b;padding-bottom:23px;margin-bottom:29px;font-size:21px;letter-spacing:1.5px}header span{color:#69cde5;font-size:17px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}img{width:100%;display:block;border:1px solid #629daf44;border-radius:9px}h2{font-size:21px;font-weight:500;margin:18px 0 6px}p{font-size:15px;color:#86a8be;margin:0}</style></head><body><header>INOVA · POSTS FIXOS<span>CONHEÇA · PROPÓSITO · NA PRÁTICA</span></header><main>${posts.map((post, i) => `<article><img src="${post.id}/01-capa.png"><h2>0${i + 1} · ${post.title}</h2><p>Carrossel com ${post.pages.length} artes</p></article>`).join("")}</main></body></html>`;
  writeFileSync(join(output, "previa-dos-tres-posts.html"), preview);
  await browser.command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 780,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await browser.command("Page.navigate", {
    url: pathToFileURL(join(output, "previa-dos-tres-posts.html")).href,
  });
  await browser.wait("document.images.length===3");
  await browser.evaluate(
    "Promise.all([document.fonts.ready,...[...document.images].map(image=>image.decode())])",
  );
  const height = await browser.evaluate("document.documentElement.scrollHeight");
  const png = await browser.command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 1440, height, scale: 1 },
  });
  writeFileSync(join(output, "previa-dos-tres-posts.png"), Buffer.from(png.data, "base64"));
} finally {
  await browser.close();
}
writeFileSync(
  join(output, "validation.json"),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      brand: "Shared application infinity SVG; Manrope and DM Sans; navy and cyan",
      examples:
        "Demonstration product. No real patient data, clinical diagnosis, certification or invented traction.",
      slides: validation,
    },
    null,
    2,
  ),
);
for (const post of posts) {
  const data = readFileSync(join(output, post.id, "carrossel.pdf"));
  const pages = [...data.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length;
  if (pages !== post.pages.length) throw new Error("Unexpected PDF pages for " + post.id);
}
writeFileSync(
  join(output, "LEIA-ME.md"),
  `# INOVA — três posts fixos\n\nAs capas formam uma série visual. Cada post é um carrossel independente.\n\n1. **Conheça o INOVA** — 4 artes: proposta, INOVA Médico, INOVA Paciente e conexão das duas perspectivas.\n2. **Por que o INOVA?** — 4 artes: informação fragmentada e a necessidade de continuidade.\n3. **INOVA na prática** — 5 artes: preparação, revisão, apoio da IA e acompanhamento.\n\n## Para postar\n\nAbra a pasta do post e selecione as imagens PNG em ordem numérica, começando em 01-capa.png. Copie a legenda de legenda.txt. São três publicações distintas, para destacar no perfil.\n\nTodas as artes têm 1080 × 1350 pixels. PDF para revisão; os PNGs são os arquivos para o carrossel. Os HTMLs e as fontes são editáveis e funcionam localmente quando a pasta assets fica ao lado das pastas dos posts.\n\n## Identidade e conteúdo\n\nLogo vetorial compartilhado com src/data/inova-brand.ts, conforme aprovado pelo usuário. Manrope e DM Sans; azul profundo, ciano e branco. Sem mudança nas interfaces do sistema. Conteúdo original inspirado no formato editorial de referência; não reproduz os textos ou a marca de terceiros.\n\nOs recursos são apresentados como jornada demonstrativa. Não há promessas de diagnóstico, automação clínica, conformidade certificada, resultados ou ganhos de tempo comprovados. Não contém dados reais de pacientes. Nenhuma publicação foi feita nas redes sociais.\n`,
);
console.log("Validated 13 PNGs and three independent carousels with the approved logo.");
