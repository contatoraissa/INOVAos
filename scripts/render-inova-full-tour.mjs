import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { presentationBrowser } from "./presentation-browser.mjs";
import { scenes } from "./inova-full-tour-scenes.mjs";
import { inovaInfinityPath, inovaLogoCyan } from "../src/data/inova-brand.ts";

const output = resolve("docs/entregaveis/instagram/INOVA_portais_completos_2026-10-10");
const artifacts = resolve("artifacts/inova-full-tour-export");
const recordings = resolve("artifacts/inova-full-tour-recordings");
const audio = resolve("artifacts/inova-full-tour-audio");
const ffmpeg = resolve(
  "artifacts/social-tools/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe",
);
const speed = 1.35;
const narrationDelay = 0.24;
mkdirSync(artifacts, { recursive: true });
mkdirSync(output, { recursive: true });
cpSync(
  resolve("docs/entregaveis/instagram/INOVA_posts_fixos_2026-10-10/assets/fonts"),
  join(output, "assets/fonts"),
  { recursive: true },
);
mkdirSync(join(artifacts, "fonts"), { recursive: true });
// The repository font files contain TrueType data despite their original .woff2 extension.
cpSync(join(output, "assets/fonts/dm-sans-3.woff2"), join(artifacts, "fonts/DM-Sans-Bold.ttf"));
function run(args, name, timeout = 300000) {
  const result = spawnSync(
    ffmpeg,
    ["-hide_banner", "-loglevel", "error", "-y", "-xerror", ...args],
    { encoding: "utf8", windowsHide: true, timeout },
  );
  if (result.status !== 0) throw new Error(name + ": " + (result.stderr || result.error?.message));
}
function waveSeconds(file) {
  const b = readFileSync(file);
  let rate, size;
  for (let o = 12; o + 8 <= b.length;) {
    const id = b.toString("ascii", o, o + 4),
      n = b.readUInt32LE(o + 4);
    if (id === "fmt ") rate = b.readUInt32LE(o + 16);
    if (id === "data") size = n;
    o += 8 + n + (n % 2);
  }
  if (!rate || !size) throw new Error("Invalid narration WAV");
  return size / rate;
}
function srtTime(t) {
  const ms = Math.round(t * 1000);
  return (
    [Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60]
      .map((n) => String(n).padStart(2, "0"))
      .join(":") +
    "," +
    String(ms % 1000).padStart(3, "0")
  );
}
function assTime(t) {
  const cs = Math.round(t * 100);
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}
function wrap(text) {
  const parts = text.split(/\s+/),
    lines = [""];
  for (const word of parts) {
    const i = lines.length - 1;
    if ((lines[i] + " " + word).trim().length > 42 && lines[i]) lines.push(word);
    else lines[i] = (lines[i] + " " + word).trim();
  }
  if (lines.length > 2) throw new Error("Subtitle has more than two lines: " + text);
  return lines;
}
const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nScaledBorderAndShadow: yes\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,DM Sans,46,&H00FFFFFF,&H00FFFFFF,&H00071124,&H00071124,0,0,0,0,100,100,0,0,1,1.5,0,5,70,70,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
let total = 0;
const allCues = [];
for (const [index, s] of scenes.entries()) {
  s.seconds =
    Math.ceil((waveSeconds(join(audio, s.id + ".wav")) / speed + narrationDelay + 0.65) * 24) / 24;
  s.start = total;
  total += s.seconds;
  s.index = index;
  const text = s.phrases.join(" "),
    words = JSON.parse(
      readFileSync(join(audio, s.id + ".words.json"), "utf8").replace(/^\uFEFF/, ""),
    );
  if (
    words.length < 10 ||
    words.some((w, i) => i && w.Start < words[i - 1].Start) ||
    words.at(-1).Start >= waveSeconds(join(audio, s.id + ".wav"))
  )
    throw new Error("Missing/invalid speech timing: " + s.id);
  const cues = [];
  let first = 0;
  for (let i = 0; i < words.length; i++) {
    const endPosition = words[i + 1]?.Position ?? text.length;
    const current = text.slice(words[first].Position, endPosition).trim();
    const next = words[i + 2]?.Position ?? text.length;
    const nextLength = text.slice(words[first].Position, next).trim().length;
    const sentenceEnd = /[.!?]$/.test(current);
    if (
      i === words.length - 1 ||
      nextLength > 78 ||
      i - first >= 8 ||
      (sentenceEnd && i - first >= 3)
    ) {
      const start = narrationDelay + words[first].Start / speed;
      const end = words[i + 1] ? narrationDelay + words[i + 1].Start / speed : s.seconds - 0.25;
      cues.push({ start, end, text: current, lines: wrap(current) });
      first = i + 1;
    }
  }
  if (
    cues.map((c) => c.text).join(" ") !== text ||
    cues.some((c) => c.end <= c.start || c.end > s.seconds)
  )
    throw new Error("Invalid or incomplete captions: " + s.id);
  s.cues = cues;
  for (const c of cues) allCues.push({ ...c, start: c.start + s.start, end: c.end + s.start });
  writeFileSync(
    join(artifacts, s.id + ".ass"),
    header +
      cues
        .map(
          (c) =>
            `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Caption,,0,0,0,,{\\pos(540,1696)}${c.lines.join("\\N")}`,
        )
        .join("\n"),
  );
}
writeFileSync(
  join(output, "INOVA-medico-e-paciente.srt"),
  allCues
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.lines.join("\n")}\n`)
    .join("\n"),
);
const logo = `<div class="logo"><span>IN</span><svg viewBox="0 0 160 80" fill="none"><path d="${inovaInfinityPath}" stroke="${inovaLogoCyan}" stroke-width="11" stroke-linecap="round"/></svg><span>VA</span></div>`;
const overlay = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>@import url('assets/fonts/manrope.css');@import url('assets/fonts/dm-sans.css');*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;background:transparent;color:white;overflow:hidden;font-family:'DM Sans',sans-serif}.top{position:absolute;inset:0 0 auto;height:290px;padding:60px 54px 20px;background:#03112d}.brand{display:flex;justify-content:space-between;align-items:center}.logo{display:flex;align-items:center;gap:.087em;font:400 46px Manrope;letter-spacing:.15em}.logo svg{width:1.8em;height:.96em}.role{color:#00b8e6;font:500 25px Manrope;letter-spacing:2px;padding:12px 22px;border:1px solid #22516e;border-radius:40px}.title{font:500 56px/1.1 Manrope;letter-spacing:-1.1px;margin:38px 0 0;max-width:970px}.chapter{position:absolute;left:54px;top:250px;font-size:20px;color:#aec9d9;letter-spacing:1.2px}.bottom{position:absolute;left:0;right:0;top:1570px;bottom:0;background:linear-gradient(transparent,#03112d 12%,#03112d)}.source{position:absolute;left:54px;right:54px;top:1806px;text-align:center;font:400 22px 'DM Sans';color:#afc6d8}.source span{color:#00b8e6}.progress{position:absolute;top:1863px;left:54px;right:54px;height:3px;background:#20445f}.progress i{display:block;background:#00b8e6;height:3px}.accent{position:absolute;left:32px;top:300px;bottom:350px;border:1px solid #2a4966;border-radius:20px;width:1016px;pointer-events:none}</style><div class="top"><div class="brand">${logo}<div class="role"></div></div><h1 class="title"></h1><div class="chapter"></div></div><div class="accent"></div><div class="bottom"></div><div class="source"><span>●</span> Interface do INOVA · Demonstração com dados fictícios</div><div class="progress"><i></i></div><script>const scenes=${JSON.stringify(scenes.map(({ title, role, id }) => ({ title, role, id })))};window.scene=i=>{const s=scenes[i];document.querySelector('.title').textContent=s.title;document.querySelector('.role').textContent='INOVA '+s.role.toUpperCase();document.querySelector('.chapter').textContent=(['m01','m09','m10','m20','m22','p09','p12','p19'].includes(s.id)?'INTELIGÊNCIA ARTIFICIAL · ':'')+'FUNCIONALIDADE '+String(i+1).padStart(2,'0')+' / '+scenes.length;document.querySelector('.progress i').style.width=(i+1)/scenes.length*100+'%'};window.scene(0);</script></html>`;
writeFileSync(join(output, "edicao-editavel.html"), overlay);
const b = await presentationBrowser("http://127.0.0.1:9223");
try {
  await b.command("Emulation.setDeviceMetricsOverride", {
    width: 1080,
    height: 1920,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await b.command("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });
  await b.command("Page.navigate", {
    url: pathToFileURL(join(output, "edicao-editavel.html")).href,
  });
  await b.wait("typeof window.scene==='function'");
  await b.evaluate("document.fonts.ready");
  await b.pause(400);
  for (const [i, s] of scenes.entries()) {
    await b.evaluate(
      `window.scene(${i});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`,
    );
    if (await b.evaluate("document.querySelector('.title').getBoundingClientRect().bottom>245"))
      throw new Error("Chapter heading overlaps");
    const shot = await b.command("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(artifacts, s.id + "-overlay.png"), Buffer.from(shot.data, "base64"));
  }
} finally {
  await b.close();
}
writeFileSync(
  join(output, "roteiro-e-capitulos.json"),
  JSON.stringify({ seconds: total, scenes }, null, 2),
);
console.log(
  `Prepared ${scenes.length} chapters, ${allCues.length} synchronized captions, ${(total / 60).toFixed(2)} minutes.`,
);
if (process.argv.includes("--prepare-only")) {
  console.log("Overlay and subtitle preparation validated.");
} else {
  for (const s of scenes) {
    const movie = join(artifacts, s.id + ".mp4");
    const replaceAt = process.argv.indexOf("--replace");
    const replaceIds = replaceAt < 0 ? [] : process.argv[replaceAt + 1].split(",");
    if (existsSync(movie) && process.argv.includes("--resume") && !replaceIds.includes(s.id)) {
      console.log("Reused " + s.id);
      continue;
    }
    const directory = s.reuse
      ? resolve("artifacts/inova-ai-reel-recordings", s.reuse)
      : join(recordings, s.id);
    const captured = JSON.parse(readFileSync(join(directory, "frames.json"), "utf8"));
    const list = [];
    for (const [i, f] of captured.frames.entries()) {
      const file = join(directory, f.file),
        bytes = readFileSync(file);
      if (
        bytes.length < 1000 ||
        bytes.readUInt16BE(0) !== 0xffd8 ||
        bytes.readUInt16BE(bytes.length - 2) !== 0xffd9
      )
        throw new Error("Damaged live recording");
      list.push(
        `file '${file.replaceAll("\\", "/")}'`,
        `duration ${Math.max(0.015, (captured.frames[i + 1]?.at ?? captured.duration) - f.at).toFixed(5)}`,
      );
    }
    list.push(`file '${join(directory, captured.frames.at(-1).file).replaceAll("\\", "/")}'`);
    const concat = join(artifacts, s.id + ".txt");
    writeFileSync(concat, list.join("\n"));
    const filter = `[0:v]fps=24,crop=720:900:0:80,scale=1016:1270:flags=lanczos,tpad=stop_mode=clone:stop_duration=${s.seconds},trim=duration=${s.seconds},setpts=PTS-STARTPTS[screen];color=c=0x03112d:s=1080x1920:r=24:d=${s.seconds}[bg];[bg][screen]overlay=x=32:y=300[layout];[layout][2:v]overlay=0:0:format=auto,ass='artifacts/inova-full-tour-export/${s.id}.ass':fontsdir='artifacts/inova-full-tour-export/fonts',format=yuv420p,fade=t=in:st=0:d=0.12,fade=t=out:st=${s.seconds - 0.12}:d=0.12[v];[1:a]atempo=${speed},volume=5dB,adelay=240|240,apad,atrim=duration=${s.seconds},afade=t=out:st=${s.seconds - 0.2}:d=0.2[a]`;
    run(
      [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concat,
        "-i",
        join(audio, s.id + ".wav"),
        "-loop",
        "1",
        "-i",
        join(artifacts, s.id + "-overlay.png"),
        "-filter_complex",
        filter,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-t",
        String(s.seconds),
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
      s.id,
    );
    console.log(`Exported ${s.id}: ${s.seconds.toFixed(1)}s, burned-in subtitles.`);
  }
  for (const [name, selection] of [
    ["INOVA-medico-e-paciente", scenes],
    ["INOVA-medico", scenes.filter((s) => s.role === "Médico")],
    ["INOVA-paciente", scenes.filter((s) => s.role === "Paciente")],
  ]) {
    const list = join(artifacts, name + ".txt");
    writeFileSync(
      list,
      selection
        .map((s) => `file '${join(artifacts, s.id + ".mp4").replaceAll("\\", "/")}'`)
        .join("\n"),
    );
    run(
      [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        list,
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        join(output, name + ".mp4"),
      ],
      name,
    );
  }
  const movie = join(output, "INOVA-medico-e-paciente.mp4");
  run(["-i", movie, "-f", "null", "-"], "Decode full video", 600000);
  for (const id of ["m09", "p09", "p11"]) {
    const s = scenes.find((s) => s.id === id);
    run(
      [
        "-ss",
        String(s.start + 2),
        "-i",
        movie,
        "-frames:v",
        "1",
        join(output, "previa-" + id + ".png"),
      ],
      "Preview " + id,
    );
  }
  writeFileSync(
    join(output, "LEIA-ME.md"),
    `# INOVA — médico e paciente\n\nVídeo completo: **${Math.floor(total / 60)}min ${Math.round(total % 60)}s**, vertical 1080 × 1920, com narração em português e legendas embutidas.\n\nTambém há arquivos separados dos portais médico e paciente. A edição preserva a marca aprovada e usa gravações da interface. Nenhuma tela administrativa foi incluída.\n\nOs exemplos usam dados fictícios. A cotação S2 é uma simulação. Os escores de predisposição genética ainda não estão configurados. A IA exige autorização nos fluxos mostrados e revisão do conteúdo; não substitui o médico.\n\nA narração sintética utiliza Microsoft Maria Desktop. As legendas foram sincronizadas pelos eventos de palavras do sintetizador e o mesmo fator de velocidade usado no áudio. O SRT permite ajustes futuros.\n`,
  );
  writeFileSync(
    join(output, "legenda-instagram.txt"),
    "Conheça o INOVA por dentro.\n\nPara o médico: pacientes, laudos, resultados, agenda, relatórios e IA para apoiar a preparação da consulta.\nPara o paciente: preparação, mensagens, PDFs, resultados, orientações e acompanhamento em um só portal.\n\nInteligência artificial para organizar informações, com a decisão nas mãos do profissional.\n\nVídeo da demonstração com dados fictícios. Cotação de laboratórios simulada e escores genéticos ainda não configurados.\n\nQuer conhecer o INOVA? Fale com a gente.\n\n#INOVA #SaudeDigital #InteligenciaArtificial #Medicina #CuidadoConectado\n",
  );
  writeFileSync(
    join(output, "validacao-video.json"),
    JSON.stringify(
      {
        date: "2026-10-10",
        onlyDoctorAndPatient: true,
        chapters: scenes.length,
        burnedInSubtitles: true,
        timedWordBoundaries: true,
        captionCues: allCues.length,
        narratedWords: scenes
          .map((s) => s.phrases.join(" ").split(" ").length)
          .reduce((a, b) => a + b, 0),
        seconds: total,
        fullDecodePassed: true,
        width: 1080,
        height: 1920,
      },
      null,
      2,
    ),
  );
  console.log("Complete export and decoding verified.");
}
