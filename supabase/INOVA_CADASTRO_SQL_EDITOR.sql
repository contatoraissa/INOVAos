-- Execute after 202610070001_planned_returns.sql. No payment is activated by signup.
begin;
create table if not exists public.inova_account_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(full_name) between 5 and 200),
  account_type text not null check (account_type in ('doctor','patient')),
  crm text,
  crm_state text,
  cnpj text,
  cpf text unique,
  birth_date date,
  professional_status text not null default 'not_applicable' check (professional_status in ('pending','verified','rejected','not_applicable')),
  created_at timestamptz not null default now(),
  consent_at timestamptz not null default now(),
  check ((account_type = 'doctor' and crm ~ '^[0-9]{1,10}$' and crm_state = any(array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']) and cpf is null and birth_date is null) or
    (account_type = 'patient' and cpf ~ '^[0-9]{11}$' and birth_date is not null and crm is null and crm_state is null and cnpj is null)),
  check (cnpj is null or cnpj ~ '^[0-9]{14}$')
  ,check (account_type <> 'doctor' or (crm is not null and crm_state is not null))
  ,check (account_type <> 'patient' or (cpf is not null and birth_date is not null))
);
create table if not exists public.inova_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','past_due','cancelled')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.inova_account_details enable row level security;
alter table public.inova_subscriptions enable row level security;
revoke all on public.inova_account_details, public.inova_subscriptions from anon, authenticated;
grant select, insert, update on public.inova_account_details, public.inova_subscriptions to service_role;

create or replace function public.inova_register_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  details jsonb := new.raw_user_meta_data -> 'inova_registration';
  patient_key text;
  account_type text;
begin
  -- Other Supabase applications/users remain untouched.
  if details is null then return new; end if;
  account_type := details ->> 'role';
  if account_type not in ('doctor','patient') then raise exception 'Invalid account type'; end if;
  if account_type = 'patient' then
    if (details ->> 'birthDate')::date > current_date or (details ->> 'birthDate')::date < date '1900-01-01' then raise exception 'Invalid birth date'; end if;
    patient_key := 'patient-' || new.id::text;
    insert into public.inova_patients(id, display_name, birth_date)
      values(patient_key, details ->> 'fullName', (details ->> 'birthDate')::date);
  end if;
  insert into public.inova_profiles(id, role, display_name, patient_id)
    values(new.id, account_type, details ->> 'fullName', patient_key);
  insert into public.inova_account_details(user_id, full_name, account_type, crm, crm_state, cnpj, cpf, birth_date, professional_status)
    values(new.id, details ->> 'fullName', account_type,
      case when account_type = 'doctor' then details ->> 'crm' end,
      case when account_type = 'doctor' then details ->> 'crmState' end,
      case when account_type = 'doctor' then nullif(details ->> 'cnpj','') end,
      case when account_type = 'patient' then details ->> 'cpf' end,
      case when account_type = 'patient' then (details ->> 'birthDate')::date end,
      case when account_type = 'doctor' then 'pending' else 'not_applicable' end);
  if account_type = 'doctor' then
    insert into public.inova_subscriptions(user_id) values(new.id);
  end if;
  return new;
end; $$;
revoke all on function public.inova_register_auth_user() from public, anon, authenticated;
drop trigger if exists inova_auth_user_created on auth.users;
create trigger inova_auth_user_created after insert on auth.users
  for each row execute function public.inova_register_auth_user();
commit;
