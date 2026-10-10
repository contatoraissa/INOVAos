import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { browserSession } from "./browser-session.mjs";

const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Identity browser checks require a local server.");
mkdirSync("artifacts", { recursive: true });
// A local test harness, never a product route or a real account.
writeFileSync(
  "artifacts/identity-ui-preview.tsx",
  `
  import React from 'react';
  import {createRoot} from 'react-dom/client';
  import {PatientAccountLinking} from '../src/components/inova/PatientAccountLinking';
  export function mount(doctor) {
    const host=document.createElement('div');
    host.id='identity-test-preview';
    document.querySelector('main').append(host);
    createRoot(host).render(React.createElement(PatientAccountLinking,{doctor}));
  }
`,
);
const browser = await browserSession();
const { command, evaluate, wait, click } = browser;
async function fill(name, value) {
  await evaluate(
    `(()=>{const input=document.querySelector('#identity-test-preview [name="${name}"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
}
try {
  await command("Page.navigate", { url: base + "/acesso-paciente" });
  await wait(
    "document.querySelector('#patient-email') && Object.keys(document.querySelector('#patient-email')).some(k=>k.startsWith('__reactProps'))",
  );
  // No passwords, signup, invitation email or database write is performed.
  const blocked = await evaluate(`(async()=>{
    const functions=await import('/src/lib/patient-identity.ts');
    const outcomes=[];
    for(const fn of [functions.listPatientRegistrations,functions.synchronizePatientRegistration]) {
      try {await fn();outcomes.push(false);}catch{outcomes.push(true);}
    }
    return outcomes;
  })()`);
  assert.deepEqual(blocked, [true, true]);
  console.log("PASS: anonymous visitors cannot list or claim patient registrations");

  await command("Page.navigate", { url: base + "/patients/new" });
  await wait(
    "document.querySelector('[name=name]') && Object.keys(document.querySelector('[name=name]')).some(k=>k.startsWith('__reactProps'))",
  );
  await evaluate(
    "(async()=>{const preview=await import('/artifacts/identity-ui-preview.tsx');preview.mount(true);})()",
  );
  await wait(
    "document.querySelector('#identity-test-preview [role=alert]') && [...document.querySelectorAll('button')].some(b=>b.textContent==='Cadastrar ou vincular paciente'&&!b.disabled)",
  );
  await click("Cadastrar ou vincular paciente");
  await wait("document.querySelector('#identity-test-preview form')");
  assert.equal(
    await evaluate("document.querySelector('#identity-test-preview [name=email]').required"),
    true,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#identity-test-preview [name=identityConfirmed]').required",
    ),
    true,
  );
  await fill("name", "Paciente Teste INOVA");
  await fill("cpf", "529.982.247-25");
  await fill("birth", "1994-03-14");
  await fill("email", "patient@example.test");
  assert.equal(
    await evaluate("document.querySelector('#identity-test-preview form').checkValidity()"),
    false,
  );
  await evaluate(
    "document.querySelector('#identity-test-preview [name=identityConfirmed]').click()",
  );
  assert.equal(
    await evaluate("document.querySelector('#identity-test-preview form').checkValidity()"),
    true,
  );
  await evaluate("document.querySelector('#identity-test-preview form').requestSubmit()");
  await wait(
    "document.querySelector('#identity-test-preview [role=alert]')?.textContent.includes('Acesso médico não autorizado')",
  );
  console.log(
    "PASS: physician form requires email and explicit approval; unauthorized save is rejected",
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"), false);
  console.log("PASS: enrollment panel does not overflow on mobile");
  assert.deepEqual(browser.exceptions, []);
} finally {
  await command("Emulation.clearDeviceMetricsOverride");
  await command("Page.navigate", { url: base + "/patients/new" });
  await wait("document.querySelector('[name=email]')");
  browser.close();
}
