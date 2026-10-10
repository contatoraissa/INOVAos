import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { presentationBrowser } from "./presentation-browser.mjs";

const output = resolve("docs/entregaveis/instagram/INOVA_contexto_2026-10-10");
const frames = resolve("artifacts/inova-social-video-frames");
const ffmpeg =
  process.env.INOVA_FFMPEG_PATH ??
  resolve("artifacts/social-tools/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe");
if (!existsSync(ffmpeg)) throw new Error("Set INOVA_FFMPEG_PATH to the ffmpeg executable.");
mkdirSync(frames, { recursive: true });
const fps = 24;
const seconds = 24;
const browser = await presentationBrowser();
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
  const fontCheck = await browser.evaluate(
    "document.fonts.check('700 79px Manrope') && document.fonts.check('400 34px \"DM Sans\"')",
  );
  if (!fontCheck) throw new Error("Video brand fonts did not load.");
  const scenes = [];
  for (let i = 0; i < 4; i++) {
    await browser.evaluate(`window.renderFrame(${i * 6 + 1})`);
    const item = await browser.evaluate(
      `(()=>{const s=document.querySelector('[data-scene="${i}"]');return {index:${i},bottom:s.getBoundingClientRect().bottom,footerTop:document.querySelector('footer').getBoundingClientRect().top};})()`,
    );
    if (item.bottom > item.footerTop - 30)
      throw new Error("Video text collision: " + JSON.stringify(item));
    scenes.push(item);
    if (i === 0) {
      const cover = await browser.command("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(output, "capa-video.png"), Buffer.from(cover.data, "base64"));
    }
  }
  for (let frame = 0; frame < fps * seconds; frame++) {
    await browser.evaluate(`window.renderFrame(${frame / fps})`);
    const result = await browser.command("Page.captureScreenshot", { format: "jpeg", quality: 94 });
    writeFileSync(
      join(frames, `frame-${String(frame).padStart(5, "0")}.jpg`),
      Buffer.from(result.data, "base64"),
    );
    if (frame % (6 * fps) === 0)
      console.log(`Rendered scene ${Math.floor(frame / (6 * fps)) + 1}/4`);
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
        fontCheck,
        scenes,
        audio: false,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
const video = join(output, "INOVA-contexto-video.mp4");
const encoded = spawnSync(
  ffmpeg,
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-framerate",
    String(fps),
    "-i",
    join(frames, "frame-%05d.jpg"),
    "-frames:v",
    String(fps * seconds),
    "-c:v",
    "libx264",
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
  throw new Error(encoded.stderr || encoded.error?.message || "Video export failed.");
const inspected = spawnSync(ffmpeg, ["-hide_banner", "-i", video, "-f", "null", "-"], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 60000,
});
if (
  inspected.status !== 0 ||
  !inspected.stderr.includes("1080x1920") ||
  !inspected.stderr.includes("00:00:24.00")
)
  throw new Error("Exported MP4 did not validate.");
console.log("Validated MP4: 1080x1920, 24 seconds, H.264, 24 fps, no audio.");
