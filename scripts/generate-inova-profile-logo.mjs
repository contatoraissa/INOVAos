import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { presentationBrowser } from "./presentation-browser.mjs";
import { inovaInfinityPath, inovaLogoCyan } from "../src/data/inova-brand.ts";

const output = resolve("docs/entregaveis/instagram/INOVA_logo_instagram_2026-10-10");
mkdirSync(output, { recursive: true });
const fontFolder = resolve("docs/entregaveis/instagram/INOVA_posts_fixos_2026-10-10/assets/fonts");
const font = readFileSync(join(fontFolder, "manrope-0.woff2")).toString("base64");
copyFileSync(join(fontFolder, "manrope-OFL.txt"), join(output, "manrope-OFL.txt"));
const face = `@font-face{font-family:Manrope;font-weight:400;src:url(data:font/woff2;base64,${font})}`;
const mark = `<svg viewBox="0 0 160 80" fill="none" aria-hidden="true"><path d="${inovaInfinityPath}" stroke="${inovaLogoCyan}" stroke-width="11" stroke-linecap="round"/></svg>`;
const wordmark = `<div class="logo" aria-label="INOVA"><span>IN</span>${mark}<span>VA</span></div>`;
const variants = [
  { name: "INOVA-foto-perfil", width: 1080, height: 1080, background: "#ffffff", ink: "#071b2c" },
  {
    name: "INOVA-foto-perfil-azul",
    width: 1080,
    height: 1080,
    background: "#03112d",
    ink: "#ffffff",
  },
  {
    name: "INOVA-logo-transparente",
    width: 1440,
    height: 480,
    background: "transparent",
    ink: "#071b2c",
  },
];
const browser = await presentationBrowser();
const validations = [];
try {
  for (const variant of variants) {
    const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Logo INOVA</title><style>${face}*{box-sizing:border-box}html,body{margin:0;width:${variant.width}px;height:${variant.height}px;background:${variant.background}}body{display:flex;align-items:center;justify-content:center}.logo{display:inline-flex;align-items:center;gap:.087em;font-family:Manrope,sans-serif;font-weight:400;font-size:142px;line-height:1;letter-spacing:.15em;color:${variant.ink}}.logo svg{height:.96em;width:1.8em;flex:none}</style>${wordmark}</html>`;
    const file = join(output, variant.name + ".html");
    writeFileSync(file, html);
    await browser.command("Emulation.setDeviceMetricsOverride", {
      width: variant.width,
      height: variant.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await browser.command("Page.navigate", { url: pathToFileURL(file).href });
    await browser.wait("document.readyState === 'complete' && document.querySelector('.logo')");
    await browser.evaluate("document.fonts.ready");
    const bounds = await browser.evaluate(
      `(()=>{const r=document.querySelector('.logo').getBoundingClientRect();return {fontLoaded:document.fonts.check('400 142px Manrope'),left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width}})()`,
    );
    if (
      !bounds.fontLoaded ||
      bounds.left < 0 ||
      bounds.top < 0 ||
      bounds.right > variant.width ||
      bounds.bottom > variant.height
    )
      throw new Error("Invalid logo layout");
    // Full wordmark remains inside the central 80% diameter of the profile circle.
    if (
      variant.width === variant.height &&
      Math.hypot(bounds.width / 2, (bounds.bottom - bounds.top) / 2) > variant.width * 0.4
    )
      throw new Error("Profile crop unsafe");
    await browser.command("Emulation.setDefaultBackgroundColorOverride", {
      color: { r: 0, g: 0, b: 0, a: 0 },
    });
    const screenshot = await browser.command("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: variant.width, height: variant.height, scale: 1 },
    });
    writeFileSync(join(output, variant.name + ".png"), Buffer.from(screenshot.data, "base64"));
    validations.push({
      file: variant.name + ".png",
      dimensions: [variant.width, variant.height],
      ...bounds,
    });
  }
  writeFileSync(join(output, "validation.json"), JSON.stringify(validations, null, 2));
  writeFileSync(
    join(output, "LEIA-ME.md"),
    "# Logo INOVA para Instagram\n\nUse INOVA-foto-perfil.png como foto de perfil: fundo branco, letras em azul profundo e infinito ciano. Alternativa: INOVA-foto-perfil-azul.png. Ambos têm 1080 × 1080 pixels e espaço seguro para o recorte circular.\n\nINOVA-logo-transparente.png tem fundo transparente para aplicar em artes. HTMLs incluídos para edição. Mesma tipografia e símbolo do logo aprovado no sistema e nos carrosséis. Fonte Manrope, licença OFL incluída.\n",
  );
  console.log(JSON.stringify(validations, null, 2));
} finally {
  await browser.close();
}
