-- Execute after INOVA_AREA_MEDICA_SQL_EDITOR.sql. Private PDFs and reviewed results.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('inova-reports','inova-reports',false,8388608,array['application/pdf'])
on conflict(id) do update set public=false, file_size_limit=8388608,
 allowed_mime_types=array['application/pdf'];
create table if not exists public.inova_medical_reports (
 id uuid primary key,
 doctor_id uuid not null references public.inova_profiles(id),
 patient_id uuid not null references public.inova_medical_patients(id),
 filename text not null check(length(filename) between 1 and 200),
 kind text not null check(kind in ('Laboratorial','Genética','Genômica')),
 object_path text not null unique,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 bytes integer not null check(bytes between 8 and 8388608),
 summary jsonb,
 model text,
 created_at timestamptz not null default now(),
 analyzed_at timestamptz,
 reviewed_at timestamptz,
 collection_date date,
 unique(doctor_id,patient_id,kind,sha256),
 check(summary is null or jsonb_typeof(summary)='object')
);
create table if not exists public.inova_medical_results (
 id bigint generated always as identity primary key,
 report_id uuid not null references public.inova_medical_reports(id),
 doctor_id uuid not null references public.inova_profiles(id),
 patient_id uuid not null references public.inova_medical_patients(id),
 position integer not null,
 name text not null,
 value text not null,
 unit text not null,
 reference text not null,
 collection_date date not null,
 flag text not null check(flag in ('reportado_alterado','reportado_critico','sem_classificacao')),
 source_page integer,
 source_quote text not null default '',
 unique(report_id,position)
);
alter table public.inova_medical_reports enable row level security;
alter table public.inova_medical_results enable row level security;
revoke all on public.inova_medical_reports,public.inova_medical_results from anon,authenticated;
grant select,insert,update on public.inova_medical_reports to service_role;
grant select,insert on public.inova_medical_results to service_role;
grant usage,select on sequence public.inova_medical_results_id_seq to service_role;
create index if not exists inova_reports_owner on public.inova_medical_reports(doctor_id,patient_id,created_at desc);
create index if not exists inova_results_owner on public.inova_medical_results(doctor_id,patient_id,collection_date);
create or replace function public.inova_register_medical_report(p_id uuid,p_doctor uuid,p_patient uuid,p_filename text,p_kind text,p_path text,p_hash text,p_bytes integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result public.inova_medical_reports;
begin
 if not exists(select 1 from public.inova_medical_patients where id=p_patient and doctor_id=p_doctor) then raise exception 'Patient not found';end if;
 if p_path<>p_doctor::text||'/'||p_patient::text||'/'||p_id::text||'.pdf' then raise exception 'Invalid path';end if;
 insert into public.inova_medical_reports(id,doctor_id,patient_id,filename,kind,object_path,sha256,bytes)
 values(p_id,p_doctor,p_patient,p_filename,p_kind,p_path,p_hash,p_bytes) returning * into result;
 return to_jsonb(result);
end;$$;
create or replace function public.inova_analyze_medical_report(p_id uuid,p_doctor uuid,p_summary jsonb,p_model text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result public.inova_medical_reports;
begin
 select * into result from public.inova_medical_reports where id=p_id and doctor_id=p_doctor for update;
 if not found or result.reviewed_at is not null then raise exception 'Report unavailable';end if;
 update public.inova_medical_reports set summary=p_summary,model=p_model,analyzed_at=now() where id=p_id returning * into result;
 return to_jsonb(result);
end;$$;
create or replace function public.inova_review_medical_report(p_id uuid,p_doctor uuid,p_date date)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result public.inova_medical_reports; observation jsonb; ordinal bigint;
begin
 select * into result from public.inova_medical_reports where id=p_id and doctor_id=p_doctor for update;
 if not found or result.summary is null then raise exception 'Report unavailable';end if;
 if result.reviewed_at is not null then return to_jsonb(result);end if;
 if p_date is null or p_date>current_date or p_date<date '1900-01-01' then raise exception 'Invalid collection date';end if;
 if result.kind='Laboratorial' then
  for observation,ordinal in select value, ordinality from jsonb_array_elements(result.summary->'observations') with ordinality loop
   insert into public.inova_medical_results(report_id,doctor_id,patient_id,position,name,value,unit,reference,collection_date,flag,source_page,source_quote)
   values(result.id,result.doctor_id,result.patient_id,ordinal::integer,observation->>'name',observation->>'value',observation->>'unit',observation->>'reference',p_date,observation->>'flag',(observation->>'page')::integer,coalesce(observation->>'quote',''));
  end loop;
 end if;
 update public.inova_medical_reports set reviewed_at=now(),collection_date=p_date where id=p_id returning * into result;
 return to_jsonb(result);
end;$$;
revoke all on function public.inova_register_medical_report(uuid,uuid,uuid,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.inova_analyze_medical_report(uuid,uuid,jsonb,text) from public,anon,authenticated;
revoke all on function public.inova_review_medical_report(uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.inova_register_medical_report(uuid,uuid,uuid,text,text,text,text,integer) to service_role;
grant execute on function public.inova_analyze_medical_report(uuid,uuid,jsonb,text) to service_role;
grant execute on function public.inova_review_medical_report(uuid,uuid,date) to service_role;
commit;
