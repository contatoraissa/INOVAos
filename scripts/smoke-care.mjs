import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.env.INOVA_TEST_URL ?? "http://192.168.0.2:8080";
const targets = await fetch("http://127.0.0.1:9222/json/list").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("Start headless Chrome on port 9222");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let counter = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", ({ data }) => {
  const result = JSON.parse(String(data));
  if (result.id) {
    const item = pending.get(result.id);
    pending.delete(result.id);
    if (result.error) item?.reject(new Error(result.error.message));
    else item?.resolve(result.result);
  }
  if (result.method === "Runtime.exceptionThrown")
    errors.push(
      result.params.exceptionDetails.exception?.description ?? result.params.exceptionDetails.text,
    );
});
const command = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++counter;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description ?? "Evaluation failed");
  return result.result.value;
}
async function wait(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out: " + expression);
}
async function fill(selector, value) {
  await wait(
    `Object.keys(document.querySelector(${JSON.stringify(selector)}) || {}).some(key=>key.startsWith('__reactProps'))`,
  );
  await evaluate(
    `(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
}
async function click(label) {
  await evaluate(
    `(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===${JSON.stringify(label)});if(!button)throw new Error('Missing button');button.click();})()`,
  );
}
async function navigate(path, selector) {
  await command("Page.navigate", { url: base + path });
  await wait(
    `location.pathname===${JSON.stringify(path)} && document.querySelector(${JSON.stringify(selector)})`,
  );
  await wait(
    `Object.keys(document.querySelector(${JSON.stringify(selector)}) || {}).some(key=>key.startsWith('__reactProps'))`,
  );
}
async function doctor() {
  await navigate("/patients/mariana-oliveira", "main button");
  await click("Solicitar exames");
  await wait('document.querySelector("#search-order-exams")');
}
async function patient() {
  await navigate("/acesso-paciente", "#patient-email");
  await evaluate('document.querySelector("form").requestSubmit()');
  await wait('location.pathname==="/portal-paciente" && document.querySelector("nav")');
  await click("Exames solicitados");
  await wait(
    'document.querySelector("main").innerText.includes("Confira os exames que seu médico liberou")',
  );
}
async function select(selector, value) {
  await wait(`document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(
    `(()=>{const item=document.querySelector(${JSON.stringify(selector)});item.value=${JSON.stringify(value)};item.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
}
async function section(label, heading) {
  await click(label);
  await wait(
    `document.querySelector('main h1')?.textContent===${JSON.stringify(heading ?? label)}`,
  );
  if (
    [
      "Avisos",
      "Linha do tempo",
      "Laboratórios favoritos",
      "Preparo dos exames",
      "Orientações do médico",
      "Próximos passos",
    ].includes(label)
  )
    await wait(`document.querySelector('main').textContent.includes('Atualizar acompanhamento')`);
}
async function doctorGuidance() {
  await navigate("/patients/mariana-oliveira", "main button");
  await click("Orientações ao paciente");
  await wait(`document.querySelector('#guidance-title')`);
}
async function draftGuide(title, prepOrder) {
  await fill("#guidance-title", title);
  await fill("#guidance-text", "Texto fictício para verificar entrega e revisão no portal.");
  if (prepOrder) {
    await select("#guidance-category", "Preparo dos exames");
    await wait(`document.querySelector('#guidance-order option[value="${prepOrder}"]')`);
    await select("#guidance-order", prepOrder);
    await fill("#guidance-source", "Unidade fictícia de teste");
    await fill("#guidance-date", "2026-10-06");
    await fill("#guidance-url", "https://example.com/preparo-ficticio");
  }
  await click("Salvar rascunho da orientação");
  await wait(
    `[...document.querySelectorAll('[data-guidance-id]')].some(item=>item.textContent.includes(${JSON.stringify(title)}))`,
  );
  return evaluate(
    `[...document.querySelectorAll('[data-guidance-id]')].find(item=>item.textContent.includes(${JSON.stringify(title)})).dataset.guidanceId`,
  );
}
async function publish(id) {
  await wait(`document.querySelector('[data-guidance-id="${id}"]')`);
  await evaluate(`document.querySelector('[data-guidance-id="${id}"] input').click()`);
  await evaluate(
    `[...document.querySelector('[data-guidance-id="${id}"]').querySelectorAll('button')].find(item=>item.textContent.trim()==='Publicar para paciente').click()`,
  );
  await wait(
    `document.querySelector('[data-guidance-id="${id}"]').textContent.includes('Publicada ao paciente')`,
  );
}
const token = String(Date.now());
const note = "Pedido care fictício " + token;
const title = "Orientação de teste " + token;
const prepTitle = "Preparo de teste " + token;
const labName = "Unidade fictícia " + token;
try {
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await doctor();
  errors.length = 0;
  await evaluate(
    `[...document.querySelectorAll('form label')].find(item=>item.textContent.includes('Hemograma completo')).querySelector('input').click()`,
  );
  await fill("#order-notes", note);
  await click("Salvar rascunho do pedido");
  await wait(
    `[...document.querySelectorAll('[data-order-id]')].some(item=>item.textContent.includes(${JSON.stringify(note)}))`,
  );
  const orderId = await evaluate(
    `[...document.querySelectorAll('[data-order-id]')].find(item=>item.textContent.includes(${JSON.stringify(note)})).dataset.orderId`,
  );
  await evaluate(
    `document.querySelector('[data-order-id="${orderId}"]').querySelector('button').click()`,
  );
  await wait(
    `document.querySelector('[data-order-id="${orderId}"]').textContent.includes('Liberado ao paciente')`,
  );
  await doctorGuidance();
  const guideId = await draftGuide(title);
  assert.equal(
    await evaluate(`document.querySelector('[data-guidance-id="${guideId}"] button').disabled`),
    true,
  );
  await patient();
  await section("Orientações do médico");
  assert.equal(
    await evaluate(`document.querySelector('main').textContent.includes(${JSON.stringify(title)})`),
    false,
  );
  console.log("PASS: draft guidance is hidden and publishing requires review");
  await doctorGuidance();
  await publish(guideId);
  const prepId = await draftGuide(prepTitle, orderId);
  await publish(prepId);
  await patient();
  await section("Orientações do médico");
  await wait(`document.querySelector('main').textContent.includes(${JSON.stringify(title)})`);
  await section("Preparo dos exames");
  await wait(`document.querySelector('main').textContent.includes(${JSON.stringify(prepTitle)})`);
  assert.equal(
    await evaluate(
      `document.querySelector('main a[href="https://example.com/preparo-ficticio"]')!==null`,
    ),
    true,
  );
  assert.equal(
    await evaluate(`document.querySelector('main').textContent.includes('06/10/2026')`),
    true,
  );
  console.log("PASS: only published instructions appear with source, link and date");
  await section("Laboratórios favoritos");
  await fill("#favorite-name", labName);
  await fill("#favorite-cep", "01310-100");
  await fill("#favorite-address", "Endereço demonstrativo em São Paulo");
  await fill("#favorite-website", "https://example.com/");
  await click("Salvar laboratório favorito");
  await wait(
    `document.querySelector('main article')?.textContent.includes(${JSON.stringify(labName)}) || [...document.querySelectorAll('main article')].some(item=>item.textContent.includes(${JSON.stringify(labName)}))`,
  );
  await section("Exames solicitados");
  await wait(
    `document.querySelector('#order-favorite option') && document.querySelector('main').textContent.includes(${JSON.stringify(note)})`,
  );
  const labId = await evaluate(
    `[...document.querySelector('#order-favorite').options].find(item=>item.textContent.includes(${JSON.stringify(labName)})).value`,
  );
  await select("#order-favorite", labId);
  await fill("#order-performed", "2026-10-06");
  await click("Guardar acompanhamento");
  await wait(`document.querySelector('main').textContent.includes('Acompanhamento salvo')`);
  assert.equal(await evaluate(`document.querySelector('#order-cep').value`), "01310100");
  await section("Próximos passos");
  assert.equal(
    await evaluate(`document.querySelector('main').textContent.includes('sem laudo vinculado')`),
    true,
  );
  console.log(
    "PASS: favorites connect to order preference, date remains self reported and next steps detect pending report",
  );
  await section("Preparar consulta");
  await fill("#symptoms", "Sintomas fictícios de teste " + token);
  await evaluate(
    `(async()=>{const response=await fetch('/examples/laudo-laboratorial-ficticio.pdf');const file=new File([await response.blob()], 'Laudo care ficticio.pdf', {type:'application/pdf'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('input[aria-label="Adicionar laudo à preparação"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    `[...document.querySelectorAll('label')].some(item=>item.textContent.includes('Laudo care ficticio.pdf'))`,
  );
  await evaluate(
    `[...document.querySelectorAll('label')].find(item=>item.textContent.includes('Laudo care ficticio.pdf')).querySelector('input').click()`,
  );
  await select('select[aria-label="Relacionar envio a um pedido"]', orderId);
  await evaluate(
    `[...document.querySelectorAll('label')].find(item=>item.textContent.includes('Confirmo que as respostas')).querySelector('input').click()`,
  );
  await click("Revisar antes de enviar");
  await wait(
    `document.querySelector('[role="dialog"]')?.textContent.includes("Confira seu envio ao médico")`,
  );
  assert.equal(
    await evaluate(
      `document.querySelector('[role="dialog"]').textContent.includes("Laudo care ficticio.pdf")`,
    ),
    true,
  );
  assert.equal(
    await evaluate(
      `document.querySelector('[role="dialog"]').textContent.includes(${JSON.stringify("Sintomas fictícios de teste " + token)})`,
    ),
    true,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("main").textContent.includes("Recebido na caixa demonstrativa do médico")',
    ),
    false,
  );
  await click("Voltar e editar");
  await wait(`!document.querySelector('[role="dialog"]')`);
  assert.equal(
    await evaluate('document.querySelector("#symptoms").value'),
    "Sintomas fictícios de teste " + token,
  );
  await click("Revisar antes de enviar");
  await click("Confirmar envio ao médico");
  await wait(
    `document.querySelector('main').textContent.includes('Recebido na caixa demonstrativa do médico')`,
  );
  await wait(
    `document.querySelector('[aria-label="Status dos meus envios"]').textContent.includes("Enviado · aguardando revisão")`,
  );
  console.log(
    "PASS: review shows notes and selected PDF; returning preserves draft and does not send",
  );
  await section("Próximos passos");
  // Old test orders can still have pending reports. The current order must no longer count.
  assert.equal(
    await evaluate(
      `document.querySelector('main').textContent.includes('1 pedido(s) realizados sem laudo vinculado')`,
    ),
    false,
  );
  await navigate("/patients/mariana-oliveira", "main button");
  await click("Envios do paciente");
  await wait(
    `document.querySelector('main').textContent.includes(${JSON.stringify("Sintomas fictícios de teste " + token)})`,
  );
  assert.equal(
    await evaluate(
      `document.querySelector('main').textContent.includes(${JSON.stringify(orderId.slice(0, 8))})`,
    ),
    true,
  );
  await click("Marcar envio como revisado");
  await wait(`document.querySelector('main').textContent.includes('Revisado')`);
  await patient();
  await section("Preparar consulta");
  await wait(
    `document.querySelector('[aria-label="Status dos meus envios"]').textContent.includes("Revisado pelo médico")`,
  );
  await section("Avisos");
  await wait(
    `document.querySelector('main').textContent.includes('Seu envio foi revisado pelo médico')`,
  );
  await click("Marcar avisos como lidos");
  await wait(`document.querySelector('main').textContent.includes('0 aviso(s) não lido(s)')`);
  await patient();
  await section("Avisos");
  await wait(`document.querySelector('main').textContent.includes('0 aviso(s) não lido(s)')`);
  console.log(
    "PASS: submission and doctor review create real notifications; read state survives portal reload",
  );
  await section("Linha do tempo");
  await fill('[aria-label="Pesquisar linha do tempo"]', token);
  await wait(
    `document.querySelector('main article')?.textContent.includes(${JSON.stringify(token)})`,
  );
  await fill('[aria-label="Pesquisar linha do tempo"]', "");
  await select('[aria-label="Filtrar linha do tempo"]', "history");
  assert.equal(await evaluate(`document.querySelectorAll('main article').length`), 6);
  assert.equal(
    await evaluate(`document.querySelector('main').textContent.includes('dia não informado')`),
    true,
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"), false);
  await evaluate(`document.querySelector('button[aria-label="Abrir menu"]').click()`);
  assert.equal(
    await evaluate(
      `document.querySelector('nav').scrollHeight>document.querySelector('nav').clientHeight`,
    ),
    true,
  );
  console.log(
    "PASS: timeline filters actual events and fictive collections; mobile menu scrolls without page overflow",
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await doctorGuidance();
  await wait(`document.querySelector('[data-guidance-id="${guideId}"]')`);
  await evaluate(
    `[...document.querySelector('[data-guidance-id="${guideId}"]').querySelectorAll('button')].find(item=>item.textContent.trim()==='Retirar orientação').click()`,
  );
  await wait(
    `document.querySelector('[data-guidance-id="${guideId}"]').textContent.includes('Retirada')`,
  );
  await doctor();
  await wait(`document.querySelector('[data-order-id="${orderId}"]')`);
  await evaluate(
    `[...document.querySelector('[data-order-id="${orderId}"]').querySelectorAll('button')].find(item=>item.textContent.trim()==='Cancelar pedido').click()`,
  );
  await wait(
    `document.querySelector('[data-order-id="${orderId}"]').textContent.includes('Cancelado')`,
  );
  await patient();
  await section("Orientações do médico");
  assert.equal(
    await evaluate(`document.querySelector('main').textContent.includes(${JSON.stringify(title)})`),
    false,
  );
  await section("Preparo dos exames");
  assert.equal(
    await evaluate(
      `document.querySelector('main').textContent.includes(${JSON.stringify(prepTitle)})`,
    ),
    false,
  );
  await section("Laboratórios favoritos");
  await evaluate(
    `[...document.querySelectorAll('main article')].find(item=>item.textContent.includes(${JSON.stringify(labName)})).querySelector('button').click()`,
  );
  await wait(
    `![...document.querySelectorAll('main article')].some(item=>item.textContent.includes(${JSON.stringify(labName)}))`,
  );
  console.log("PASS: withdrawals, order cancellations and favorite removals propagate to patient");
  assert.deepEqual(errors, []);
  console.log("PASS: no care-flow runtime exceptions");
} finally {
  ws.close();
}
