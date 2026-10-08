-- Execute after the INOVA medical migrations. No demo records are imported.
begin;
create table if not exists public.inova_portal_links (
 patient_id uuid primary key references public.inova_medical_patients(id),
 doctor_id uuid not null references public.inova_profiles(id),
 user_id uuid not null references public.inova_profiles(id),
 created_at timestamptz not null default now()
);
create table if not exists public.inova_consultation_entries (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.inova_medical_patients(id),
 doctor_id uuid not null references public.inova_profiles(id),
 author_id uuid not null references public.inova_profiles(id),
 request_id uuid not null unique,
 kind text not null check(kind in ('preparation','order','guidance','family','return')),
 status text not null check(status in ('draft','published','reviewed','cancelled')),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists inova_consultation_owner on public.inova_consultation_entries(doctor_id,patient_id,created_at desc);
alter table public.inova_portal_links enable row level security;
alter table public.inova_consultation_entries enable row level security;
revoke all on public.inova_portal_links,public.inova_consultation_entries from anon,authenticated;
grant select,insert,update on public.inova_portal_links,public.inova_consultation_entries to service_role;
create or replace function public.inova_link_patient_portal(p_doctor uuid,p_patient uuid,p_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare patient public.inova_medical_patients; target uuid;
begin
 select * into patient from public.inova_medical_patients where id=p_patient and doctor_id=p_doctor for update;
 if not found then raise exception 'Patient unavailable';end if;
 select a.user_id into target from public.inova_account_details a join auth.users u on u.id=a.user_id
 where lower(u.email)=lower(trim(p_email)) and u.email_confirmed_at is not null
 and a.account_type='patient' and a.cpf=patient.cpf and a.birth_date=patient.birth;
 if target is null then raise exception 'Confirmed patient account with matching identity not found';end if;
 if exists(select 1 from public.inova_portal_links where patient_id=p_patient and user_id<>target) then raise exception 'Patient already linked';end if;
 insert into public.inova_portal_links(patient_id,doctor_id,user_id) values(p_patient,p_doctor,target)
 on conflict(patient_id) do nothing;
 return jsonb_build_object('ok',true);
end;$$;
revoke all on function public.inova_link_patient_portal(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.inova_link_patient_portal(uuid,uuid,text) to service_role;
create or replace function public.inova_save_consultation_entry(p_patient uuid,p_doctor uuid,p_author uuid,p_request uuid,p_kind text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare entry public.inova_consultation_entries;
begin
 perform id from public.inova_medical_patients where id=p_patient and doctor_id=p_doctor for update;
 if not found then raise exception 'Patient unavailable';end if;
 if p_kind='preparation' then
  if not exists(select 1 from public.inova_portal_links where patient_id=p_patient and doctor_id=p_doctor and user_id=p_author) then raise exception 'Patient not linked';end if;
 elsif p_author<>p_doctor then raise exception 'Unauthorized author';end if;
 select * into entry from public.inova_consultation_entries where request_id=p_request;
 if found then
  if entry.patient_id<>p_patient or entry.doctor_id<>p_doctor or entry.author_id<>p_author then raise exception 'Request used';end if;
  return to_jsonb(entry);
 end if;
 insert into public.inova_consultation_entries(patient_id,doctor_id,author_id,request_id,kind,status,payload)
 values(p_patient,p_doctor,p_author,p_request,p_kind,case when p_kind='preparation' then 'published' when p_kind='family' then 'reviewed' else 'draft' end,p_payload) returning * into entry;
 return to_jsonb(entry);
end;$$;
revoke all on function public.inova_save_consultation_entry(uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.inova_save_consultation_entry(uuid,uuid,uuid,uuid,text,jsonb) to service_role;
create or replace function public.inova_consultation_transition(p_id uuid,p_doctor uuid,p_status text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare entry public.inova_consultation_entries;
begin
 select * into entry from public.inova_consultation_entries where id=p_id and doctor_id=p_doctor for update;
 if not found then raise exception 'Entry unavailable';end if;
 if p_status='reviewed' and entry.kind='preparation' and entry.status='published' then null;
 elsif p_status='published' and entry.kind in ('order','guidance','return') and entry.status='draft' then null;
 elsif p_status='cancelled' and entry.kind in ('order','guidance','return') and entry.status in ('draft','published') then null;
 elsif entry.status=p_status then return to_jsonb(entry);
 else raise exception 'Invalid transition';end if;
 update public.inova_consultation_entries set status=p_status,updated_at=now() where id=p_id returning * into entry;
 return to_jsonb(entry);
end;$$;
revoke all on function public.inova_consultation_transition(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.inova_consultation_transition(uuid,uuid,text) to service_role;
commit;
