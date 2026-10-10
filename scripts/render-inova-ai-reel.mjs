import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { presentationBrowser } from "./presentation-browser.mjs";
import { inovaInfinityPath, inovaLogoCyan } from "../src/data/inova-brand.ts";

const output = resolve("docs/entregaveis/instagram/INOVA_IA_reel_2026-10-10");
const artifacts = resolve("artifacts/inova-ai-reel-export");
const recordings = resolve("artifacts/inova-ai-reel-recordings");
const ffmpeg = resolve(
  "artifacts/social-tools/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe",
);
mkdirSync(artifacts, { recursive: true });
mkdirSync(join(output, "assets"), { recursive: true });
cpSync(
  resolve("docs/entregaveis/instagram/INOVA_posts_fixos_2026-10-10/assets/fonts"),
  join(output, "assets/fonts"),
  { recursive: true },
);
const verified = JSON.parse(readFileSync(join(output, "captura-validada.json"), "utf8"));
if (!verified.liveGeminiVerified || !verified.actualScreencast)
  throw new Error("Record the live AI flow first");
const scenes = JSON.parse(readFileSync(resolve("scripts/inova-ai-reel-narration.json"), "utf8"));
function run(args, name) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-xerror", ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 180000,
  });
  if (r.status !== 0) throw new Error(name + ": " + (r.stderr || r.error?.message));
}
function waveSeconds(file) {
  const bytes = readFileSync(file);
  let offset = 12;
  let rate;
  let size;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    if (id === "fmt ") rate = bytes.readUInt32LE(offset + 16);
    if (id === "data") size = length;
    offset += 8 + length + (length % 2);
  }
  if (!rate || !size) throw new Error("Invalid WAV");
  return size / rate;
}
const logo = `<div class="logo"><span>IN</span><svg viewBox="0 0 160 80" fill="none"><path d="${inovaInfinityPath}" stroke="${inovaLogoCyan}" stroke-width="11" stroke-linecap="round"/></svg><span>VA</span></div>`;
let total = 0;
for (const scene of scenes) {
  scene.audioSeconds = waveSeconds(join(output, "audio", scene.id + ".wav")) / 1.35;
  scene.seconds = Math.ceil(Math.max(5.5, scene.audioSeconds + 0.8) * 24) / 24;
  scene.start = total;
  total += scene.seconds;
}
const overlay = String.raw`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>INOVA IA — edição</title><style>@import url('assets/fonts/manrope.css');@import url('assets/fonts/dm-sans.css');*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;background:transparent;font-family:'DM Sans',sans-serif;color:#f6fbff;overflow:hidden}.top{position:absolute;top:0;left:0;right:0;height:320px;background:#03112d;padding:66px 56px 28px}.brand{display:flex;align-items:center;justify-content:space-between}.logo{display:flex;gap:.087em;align-items:center;letter-spacing:.15em;font:400 46px Manrope}.logo svg{width:1.8em;height:.96em}.badge{display:flex;gap:12px;align-items:center;font-size:23px;letter-spacing:2px;color:#00b8e6}.spark{font-size:35px}.headline{font:500 55px/1.14 Manrope;letter-spacing:-1.3px;margin:42px 0 0;white-space:pre-line}.headline em{font-style:normal;color:#00b8e6}.bottom{position:absolute;top:1560px;bottom:0;left:0;right:0;padding:98px 56px 54px;background:linear-gradient(transparent,#03112d 27%,#03112d)}.caption{font:500 34px/1.25 Manrope;margin:0;max-width:900px}.source{font-size:21px;color:#a7c6d4;margin-top:24px}.source i{color:#00b8e6;font-style:normal}.progress{position:absolute;bottom:80px;left:56px;right:56px;height:3px;background:#25445c}.progress span{display:block;height:100%;background:#00b8e6}</style><section class="top"><div class="brand">${logo}<span class="badge"><span class="spark">✧</span> IA DO INOVA</span></div><h1 class="headline"></h1></section><section class="bottom"><p class="caption"></p><p class="source"><i>●</i> Demonstração real da interface · Dados fictícios</p></section><div class="progress"><span></span></div><script>const scenes=${JSON.stringify(scenes)};window.scene=function(i){const s=scenes[i];const parts=s.title.split('\n');document.querySelector('.headline').innerHTML=parts[0]+'<br><em>'+parts[1]+'</em>';document.querySelector('.caption').textContent=s.subtitle;document.querySelector('.progress span').style.width=((i+1)/scenes.length*100)+'%';};window.scene(0);</script></html>`;
writeFileSync(join(output, "edicao-editavel.html"), overlay);
const browser = await presentationBrowser("http://127.0.0.1:9223");
try {
  await browser.command("Emulation.setDeviceMetricsOverride", {
    width: 1080,
    height: 1920,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await browser.command("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });
  await browser.command("Page.navigate", {
    url: pathToFileURL(join(output, "edicao-editavel.html")).href,
  });
  await browser.wait("typeof window.scene==='function'");
  await browser.evaluate("document.fonts.ready");
  await browser.pause(600);
  for (let i = 0; i < scenes.length; i++) {
    await browser.evaluate(
      `window.scene(${i});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
    );
    const size = await browser.evaluate(
      "({headline:document.querySelector('.headline').getBoundingClientRect().bottom,font:document.fonts.check('500 55px Manrope')})",
    );
    if (!size.font || size.headline > 310) throw new Error("Overlay typography invalid");
    const shot = await browser.command("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(artifacts, `overlay-${i}.png`), Buffer.from(shot.data, "base64"));
  }
} finally {
  await browser.close();
}

for (const [index, scene] of scenes.entries()) {
  if (process.argv.includes("--finish-only")) break;
  const directory = join(recordings, scene.id);
  const captured = JSON.parse(readFileSync(join(directory, "frames.json"), "utf8"));
  const list = [];
  for (const [i, frame] of captured.frames.entries()) {
    const file = join(directory, frame.file);
    const bytes = readFileSync(file);
    if (bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9)
      throw new Error("Damaged recording frame");
    list.push(`file '${file.replaceAll("\\", "/")}'`);
    list.push(
      `duration ${Math.max(0.015, (captured.frames[i + 1]?.at ?? captured.duration) - frame.at).toFixed(5)}`,
    );
  }
  list.push(`file '${join(directory, captured.frames.at(-1).file).replaceAll("\\", "/")}'`);
  const concat = join(artifacts, scene.id + ".txt");
  writeFileSync(concat, list.join("\n"));
  const movie = join(artifacts, scene.id + ".mp4");
  const filter = `[0:v]setpts=PTS*${scene.seconds / captured.duration},fps=24,crop=720:930:0:80,scale=1016:1312:flags=lanczos,tpad=stop_mode=clone:stop_duration=${scene.seconds},trim=duration=${scene.seconds},setpts=PTS-STARTPTS[screen];color=c=0x03112d:s=1080x1920:r=24:d=${scene.seconds}[bg];[bg][screen]overlay=x=32:y=318[layout];[layout][2:v]overlay=0:0:format=auto,format=yuv420p,fade=t=in:st=0:d=0.15,fade=t=out:st=${scene.seconds - 0.18}:d=0.18[v];[1:a]atempo=1.35,adelay=200|200,apad,atrim=duration=${scene.seconds},afade=t=out:st=${scene.seconds - 0.25}:d=0.25[a]`;
  run(
    [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concat,
      "-i",
      join(output, "audio", scene.id + ".wav"),
      "-loop",
      "1",
      "-i",
      join(artifacts, `overlay-${index}.png`),
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-t",
      String(scene.seconds),
      "-c:v",
      "libx264",
      "-threads",
      "2",
      "-filter_complex_threads",
      "2",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      movie,
    ],
    scene.id,
  );
  console.log(`Exported ${scene.id}: ${scene.seconds.toFixed(2)}s with narration.`);
}
const movieList = join(artifacts, "movies.txt");
writeFileSync(
  movieList,
  scenes.map((s) => `file '${join(artifacts, s.id + ".mp4").replaceAll("\\", "/")}'`).join("\n"),
);
const movie = join(output, "INOVA-IA-na-pratica.mp4");
run(
  [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    movieList,
    "-vf",
    "fps=24",
    "-c:v",
    "libx264",
    "-threads",
    "2",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-af",
    "volume=5dB",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    movie,
  ],
  "Final MP4",
);
run(["-i", movie, "-f", "null", "-"], "Decode final MP4");
run(["-ss", "1", "-i", movie, "-frames:v", "1", join(output, "capa-video.png")], "Cover");
run(
  [
    "-ss",
    String(scenes[3].start + 1.5),
    "-i",
    movie,
    "-frames:v",
    "1",
    join(output, "previa-IA.png"),
  ],
  "AI preview",
);
const info = spawnSync(ffmpeg, ["-hide_banner", "-i", movie], {
  encoding: "utf8",
  windowsHide: true,
}).stderr;
if (!info.includes("1080x1920") || !info.includes("Audio: aac") || !info.includes("24 fps"))
  throw new Error("Wrong output format");
writeFileSync(
  join(output, "validacao-video.json"),
  JSON.stringify(
    {
      actualInterfaceRecording: true,
      liveGeminiGeneration: true,
      width: 1080,
      height: 1920,
      fps: 24,
      seconds: total,
      syntheticNarration: { language: "pt-BR", voice: "Microsoft Maria Desktop" },
      audioCodec: "AAC",
      videoCodec: "H264",
      fullMp4DecodePassed: true,
      clips: scenes,
    },
    null,
    2,
  ),
);
writeFileSync(
  join(output, "legenda.txt"),
  "A inteligência artificial do INOVA ajuda o médico a chegar à consulta com as informações organizadas.\n\nNeste vídeo, mostramos a IA funcionando na demonstração: agenda e relatos entram no contexto; após autorização, o assistente gera um resumo com pontos para conferir e informações faltantes. O médico pode abrir os registros originais para revisar.\n\nO briefing organiza textos e contagens de anexos; não analisa o conteúdo dos PDFs e áudios. A decisão clínica permanece com o médico. Perfis e informações fictícios.\n\nQuer conhecer? Envie INOVA por mensagem.\n\n#INOVA #InteligenciaArtificial #SaudeDigital #TecnologiaEmSaude #CuidadoConectado\n",
);
writeFileSync(
  join(output, "LEIA-ME.md"),
  `# INOVA — IA na prática\n\nVídeo vertical 1080 × 1920, 24 fps, ${total.toFixed(1)} segundos. Gravação real das interações da interface com geração Gemini conferida; dados fictícios. Narração sintética pt-BR, Microsoft Maria Desktop. Não é uma sequência de fotografias de tela.\n\nUse INOVA-IA-na-pratica.mp4, capa-video.png e legenda.txt para postar. Não houve publicação automática nem alteração no aplicativo. Um envio e uma consulta demonstrativos foram criados para apresentar o fluxo.\n\nA IA resume os textos fornecidos, separa pontos para conferir e lacunas. Conteúdo dos anexos não foi analisado no briefing. O profissional mantém a decisão clínica.\n\nFonte, áudio e edição HTML incluídos para revisão; gravações intermediárias ficam em artifacts/inova-ai-reel-recordings fora do Git.\n`,
);
console.log(
  `Validated narrated live-screen Reel: ${total.toFixed(1)}s, 1080x1920, 24fps, H264/AAC.`,
);
