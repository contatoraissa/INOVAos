import { mkdirSync, writeFileSync, readFileSync, cpSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { presentationBrowser } from "./presentation-browser.mjs";
import { inovaInfinityPath, inovaLogoCyan } from "../src/data/inova-brand.ts";

const output = resolve("docs/entregaveis/instagram/INOVA_video_preparar_consulta_2026-10-10");
const frames = resolve("artifacts/inova-feature-video-frames");
const ffmpeg =
  process.env.INOVA_FFMPEG_PATH ??
  resolve("artifacts/social-tools/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe");
if (!existsSync(ffmpeg)) throw new Error("Set INOVA_FFMPEG_PATH");
mkdirSync(frames, { recursive: true });
mkdirSync(join(output, "assets"), { recursive: true });
mkdirSync(join(output, "previas"), { recursive: true });
cpSync(
  resolve("docs/entregaveis/instagram/INOVA_posts_fixos_2026-10-10/assets/fonts"),
  join(output, "assets/fonts"),
  { recursive: true },
);
const captured = JSON.parse(readFileSync(join(output, "capturas.json"), "utf8"));
if (!captured.deliveryVerified || !captured.pdfOpened)
  throw new Error("Capture the working flow first");

const scenes = [
  {
    seconds: 4,
    eyebrow: "INOVA NA PRÁTICA",
    title: "A consulta começa<br><em>antes do encontro.</em>",
    text: "Veja como paciente e médico<br>conectam informações no INOVA.",
    body: `<div class="journey"><div><span>01</span><h2>Preparar</h2><p>A paciente conta sua história.</p></div><div><span>02</span><h2>Enviar</h2><p>Mensagem e laudo juntos.</p></div><div><span>03</span><h2>Revisar</h2><p>O médico confere o contexto.</p></div></div>`,
    note: "Do portal da paciente à área médica.",
  },
  {
    seconds: 5,
    eyebrow: "01 · INOVA PACIENTE",
    title: "Sua mensagem.<br><em>Suas perguntas.</em>",
    text: "Mariana registra o que quer conversar<br>na próxima consulta.",
    image: "01-mensagem-paciente",
    label: "Preparar consulta · Mariana Oliveira",
    note: "Escreva o relato e as dúvidas para o médico.",
  },
  {
    seconds: 5,
    eyebrow: "02 · DOCUMENTOS",
    title: "O laudo vai<br><em>junto com o relato.</em>",
    text: "A paciente escolhe o PDF<br>e confere o destinatário.",
    image: "02-pdf-selecionado",
    label: "PDF selecionado · Dr. Rafael Mendes",
    note: "Selecione o documento que deseja enviar.",
  },
  {
    seconds: 5,
    eyebrow: "03 · CONFERÊNCIA",
    title: "Confira antes<br><em>de enviar.</em>",
    text: "O INOVA mostra as respostas<br>e os anexos para revisão.",
    image: "03-revisao-envio",
    label: "Revisão do envio pela paciente",
    note: "O envio acontece após a confirmação.",
  },
  {
    seconds: 5,
    eyebrow: "04 · INOVA MÉDICO",
    title: "Chegou um envio.<br><em>O sininho avisa.</em>",
    text: "O médico encontra o aviso<br>e acessa a preparação recebida.",
    image: "05-notificacao-medico",
    label: "Notificações · Dr. Rafael Mendes",
    note: "Notificação de recebimento ≠ revisão médica.",
  },
  {
    seconds: 5,
    eyebrow: "05 · CONTEXTO",
    title: "Relato e laudo.<br><em>No mesmo lugar.</em>",
    text: "As respostas e o PDF aparecem<br>na caixa do paciente para conferência.",
    image: "06-envio-recebido",
    label: "Envios do paciente · Mariana Oliveira",
    note: "As dúvidas da paciente acompanham o documento.",
  },
  {
    seconds: 4,
    eyebrow: "06 · DOCUMENTO ORIGINAL",
    title: "Abra o PDF.<br><em>Confira a fonte.</em>",
    text: "O médico consulta o laudo recebido<br>antes de registrar sua revisão.",
    image: "07-laudo-aberto",
    label: "Laudo original recebido · exemplo fictício",
    note: "A decisão clínica permanece com o médico.",
  },
  {
    seconds: 4,
    eyebrow: "INOVA · CUIDADO EM PERSPECTIVA",
    title: "Da preparação<br><em>à revisão.</em>",
    text: "Um espaço para quem cuida.<br>Outro para quem participa do cuidado.",
    body: `<div class="closing"><span class="infinity-large"><svg viewBox="0 0 160 80" fill="none"><path d="${inovaInfinityPath}" stroke="${inovaLogoCyan}" stroke-width="7" stroke-linecap="round"/></svg></span><h2>Conheça a demonstração.</h2><p>Envie <strong>INOVA</strong> por mensagem<br>para conversar com a gente.</p></div>`,
    note: "Médico e paciente. Uma história conectada.",
  },
];
let running = 0;
for (const scene of scenes) {
  scene.start = running;
  running += scene.seconds;
}
const seconds = running;
const fps = 24;
const logo = `<div class="logo" aria-label="INOVA"><span>IN</span><svg viewBox="0 0 160 80" fill="none"><path d="${inovaInfinityPath}" stroke="${inovaLogoCyan}" stroke-width="11" stroke-linecap="round"/></svg><span>VA</span></div>`;
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>INOVA — preparar consulta</title><style>
@import url('assets/fonts/manrope.css');@import url('assets/fonts/dm-sans.css');
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden}body{background:#03112d;color:#fff;font-family:'DM Sans',sans-serif;background-image:radial-gradient(ellipse at 90% 60%,#06354a 0%,transparent 58%)}
header{position:absolute;top:146px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between}.logo{font:400 49px Manrope;letter-spacing:.15em;display:flex;align-items:center;gap:.087em}.logo svg{width:1.8em;height:.96em}.tag{padding:12px 20px;border-radius:30px;border:1px solid #00b8e640;color:#7cdff7;font-size:23px}.scene{position:absolute;inset:290px 72px 285px;opacity:0;visibility:hidden}.eyebrow{font:600 22px Manrope;letter-spacing:3px;color:#68ddf8;margin:0 0 30px}h1{font:500 68px/1.12 Manrope;letter-spacing:-2px;margin:0}em{font-style:normal;color:#00b8e6}.lead{font-size:32px;line-height:1.42;color:#c9d7e3;margin:28px 0 35px}.screen{height:820px;width:936px;border:1px solid #2a5364;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px #0005}.screen-head{height:64px;background:#eef6f9;color:#245369;border-bottom:1px solid #d7e6ed;display:flex;align-items:center;gap:15px;padding:0 22px;font-size:22px}.screen-head i{display:block;width:10px;height:10px;border-radius:50%;background:#00b8e6}.screen-image{height:756px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f5f8fa}.notice-crop{width:700px;height:380px;overflow:hidden;border-radius:18px;box-shadow:0 10px 30px #15304418}.screen-image .notice-crop img{width:700px;height:auto;object-fit:initial}.screen-image img{width:100%;height:100%;object-fit:contain;transform-origin:center}.note{font-size:27px;line-height:1.4;padding:24px 0 0;color:#b9d4e1;max-width:915px;margin:0}.note:before{content:'→ ';color:#00b8e6}.journey{display:grid;gap:22px;margin-top:72px}.journey>div{border:1px solid #2a5364;border-radius:22px;padding:30px 34px;background:#fff04;height:205px}.journey span{color:#00b8e6;font:500 25px Manrope}.journey h2{font:500 43px Manrope;margin:10px 0}.journey p{font-size:28px;color:#c9d7e3;margin:0}.closing{text-align:center;padding:80px 20px;margin-top:40px;border:1px solid #2a5364;border-radius:28px;background:#fff03}.infinity-large svg{width:420px;height:210px}.closing h2{font:500 42px Manrope;margin:45px 0 25px}.closing p{font-size:32px;line-height:1.5;color:#c9d7e3}strong{color:#00b8e6;font-weight:500}footer{position:absolute;left:72px;right:72px;bottom:174px;color:#b3c8d6;font-size:22px}.footer-row{display:flex;justify-content:space-between;margin-bottom:24px}.track{height:4px;background:#335168;border-radius:3px;overflow:hidden}.progress{height:100%;background:#00b8e6}.counter{color:#7cdbf1}
</style><header>${logo}<span class="tag">Demonstração</span></header>${scenes.map((scene, index) => `<section class="scene" data-scene="${index}"><p class="eyebrow">${scene.eyebrow}</p><h1>${scene.title}</h1><p class="lead">${scene.text}</p>${scene.image ? `<div class="screen"><div class="screen-head"><i></i>${scene.label}</div><div class="screen-image">${scene.image === "05-notificacao-medico" ? '<div class="notice-crop">' : ""}<img src="telas/${scene.image}.png" alt="Captura da demonstração do INOVA">${scene.image === "05-notificacao-medico" ? "</div>" : ""}</div></div>` : scene.body}<p class="note">${scene.note}</p></section>`).join("")}<footer><div class="footer-row"><span>Capturas do sistema · Dados fictícios</span><span class="counter"></span></div><div class="track"><div class="progress"></div></div></footer><script>
const timings=${JSON.stringify(scenes.map(({ start, seconds }) => ({ start, seconds })))};window.renderFrame=function(time){const index=timings.findIndex((s,i)=>time>=s.start&&(time<s.start+s.seconds||i===timings.length-1));document.querySelectorAll('.scene').forEach((el,i)=>{const local=time-timings[i].start;const fade=Math.min(1,Math.max(0,local/.32),Math.max(0,(timings[i].seconds-local)/.32));el.style.visibility=i===index?'visible':'hidden';el.style.opacity=i===index?fade:0;el.style.transform='translateY('+((1-fade)*15)+'px)';const img=el.querySelector('img');if(img)img.style.transform='scale('+(1+Math.max(0,Math.min(1,local/timings[i].seconds))*.012)+')';});document.querySelector('.counter').textContent=String(index+1).padStart(2,'0')+' / '+timings.length;document.querySelector('.progress').style.width=(Math.min(1,time/${seconds})*100)+'%';};window.renderFrame(1);
</script></html>`;
writeFileSync(join(output, "video-editavel.html"), html);
writeFileSync(
  join(output, "roteiro.md"),
  "# INOVA — preparar consulta\n\nVídeo vertical com capturas reais da demonstração local, dados fictícios e movimento de edição. Não é uma gravação contínua da tela. Não houve alteração nas interfaces. Sem áudio; explicações incorporadas ao vídeo.\n\n" +
    scenes
      .map(
        (scene, i) =>
          `${i + 1}. **${scene.start}s–${scene.start + scene.seconds}s:** ${scene.title.replace(/<[^>]+>/g, " ")}. ${scene.text.replace(/<[^>]+>/g, " ")}. ${scene.note}`,
      )
      .join("\n\n") +
    "\n\nO fluxo de envio, notificação e abertura do PDF foi executado e conferido. Um envio fictício fica temporariamente na caixa demonstrativa do médico. O navegador de captura foi isolado dos rascunhos e sessões do usuário.\n",
);
writeFileSync(
  join(output, "legenda.txt"),
  "A consulta começa antes do encontro.\n\nNo INOVA, a paciente pode registrar o que quer conversar, selecionar um laudo PDF e conferir o envio. Na área médica, o aviso aparece no sininho e o médico encontra as respostas e o documento original para revisar.\n\nNeste vídeo, Mariana e Dr. Rafael mostram esse caminho na demonstração, com dados fictícios. A conferência das informações e a decisão clínica permanecem com o profissional.\n\nQuer conhecer a proposta? Envie INOVA por mensagem.\n\n#INOVA #SaudeDigital #TecnologiaEmSaude #ConsultaMedica #CuidadoConectado\n",
);

function validFrame(frame) {
  const file = join(frames, `frame-${String(frame).padStart(5, "0")}.jpg`);
  if (!existsSync(file)) return false;
  const data = readFileSync(file);
  return (
    data.length > 4 &&
    data.readUInt16BE(0) === 0xffd8 &&
    data.readUInt16BE(data.length - 2) === 0xffd9
  );
}
const browser = await presentationBrowser(process.env.INOVA_VIDEO_CDP ?? "http://127.0.0.1:9223");
const validations = [];
try {
  await browser.command("Emulation.setDeviceMetricsOverride", {
    width: 1080,
    height: 1920,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await browser.command("Page.navigate", {
    url: pathToFileURL(join(output, "video-editavel.html")).href,
  });
  await browser.wait("typeof window.renderFrame==='function'");
  await browser.evaluate("document.fonts.ready");
  await browser.wait("[...document.images].every(i=>i.complete&&i.naturalWidth>0)");
  await browser.pause(600);
  const fontCheck = await browser.evaluate(
    "document.fonts.check('500 68px Manrope')&&document.fonts.check('400 32px \"DM Sans\"')",
  );
  if (!fontCheck) throw new Error("Fonts unavailable");
  for (let i = 0; i < scenes.length; i++) {
    await browser.evaluate(
      `window.renderFrame(${scenes[i].start + 1});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
    );
    const bounds = await browser.evaluate(
      `(()=>{const e=document.querySelector('[data-scene="${i}"]');const r=e.querySelector('.note').getBoundingClientRect();return {scene:${i},contentBottom:r.bottom,footerTop:document.querySelector('footer').getBoundingClientRect().top}})()`,
    );
    if (bounds.contentBottom > bounds.footerTop - 35)
      throw new Error("Text collision " + JSON.stringify(bounds));
    validations.push(bounds);
    const result = await browser.command("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(output, "previas", `cena-${i + 1}.png`), Buffer.from(result.data, "base64"));
    if (i === 0) writeFileSync(join(output, "capa-video.png"), Buffer.from(result.data, "base64"));
  }
  if (!process.argv.includes("--preview-only")) {
    let firstFrame = 0;
    if (process.argv.includes("--resume")) {
      while (firstFrame < fps * seconds && validFrame(firstFrame)) firstFrame++;
      console.log(`Resuming at frame ${firstFrame}/${fps * seconds}`);
    }
    for (let frame = firstFrame; frame < fps * seconds; frame++) {
      if (process.argv.includes("--resume") && validFrame(frame)) continue;
      await browser.evaluate(
        `window.renderFrame(${frame / fps});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
      );
      const image = await browser.command("Page.captureScreenshot", {
        format: "jpeg",
        quality: 94,
      });
      writeFileSync(
        join(frames, `frame-${String(frame).padStart(5, "0")}.jpg`),
        Buffer.from(image.data, "base64"),
      );
      if (frame % (fps * 5) === 0) console.log(`Rendered ${Math.floor(frame / fps)}/${seconds}s`);
    }
  }
  writeFileSync(
    join(output, "video-validation.json"),
    JSON.stringify(
      {
        width: 1080,
        height: 1920,
        fps,
        seconds,
        frames: fps * seconds,
        audio: false,
        fontCheck,
        actualDemoCaptures: true,
        validations,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
if (!process.argv.includes("--preview-only")) {
  const video = join(output, "INOVA-preparar-consulta.mp4");
  const encoded = spawnSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-xerror",
      "-framerate",
      String(fps),
      "-i",
      join(frames, "frame-%05d.jpg"),
      "-frames:v",
      String(fps * seconds),
      "-c:v",
      "libx264",
      "-threads",
      "2",
      "-preset",
      "medium",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      video,
    ],
    { encoding: "utf8", windowsHide: true, timeout: 180000 },
  );
  if (encoded.status !== 0)
    throw new Error(encoded.stderr || encoded.error?.message || "Encoding failed");
  const inspected = spawnSync(ffmpeg, ["-hide_banner", "-xerror", "-i", video, "-f", "null", "-"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 90000,
  });
  if (
    inspected.status !== 0 ||
    !inspected.stderr.includes("1080x1920") ||
    !inspected.stderr.includes(`00:00:${seconds}.00`)
  )
    throw new Error("MP4 validation failed");
  writeFileSync(
    join(output, "LEIA-ME.md"),
    `# Vídeo INOVA: preparar consulta\n\nAbra INOVA-preparar-consulta.mp4. Vertical 1080 × 1920, ${seconds} segundos, H.264, ${fps} fps. Sem áudio; textos explicativos já estão no vídeo. Use capa-video.png como capa e legenda.txt como texto da publicação.\n\nTelas capturadas da demonstração local, com perfis fictícios de Mariana e Dr. Rafael. O fluxo foi executado, não simulado apenas na edição. O vídeo é uma montagem das capturas, com transições e movimento suave.\n\nHTML, capturas, roteiro e fontes com suas licenças incluídos para edição. Nenhuma publicação automática nas redes sociais.\n`,
  );
  console.log(`Validated MP4: 1080x1920, ${seconds}s, H.264, ${fps}fps, no audio.`);
}
