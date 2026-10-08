import { writeFileSync, mkdirSync } from "node:fs";
const tabs = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const socket = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let id = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const r = JSON.parse(data);
  if (r.id) {
    pending.get(r.id)?.(r.result);
    pending.delete(r.id);
  }
});
const call = (method, params = {}) =>
  new Promise((resolve) => {
    pending.set(++id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
const run = (expression) =>
  call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
const click = (label) =>
  run(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})?.click()`,
  );
await call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1050,
  deviceScaleFactor: 1,
  mobile: false,
});
await click("Ver pedido e consultar valores");
await new Promise((resolve) => setTimeout(resolve, 600));
await run(
  `(()=>{const input=document.querySelector('#order-cep');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'18035-000');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
);
await new Promise((resolve) => setTimeout(resolve, 200));
await click("Simular consulta de preços");
await new Promise((resolve) => setTimeout(resolve, 500));
await click("Explorar exames e laboratórios");
await new Promise((resolve) => setTimeout(resolve, 300));
await click("Comparar laboratórios");
await new Promise((resolve) => setTimeout(resolve, 300));
mkdirSync("artifacts", { recursive: true });
const screenshot = await call("Page.captureScreenshot", { format: "png" });
writeFileSync("artifacts/s2-journey.png", Buffer.from(screenshot.data, "base64"));
socket.close();
