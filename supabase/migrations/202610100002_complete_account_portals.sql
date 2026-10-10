-- Depois de INOVA_COMPLEMENTOS_SQL_EDITOR.sql e INOVA_VINCULO_PACIENTE_SQL_EDITOR.sql.
-- Atualização aditiva: não importa demonstrações nem remove contas/prontuários.
begin;
create table if not exists public.inova_workspace_preferences (
 user_id uuid not null references public.inova_profiles(id), kind text not null check(kind in ('profile','settings','patient')),
 value jsonb not null check(jsonb_typeof(value)='object'), updated_at timestamptz not null default now(), primary key(user_id,kind)
);
create table if not exists public.inova_real_agenda (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 doctor_id uuid not null references public.inova_profiles(id), patient_id uuid not null references public.inova_medical_patients(id),
 author_id uuid not null references public.inova_profiles(id), audience text not null check(audience in ('doctor','patient')),
 title text not null check(length(title) between 3 and 120), kind text not null check(kind in ('Consulta','Retorno','Exame','Previsão de resultado')),
 date date not null, time text not null default '' check(time='' or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 status text not null check(status in ('Proposto','Confirmado','Previsto','Cancelado')), notes text not null default '' check(length(notes)<=1000),
 reason text not null default '', order_id uuid references public.inova_consultation_entries(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status='Cancelado' or ((kind='Previsão de resultado')=(status='Previsto')))
);
create index if not exists inova_real_agenda_owner_date on public.inova_real_agenda(doctor_id,date);
alter table public.inova_real_agenda enable row level security;
alter table public.inova_workspace_preferences enable row level security;
revoke all on public.inova_real_agenda,public.inova_workspace_preferences from anon,authenticated;
grant select,insert,update on public.inova_real_agenda,public.inova_workspace_preferences to service_role;

create or replace function public.inova_save_workspace_preferences(p_user uuid,p_kind text,p_value jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare role text;
begin
 select account_type into role from public.inova_account_details where user_id=p_user;
 if role is null or (p_kind in ('profile','settings') and role<>'doctor') or (p_kind='patient' and role<>'patient') then raise exception 'Unauthorized';end if;
 insert into public.inova_workspace_preferences(user_id,kind,value) values(p_user,p_kind,p_value)
 on conflict(user_id,kind) do update set value=excluded.value,updated_at=now();
 return jsonb_build_object('ok',true);
end;$$;
revoke all on function public.inova_save_workspace_preferences(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.inova_save_workspace_preferences(uuid,text,jsonb) to service_role;

create or replace function public.inova_create_real_agenda(p_doctor uuid,p_patient uuid,p_author uuid,p_request uuid,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare ev public.inova_real_agenda; role text;
begin
 perform id from public.inova_medical_patients where id=p_patient and doctor_id=p_doctor for update;
 if not found then raise exception 'Patient unavailable';end if;
 if p_author=p_doctor then role:='doctor';
 elsif exists(select 1 from public.inova_portal_links where patient_id=p_patient and doctor_id=p_doctor and user_id=p_author) then role:='patient';
 else raise exception 'Unauthorized';end if;
 if role='patient' and p_data->>'status'<>'Proposto' then raise exception 'Patient must propose';end if;
 if p_data->>'orderId' is not null and not exists(select 1 from public.inova_consultation_entries where id=(p_data->>'orderId')::uuid and patient_id=p_patient and doctor_id=p_doctor and kind='order' and status='published') then raise exception 'Order unavailable';end if;
 select * into ev from public.inova_real_agenda where request_id=p_request;
 if found then
  if ev.doctor_id<>p_doctor or ev.patient_id<>p_patient or ev.author_id<>p_author then raise exception 'Request used';end if;
  return to_jsonb(ev);
 end if;
 insert into public.inova_real_agenda(request_id,doctor_id,patient_id,author_id,audience,title,kind,date,time,status,notes,order_id)
 values(p_request,p_doctor,p_patient,p_author,role,p_data->>'title',p_data->>'kind',(p_data->>'date')::date,p_data->>'time',p_data->>'status',p_data->>'notes',(p_data->>'orderId')::uuid) returning * into ev;
 insert into public.inova_notifications(user_id,patient_id,event,title)
 select recipient,p_patient,'agenda-created','Novo evento na agenda: '||ev.title from (
  select p_doctor recipient union select user_id from public.inova_portal_links where patient_id=p_patient and doctor_id=p_doctor
 ) r where recipient<>p_author;
 return to_jsonb(ev);
end;$$;
revoke all on function public.inova_create_real_agenda(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.inova_create_real_agenda(uuid,uuid,uuid,uuid,jsonb) to service_role;

create or replace function public.inova_transition_real_agenda(p_id uuid,p_patient uuid,p_doctor uuid,p_author uuid,p_status text,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare ev public.inova_real_agenda;
begin
 select * into ev from public.inova_real_agenda where id=p_id and patient_id=p_patient and doctor_id=p_doctor for update;
 if not found then raise exception 'Event unavailable';end if;
 if p_author<>p_doctor and not exists(select 1 from public.inova_portal_links where patient_id=p_patient and doctor_id=p_doctor and user_id=p_author) then raise exception 'Unauthorized';end if;
 if p_status='Confirmado' then
  if p_author<>p_doctor or ev.status<>'Proposto' then raise exception 'Invalid confirmation';end if;
 elsif p_status='Cancelado' then
  if length(trim(p_reason))<3 or length(p_reason)>1000 or ev.status='Cancelado' then raise exception 'Invalid cancellation';end if;
 else raise exception 'Invalid transition';end if;
 update public.inova_real_agenda set status=p_status,reason=coalesce(p_reason,''),updated_at=now() where id=p_id returning * into ev;
 insert into public.inova_notifications(user_id,patient_id,event,title)
 select recipient,p_patient,'agenda-transition',p_status||': '||ev.title from (
  select p_doctor recipient union select user_id from public.inova_portal_links where patient_id=p_patient and doctor_id=p_doctor
 ) r where recipient<>p_author;
 return to_jsonb(ev);
end;$$;
revoke all on function public.inova_transition_real_agenda(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.inova_transition_real_agenda(uuid,uuid,uuid,uuid,text,text) to service_role;

-- Retornos publicados antes desta atualização também aparecem no calendário.
insert into public.inova_real_agenda(request_id,doctor_id,patient_id,author_id,audience,title,kind,date,time,status,notes)
select id,doctor_id,patient_id,doctor_id,'doctor',payload->>'title','Retorno',(payload->>'date')::date,'','Proposto',left(coalesce(payload->>'text',''),1000)
from public.inova_consultation_entries where kind='return' and status='published' and payload->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
on conflict(request_id) do nothing;
create or replace function public.inova_return_agenda_sync()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='return' and new.status='published' and new.payload->>'date' ~ '^\d{4}-\d{2}-\d{2}$' then
  insert into public.inova_real_agenda(request_id,doctor_id,patient_id,author_id,audience,title,kind,date,time,status,notes)
  values(new.id,new.doctor_id,new.patient_id,new.doctor_id,'doctor',new.payload->>'title','Retorno',(new.payload->>'date')::date,'','Proposto',left(coalesce(new.payload->>'text',''),1000)) on conflict(request_id) do nothing;
 elsif new.kind='return' and new.status='cancelled' then
  update public.inova_real_agenda set status='Cancelado',reason='Retorno retirado pelo médico',updated_at=now() where request_id=new.id and status<>'Cancelado';
 end if;
 return new;
end;$$;
revoke all on function public.inova_return_agenda_sync() from public,anon,authenticated;
drop trigger if exists inova_return_agenda_sync on public.inova_consultation_entries;
create trigger inova_return_agenda_sync after insert or update of status on public.inova_consultation_entries for each row execute function public.inova_return_agenda_sync();

create or replace function public.inova_report_release_notice()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.reviewed_at is null and new.reviewed_at is not null then
  insert into public.inova_notifications(user_id,patient_id,event,title)
  select user_id,new.patient_id,'report:'||new.id,'Laudo revisado e liberado: '||new.filename from public.inova_portal_links where patient_id=new.patient_id and doctor_id=new.doctor_id;
 end if;
 return new;
end;$$;
revoke all on function public.inova_report_release_notice() from public,anon,authenticated;
drop trigger if exists inova_report_release_notice on public.inova_medical_reports;
create trigger inova_report_release_notice after update of reviewed_at on public.inova_medical_reports for each row execute function public.inova_report_release_notice();

create or replace function public.inova_remove_real_genetics(p_id uuid,p_patient uuid,p_doctor uuid,p_author uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare rec public.inova_real_genetics;
begin
 select * into rec from public.inova_real_genetics where id=p_id and patient_id=p_patient and doctor_id=p_doctor for update;
 if not found then raise exception 'File unavailable';end if;
 if p_author<>p_doctor and (rec.author_id<>p_author or rec.reviewed_at is not null or not exists(select 1 from public.inova_portal_links where patient_id=p_patient and doctor_id=p_doctor and user_id=p_author)) then raise exception 'Unauthorized';end if;
 delete from public.inova_real_genetics where id=p_id;
 return jsonb_build_object('ok',true);
end;$$;
grant delete on public.inova_real_genetics to service_role;
revoke all on function public.inova_remove_real_genetics(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.inova_remove_real_genetics(uuid,uuid,uuid,uuid) to service_role;
commit;
