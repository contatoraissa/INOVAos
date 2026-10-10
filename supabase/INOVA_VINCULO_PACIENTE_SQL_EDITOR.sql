-- Additive migration: keep existing charts, links, documents and accounts.
-- Requires 202610070002_accounts, 202610070003_medical_workspace and
-- 202610070006_consultation. No automatic backfill or demo data.
begin;
alter table public.inova_medical_patients
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists rg text not null default '',
  add column if not exists sex text not null default '',
  add column if not exists address text not null default '',
  add column if not exists identity_confirmed_at timestamptz;

create or replace function public.inova_sync_patient_identity(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target record; chart record; linked_count integer := 0;
begin
  select a.cpf, a.birth_date, lower(trim(u.email)) as email into target
  from public.inova_account_details a join auth.users u on u.id=a.user_id
  where a.user_id=p_user and a.account_type='patient' and u.email_confirmed_at is not null;
  if not found then raise exception 'Confirmed patient account required'; end if;
  for chart in select p.* from public.inova_medical_patients p
    where p.cpf=target.cpf and p.birth=target.birth_date
      and lower(trim(p.email))=target.email and p.identity_confirmed_at is not null
    order by p.id for update
  loop
    insert into public.inova_portal_links(patient_id,doctor_id,user_id)
    values(chart.id,chart.doctor_id,p_user) on conflict(patient_id) do nothing;
    -- A link owned by another account is never transferred.
    if exists(select 1 from public.inova_portal_links
      where patient_id=chart.id and doctor_id=chart.doctor_id and user_id=p_user)
    then linked_count := linked_count + 1; end if;
  end loop;
  return jsonb_build_object('linked',linked_count);
end;$$;
revoke all on function public.inova_sync_patient_identity(uuid) from public,anon,authenticated;
grant execute on function public.inova_sync_patient_identity(uuid) to service_role;

create or replace function public.inova_register_patient_identity(
  p_doctor uuid,p_name text,p_cpf text,p_birth date,p_notes text,
  p_email text,p_phone text,p_rg text,p_sex text,p_address text,p_identity_confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare chart public.inova_medical_patients; reused boolean := false; target uuid;
begin
  if not exists(select 1 from public.inova_profiles where id=p_doctor and role='doctor')
    then raise exception 'Doctor not found'; end if;
  if p_birth is null or p_birth>current_date or p_birth<date '1900-01-01'
    then raise exception 'Invalid birth date'; end if;
  if p_cpf is null or p_cpf !~ '^[0-9]{11}$' or p_name is null
    or length(trim(p_name)) not between 5 and 200
    or length(coalesce(p_notes,''))>2000 or length(coalesce(p_email,''))>254
    or length(coalesce(p_phone,''))>40 or length(coalesce(p_rg,''))>40
    or length(coalesce(p_address,''))>500 or coalesce(p_sex,'') not in ('','f','m','o')
    then raise exception 'Invalid patient data'; end if;
  p_email := lower(trim(coalesce(p_email,'')));
  if p_email<>'' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    then raise exception 'Invalid email'; end if;
  if p_identity_confirmed and p_email=''
    then raise exception 'Email required to authorize linking'; end if;
  -- Serialize duplicate submissions, keeping the original patient_id and history.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_doctor::text||p_cpf,0));
  select * into chart from public.inova_medical_patients
    where doctor_id=p_doctor and cpf=p_cpf for update;
  if found then
    reused := true;
    if chart.birth<>p_birth then raise exception 'Existing patient birth mismatch'; end if;
    if chart.email<>'' and chart.email<>p_email and p_email<>''
      then raise exception 'Existing patient email mismatch'; end if;
    update public.inova_medical_patients set
      email=case when email='' then p_email else email end,
      phone=case when phone='' then coalesce(p_phone,'') else phone end,
      rg=case when rg='' then coalesce(p_rg,'') else rg end,
      sex=case when sex='' then coalesce(p_sex,'') else sex end,
      address=case when address='' then coalesce(p_address,'') else address end,
      identity_confirmed_at=case when p_identity_confirmed then coalesce(identity_confirmed_at,now()) else identity_confirmed_at end
    where id=chart.id returning * into chart;
  else
    insert into public.inova_medical_patients(doctor_id,name,cpf,birth,notes,email,phone,rg,sex,address,identity_confirmed_at)
    values(p_doctor,trim(p_name),p_cpf,p_birth,coalesce(p_notes,''),p_email,
      coalesce(p_phone,''),coalesce(p_rg,''),coalesce(p_sex,''),coalesce(p_address,''),
      case when p_identity_confirmed then now() else null end) returning * into chart;
  end if;
  select a.user_id into target from public.inova_account_details a join auth.users u on u.id=a.user_id
    where a.account_type='patient' and a.cpf=chart.cpf and a.birth_date=chart.birth
      and lower(trim(u.email))=chart.email and u.email_confirmed_at is not null;
  if target is not null and chart.identity_confirmed_at is not null then
    if exists(select 1 from public.inova_portal_links where patient_id=chart.id and user_id<>target)
      then raise exception 'Patient already linked to another account'; end if;
    perform public.inova_sync_patient_identity(target);
  end if;
  return jsonb_build_object('id',chart.id,'reused',reused,'linked',
    exists(select 1 from public.inova_portal_links where patient_id=chart.id));
end;$$;
revoke all on function public.inova_register_patient_identity(uuid,text,text,date,text,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.inova_register_patient_identity(uuid,text,text,date,text,text,text,text,text,text,boolean) to service_role;
notify pgrst, 'reload schema';
commit;
