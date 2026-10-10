import test from "node:test";
import assert from "node:assert/strict";
import { accountOrders,accountGuidance,accountSubmissions,emptyConsultationPayload } from "../src/lib/account-care-adapters.ts";
import { consultationPayload } from "../src/lib/real-consultation-contract.ts";
import { patientPreferencesSchema } from "../src/lib/real-workspace-contract.ts";
import { visiblePatientEntries } from "../src/lib/account-patient-visibility.ts";
import { accountNotices,markAccountNotices } from "../src/lib/account-notifications.server.ts";
const user="91000000-0000-4000-8000-000000000002";
const chart="91000000-0000-4000-8000-000000000001";
const id="91000000-0000-4000-8000-000000000003";
const config={url:"https://example.test",key:"synthetic-key"};
const entry=(kind,status="published",payload={})=>({
  id,patient_id:chart,kind,status,created_at:"2026-10-01T12:00:00Z",updated_at:"2026-10-02T12:00:00Z",
  payload:{...emptyConsultationPayload(),title:"Own chart record",...payload},
});
test("real care adapters preserve arbitrary actual exams, sources, ownership and release state",()=>{
  const rows=[entry("order","published",{exams:["Exame fora do catálogo"],text:"Anotação própria"}),entry("order","draft",{exams:["Outro"]}),entry("guidance","published",{sourceName:"Fonte conferida",sourceUrl:"https://example.test/source",sourceDate:"2026-10-01",orderId:id})];
  const orders=accountOrders(rows,"Médico próprio","987/SP");
  assert.equal(orders.length,2);assert.equal(orders[0].patientId,chart);assert.equal(orders[0].doctorCrm,"987/SP");
  assert.equal(orders[0].exams[0].name,"Exame fora do catálogo");assert.equal(orders[1].releasedAt,null);
  const guides=accountGuidance(rows,"Médico próprio");
  assert.equal(guides[0].sourceName,"Fonte conferida");assert.equal(guides[0].orderId,id);
  assert.equal(accountGuidance([entry("guidance","cancelled")])[0].publishedAt,null);
});
test("real submission receipts retain text and all legacy/multiple attachments without inventing reading",()=>{
  const payload={symptoms:"Mensagem própria",audio:{mime:"audio/webm",data:"AA=="},audios:[{field:"questions",mime:"audio/ogg",data:"AQ=="}],document:{name:"Legado.pdf",data:"AA=="},documents:[{name:"Atual.pdf",data:"AQ==",kind:"Genética"}]};
  const sent=accountSubmissions([entry("preparation","published",payload)])[0];
  assert.equal(sent.reviewed,false);assert.equal(sent.reviewedAt,null);assert.equal(sent.notes.symptoms,payload.symptoms);
  assert.equal(sent.audios.length,2);assert.deepEqual(sent.documents.map(d=>d.name),["Atual.pdf","Legado.pdf"]);
  assert.equal(accountSubmissions([entry("preparation","reviewed",payload)])[0].reviewedAt,"2026-10-02T12:00:00Z");
  assert.equal(accountSubmissions([entry("preparation","draft")]).length,0);
});
test("patient visibility retains published cancellations and rejects private family and cancelled drafts",()=>{
  const cancelled=entry("order","cancelled");const draft={...cancelled,id:"91000000-0000-4000-8000-000000000004"};
  const rows=[entry("guidance"),entry("family"),cancelled,draft,entry("return","draft")];
  assert.deepEqual(visiblePatientEntries(rows,new Set([id])).map(e=>e.kind),["guidance","order"]);
  assert.equal(visiblePatientEntries([cancelled],new Set()).length,0);
});
test("real audio fields reject duplicates while preserving legacy audio and typed PDFs",()=>{
  const value={...emptyConsultationPayload(),title:"Preparação própria"};
  const audio={field:"symptoms",mime:"audio/webm",data:"AA=="};
  assert.equal(consultationPayload.safeParse({...value,audios:[audio,audio]}).success,false);
  assert.ok(consultationPayload.safeParse({...value,audio:{mime:"audio/ogg",data:"AA=="},audios:[audio,{...audio,field:"questions"}],documents:[{name:"Original.pdf",data:"AA==",kind:"Genética"}]}).success);
});
test("patient preferences keep old favorites compatible and reject future performed dates, invalid CEP and HTTP sites",()=>{
  const value={phone:"",email:"patient@example.test",favorites:[{name:"Laboratório próprio",address:"Rua própria",phone:""}]};
  assert.ok(patientPreferencesSchema.safeParse(value).success);
  assert.ok(patientPreferencesSchema.safeParse({...value,progress:[{patientId:chart,orderId:id,preferredLab:"Laboratório próprio",performedOn:"2026-01-01"}]}).success);
  for(const performedOn of ["2099-01-01","2026-02-30"])
    assert.equal(patientPreferencesSchema.safeParse({...value,progress:[{patientId:chart,orderId:id,preferredLab:"",performedOn}]}).success,false);
  for(const extra of [{cep:"123"},{website:"http://example.test"}])
    assert.equal(patientPreferencesSchema.safeParse({...value,favorites:[{...value.favorites[0],...extra}]}).success,false);
});
test("notification lookup is user scoped and resolves raw published events to the correct record type",async()=>{
  const notices=await accountNotices(config,user,async url=>{
    const query=new URL(url).searchParams;
    assert.equal(query.get("user_id"),"eq."+user);
    assert.equal(query.get("limit"),"100");
    assert.ok(query.get("select").includes("inova_consultation_entries(kind)"));
    return new Response(JSON.stringify([{id,event:"published",entry:{kind:"guidance"}},{id,event:"agenda_confirmed",entry:null}]));
  });
  assert.equal(notices[0].event,"guidance_published");assert.equal(notices[1].event,"agenda_confirmed");
  assert.equal("entry" in notices[0],false);
});
test("single notification reading scopes the PATCH to its owner and leaves other unread notices untouched",async()=>{
  let called=0;
  const fetcher=async(url,options)=>{
    called++;const query=new URL(url).searchParams;
    assert.equal(query.get("user_id"),"eq."+user);assert.equal(query.get("id"),"in.("+id+")");
    assert.equal(query.get("read_at"),"is.null");assert.equal(options.method,"PATCH");
    assert.ok(Number.isFinite(Date.parse(JSON.parse(options.body).read_at)));
    return new Response(null,{status:204});
  };
  assert.equal(await markAccountNotices(config,user,[id],fetcher),null);
  assert.equal(called,1);
  await assert.rejects(markAccountNotices(config,user,["id);user_id=neq."+user],fetcher));
  assert.equal(called,1);
});
