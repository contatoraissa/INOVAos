import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { presentationBrowser } from "./presentation-browser.mjs";
import { inovaInfinityPath } from "../src/data/inova-brand.ts";
const output = resolve("docs/entregaveis/instagram/INOVA_portais_completos_2026-10-10");
const scenes = JSON.parse(readFileSync(join(output, "roteiro-e-capitulos.json"), "utf8")).scenes;
mkdirSync(join(output, "assets"), { recursive: true });
for (const [id, name] of [
  ["m01", "medico"],
  ["p01", "paciente"],
]) {
  const dir = resolve("artifacts/inova-full-tour-recordings", id);
  const manifest = JSON.parse(readFileSync(join(dir, "frames.json"), "utf8"));
  cpSync(join(dir, manifest.frames[0].file), join(output, "assets", name + ".jpg"));
}
const logo = `<div class="logo"><span>IN</span><svg viewBox="0 0 160 80" fill="none"><path d="${inovaInfinityPath}" stroke="#00b8e6" stroke-width="11" stroke-linecap="round"/></svg><span>VA</span></div>`;
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>INOVA — capa do vídeo</title><style>@import url('assets/fonts/manrope.css');@import url('assets/fonts/dm-sans.css');*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#03112d;color:#fff;font-family:'DM Sans',sans-serif}body{background:radial-gradient(ellipse at 90% 57%,#0077b648,transparent 52%),radial-gradient(ellipse at 9% 90%,#00b8e625,transparent 45%),#03112d}.line{position:absolute;right:-470px;top:640px;width:1400px;height:1400px;border:1px solid #00b8e632;border-radius:50%}.line:after{content:'';position:absolute;inset:120px;border:1px solid #00b8e627;border-radius:50%}.logo{position:absolute;left:76px;top:100px;display:flex;align-items:center;gap:.087em;font:400 60px Manrope;letter-spacing:.15em}.logo svg{width:1.8em;height:.96em}.eyebrow{position:absolute;left:76px;top:237px;color:#5edbfa;font-size:23px;letter-spacing:3px}.title{position:absolute;left:76px;right:60px;top:310px;margin:0;font:500 91px/1.08 Manrope;letter-spacing:-3px}.title span{color:#00b8e6}.pill{position:absolute;left:76px;top:557px;padding:18px 24px;border:1px solid #00b8e655;background:#00b8e616;color:#82e4fb;border-radius:48px;font-size:24px;letter-spacing:1px}.screen{position:absolute;width:440px;height:778px;padding:18px;background:#fff;border-radius:32px;box-shadow:0 36px 90px #0007;overflow:hidden}.screen h2{margin:8px 2px 22px;font:600 26px Manrope;color:#007b9c}.screen img{width:404px;height:692px;object-fit:cover;object-position:top;border-radius:14px;border:1px solid #dbe6ee}.doctor{left:58px;top:724px;transform:rotate(-3deg)}.patient{left:562px;top:824px;transform:rotate(3deg)}.bottom{position:absolute;left:76px;right:76px;top:1700px;font:500 39px/1.25 Manrope;letter-spacing:-.5px}.bottom small{display:block;font:400 22px 'DM Sans';color:#adbfce;margin-top:34px}.badge{position:absolute;left:76px;top:1630px;color:#63dcf9;font-size:24px;letter-spacing:1px}</style><div class="line"></div>${logo}<div class="eyebrow">DOIS PORTAIS. CUIDADO CONECTADO.</div><h1 class="title">Conheça o INOVA<br><span>por dentro.</span></h1><div class="pill">✧ COM INTELIGÊNCIA ARTIFICIAL</div><article class="screen doctor"><h2>INOVA MÉDICO</h2><img src="assets/medico.jpg"></article><article class="screen patient"><h2>INOVA PACIENTE</h2><img src="assets/paciente.jpg"></article><div class="badge">AGENDA · LAUDOS · RESULTADOS · IA</div><div class="bottom">Da preparação da consulta<br>ao acompanhamento.<small>Interface demonstrativa · Dados fictícios</small></div></html>`;
writeFileSync(join(output, "capa-editavel.html"), html);
const b = await presentationBrowser("http://127.0.0.1:9223");
try {
  await b.command("Emulation.setDeviceMetricsOverride", {
    width: 1080,
    height: 1920,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await b.command("Page.navigate", { url: pathToFileURL(join(output, "capa-editavel.html")).href });
  await b.wait(
    'document.querySelectorAll("img").length===2&&[...document.images].every(i=>i.complete&&i.naturalWidth)',
  );
  await b.evaluate("document.fonts.ready");
  await b.pause(400);
  const shot = await b.command("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(output, "capa-video.png"), Buffer.from(shot.data, "base64"));
} finally {
  await b.close();
}
const time = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
writeFileSync(
  join(output, "capitulos.md"),
  "# INOVA — capítulos do vídeo completo\n\n" +
    scenes.map((s) => `- **${time(s.start)}** · ${s.role} · ${s.title}`).join("\n") +
    "\n",
);
console.log("Cover and complete chapter index ready.");
