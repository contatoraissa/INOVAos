-- INOVA: first persistent workflow. Apply to a new/test Supabase project.
-- No public access or automatic enrollment. Authentication UI remains demonstrative.
begin;

create table if not exists public.inova_patients (
  id text primary key check (id ~ '^[a-z0-9-]{1,100}$'),
  display_name text not null check (length(display_name) between 1 and 200),
  birth_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.inova_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('doctor', 'patient')),
  display_name text not null,
  patient_id text references public.inova_patients(id),
  created_at timestamptz not null default now(),
  check (role <> 'patient' or patient_id is not null)
);

create table if not exists public.inova_care_memberships (
  doctor_id uuid not null references public.inova_profiles(id),
  patient_id text not null references public.inova_patients(id),
  created_at timestamptz not null default now(),
  primary key (doctor_id, patient_id)
);

create table if not exists public.inova_return_plans (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique check (length(request_id) between 16 and 64),
  patient_id text not null references public.inova_patients(id),
  title text not null check (length(title) between 3 and 120),
  notes text not null default '' check (length(notes) <= 2000),
  date_requested date,
  days integer check (days between 1 and 365),
  target_date date not null,
  doctor_name text not null default 'Dr. Rafael Mendes',
  created_at timestamptz not null default now(),
  published_at timestamptz,
  cancelled_at timestamptz,
  check ((date_requested is not null) <> (days is not null)),
  check (published_at is null or published_at >= created_at),
  check (cancelled_at is null or cancelled_at >= created_at)
);
create unique index if not exists inova_one_active_return
  on public.inova_return_plans(patient_id) where published_at is not null and cancelled_at is null;
create index if not exists inova_returns_patient_date on public.inova_return_plans(patient_id, created_at desc);

create table if not exists public.inova_return_audit (
  id bigint generated always as identity primary key,
  return_id uuid not null references public.inova_return_plans(id),
  action text not null check (action in ('created', 'published', 'cancelled')),
  recorded_at timestamptz not null default now(),
  actor_label text not null default 'development-demo-server',
  unique(return_id, action)
);

alter table public.inova_patients enable row level security;
alter table public.inova_profiles enable row level security;
alter table public.inova_care_memberships enable row level security;
alter table public.inova_return_plans enable row level security;
alter table public.inova_return_audit enable row level security;
revoke all on public.inova_patients, public.inova_profiles, public.inova_care_memberships, public.inova_return_plans, public.inova_return_audit from anon, authenticated;
grant select, insert, update on public.inova_patients, public.inova_profiles, public.inova_care_memberships, public.inova_return_plans to service_role;
grant select, insert on public.inova_return_audit to service_role;
grant usage, select on sequence public.inova_return_audit_id_seq to service_role;

create or replace function public.inova_create_return_plan(
  p_request_id text, p_patient_id text, p_title text, p_notes text,
  p_date date, p_days integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  result public.inova_return_plans;
  target date;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  -- Serializes creation/publication per patient. Missing patient must be registered first.
  perform id from public.inova_patients where id = p_patient_id for update;
  if not found then raise exception 'Patient not registered' using errcode = '22023'; end if;
  select * into result from public.inova_return_plans where request_id = p_request_id;
  if found then
    if result.patient_id <> p_patient_id then raise exception 'Request already used' using errcode = '23505'; end if;
    return to_jsonb(result);
  end if;
  if (p_date is not null) = (p_days is not null) then raise exception 'Choose date or days' using errcode = '22023'; end if;
  target := coalesce(p_date, today + p_days);
  if target < today then raise exception 'Past target date' using errcode = '22023'; end if;
  insert into public.inova_return_plans(request_id, patient_id, title, notes, date_requested, days, target_date)
    values(p_request_id, p_patient_id, trim(p_title), coalesce(p_notes, ''), p_date, p_days, target)
    returning * into result;
  insert into public.inova_return_audit(return_id, action) values(result.id, 'created');
  return to_jsonb(result);
end; $$;

create or replace function public.inova_publish_return_plan(p_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result public.inova_return_plans;
begin
  -- Every mutation locks the patient before its plan, avoiding lock-order inversion.
  perform patient.id from public.inova_patients patient
    join public.inova_return_plans plan on plan.patient_id = patient.id
    where plan.id = p_id for update of patient;
  select * into result from public.inova_return_plans where id = p_id for update;
  if not found then raise exception 'Plan not found' using errcode = '22023'; end if;
  if result.cancelled_at is not null then raise exception 'Cancelled plan cannot be published' using errcode = '22023'; end if;
  if result.published_at is not null then return to_jsonb(result); end if;
  if result.target_date < (now() at time zone 'America/Sao_Paulo')::date then raise exception 'Past target date' using errcode = '22023'; end if;
  update public.inova_return_plans set published_at = now() where id = p_id returning * into result;
  insert into public.inova_return_audit(return_id, action) values(result.id, 'published');
  return to_jsonb(result);
end; $$;

create or replace function public.inova_cancel_return_plan(p_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result public.inova_return_plans;
begin
  perform patient.id from public.inova_patients patient
    join public.inova_return_plans plan on plan.patient_id = patient.id
    where plan.id = p_id for update of patient;
  select * into result from public.inova_return_plans where id = p_id for update;
  if not found then raise exception 'Plan not found' using errcode = '22023'; end if;
  if result.cancelled_at is not null then return to_jsonb(result); end if;
  update public.inova_return_plans set cancelled_at = now() where id = p_id returning * into result;
  insert into public.inova_return_audit(return_id, action) values(result.id, 'cancelled');
  return to_jsonb(result);
end; $$;

revoke all on function public.inova_create_return_plan(text,text,text,text,date,integer) from public, anon, authenticated;
revoke all on function public.inova_publish_return_plan(uuid) from public, anon, authenticated;
revoke all on function public.inova_cancel_return_plan(uuid) from public, anon, authenticated;
grant execute on function public.inova_create_return_plan(text,text,text,text,date,integer) to service_role;
grant execute on function public.inova_publish_return_plan(uuid) to service_role;
grant execute on function public.inova_cancel_return_plan(uuid) to service_role;

commit;

-- Optional fictional profile, only for a development/test project.
insert into public.inova_patients(id, display_name, birth_date)
values ('mariana-oliveira', 'Mariana Oliveira', '1994-03-14')
on conflict (id) do nothing;

