-- Execute after the two existing INOVA migrations. No demonstration data is copied.
begin;
create table if not exists public.inova_medical_patients (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.inova_profiles(id),
  name text not null check(length(name) between 5 and 200),
  cpf text not null check(cpf ~ '^[0-9]{11}$'),
  birth date not null,
  notes text not null default '' check(length(notes)<=2000),
  created_at timestamptz not null default now(),
  unique(doctor_id,cpf)
);
alter table public.inova_medical_patients enable row level security;
revoke all on public.inova_medical_patients from anon,authenticated;
grant select,insert,update on public.inova_medical_patients to service_role;
create index if not exists inova_medical_patients_owner on public.inova_medical_patients(doctor_id,created_at desc);
create or replace function public.inova_create_medical_patient(p_doctor uuid,p_name text,p_cpf text,p_birth date,p_notes text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result public.inova_medical_patients;
begin
  if not exists(select 1 from public.inova_profiles where id=p_doctor and role='doctor') then raise exception 'Doctor not found'; end if;
  if p_birth>current_date or p_birth<date '1900-01-01' then raise exception 'Invalid birth date'; end if;
  insert into public.inova_medical_patients(doctor_id,name,cpf,birth,notes) values(p_doctor,trim(p_name),p_cpf,p_birth,coalesce(p_notes,'')) returning * into result;
  return to_jsonb(result);
end;$$;
revoke all on function public.inova_create_medical_patient(uuid,text,text,date,text) from public,anon,authenticated;
grant execute on function public.inova_create_medical_patient(uuid,text,text,date,text) to service_role;
commit;
