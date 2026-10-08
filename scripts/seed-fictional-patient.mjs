import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { makePdf } from "./generate-example-pdfs.mjs";

const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l && !l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));
const url=env.SUPABASE_URL, key=env.SUPABASE_SECRET_KEY;
if(!url || !key) throw new Error('Configuração Supabase ausente.');
const headers={apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})};
async function request(path, body, extra={}) {
 const response=await fetch(url+path,{headers:{...headers,'Content-Type':'application/json',...extra.headers},method:body?'POST':'GET',body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000),...extra});
 if(!response.ok) throw new Error(`Etapa indisponível (${response.status}): ${path.split('?')[0]}. Confira as migrações SQL.`);
 return response.status===204?null:response.json();
}
const profiles=await request('/rest/v1/inova_account_details?full_name=eq.Alison%20Bianchin&account_type=eq.doctor&select=user_id');
const doctor=profiles.find(p=>p.user_id);
if(profiles.length!==1 || !doctor) throw new Error('Conta médica de Alison não encontrada de forma única.');
// Generated test CPF with valid checksum; no assertion of a real identity.
const cpf='90000000175';
const existing=await request(`/rest/v1/inova_medical_patients?doctor_id=eq.${doctor.user_id}&cpf=eq.${cpf}&select=id,name`);
let patient=existing[0];
if(patient && patient.name!=='Paciente Ficticio INOVA') throw new Error('CPF já usado por outro cadastro; interrompido.');
if(!patient) patient=await request('/rest/v1/rpc/inova_create_medical_patient',{p_doctor:doctor.user_id,p_name:'Paciente Ficticio INOVA',p_cpf:cpf,p_birth:'1990-05-15',p_notes:'DADOS FICTICIOS - teste de software. Nenhum atendimento real.'});
mkdirSync('docs/testes',{recursive:true});
for(const [date,values] of [['2026-08-10',['98','14,1','125']],['2026-09-15',['92','13,8','108']]]) {
 const observations=['Glicemia','Hemoglobina','Colesterol LDL'].map((name,i)=>({name,value:values[i],unit:i===1?'g/dL':'mg/dL',reference:'Nao definida neste teste',collection:date,flag:'sem_classificacao',page:1,quote:''}));
 const filename=`INOVA_ficticio_${date}.pdf`;
 const bytes=makePdf([['INOVA - DADOS FICTICIOS PARA TESTE','Sem validade clinica. Nao usar em atendimento.','Paciente: Paciente Ficticio INOVA',`Coleta: ${date}`, ...observations.map(o=>`${o.name}: ${o.value} ${o.unit}`),'Referencias nao definidas neste teste.']]);
 writeFileSync(`docs/testes/${filename}`,bytes);
 const hash=createHash('sha256').update(bytes).digest('hex');
 const found=await request(`/rest/v1/inova_medical_reports?doctor_id=eq.${doctor.user_id}&patient_id=eq.${patient.id}&sha256=eq.${hash}&select=id,reviewed_at`);
 let report=found[0];
 if(!report) {
  const id=randomUUID(),path=`${doctor.user_id}/${patient.id}/${id}.pdf`;
  const response=await fetch(`${url}/storage/v1/object/inova-reports/${path}`,{method:'POST',headers:{...headers,'Content-Type':'application/pdf','x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error(`Storage indisponível (${response.status}).`);
  report=await request('/rest/v1/rpc/inova_register_medical_report',{p_id:id,p_doctor:doctor.user_id,p_patient:patient.id,p_filename:filename,p_kind:'Laboratorial',p_path:path,p_hash:hash,p_bytes:bytes.length});
 }
 if(!report.reviewed_at) await request('/rest/v1/rpc/inova_review_manual_results',{p_id:report.id,p_doctor:doctor.user_id,p_date:date,p_summary:{subjectName:'Paciente Ficticio INOVA',pages:1,scope:'Dados sinteticos para teste de software; sem IA e sem validade clinica.',findings:[],limitations:[],observations}});
}
console.log('Paciente fictício preparado com dois PDFs e seis resultados revisados. Nenhum usuário Auth ou e-mail criado.');
