-- Execute after INOVA_CONSULTA_SQL_EDITOR.sql.
begin;
create table if not exists public.inova_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 patient_id uuid not null references public.inova_medical_patients(id),
 entry_id uuid references public.inova_consultation_entries(id), event text not null,
 title text not null, created_at timestamptz not null default now(), read_at timestamptz,
 unique(user_id,entry_id,event)
);
create index if not exists inova_notifications_user on public.inova_notifications(user_id,created_at desc);
create table if not exists public.inova_real_genetics (
 id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.inova_medical_patients(id),
 doctor_id uuid not null references public.inova_profiles(id),author_id uuid not null references public.inova_profiles(id),
 filename text not null check(length(filename) between 1 and 200),
 original_text text not null check(octet_length(original_text)<=26214400),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),stats jsonb not null,
 created_at timestamptz not null default now(),reviewed_at timestamptz,
 unique(doctor_id,patient_id,sha256)
);
alter table public.inova_notifications enable row level security;
alter table public.inova_real_genetics enable row level security;
revoke all on public.inova_notifications,public.inova_real_genetics from anon,authenticated;
grant select,insert,update on public.inova_notifications,public.inova_real_genetics to service_role;
create or replace function public.inova_notify_consultation()
returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; label text;
begin
 if tg_op='UPDATE' then if old.status=new.status then return new;end if;end if;
 if new.kind='preparation' and new.status='published' then recipient:=new.doctor_id;label:='Nova preparação recebida';
 elsif new.kind='preparation' and new.status='reviewed' then
  select user_id into recipient from public.inova_portal_links where patient_id=new.patient_id;label:='Preparação revisada pelo médico';
 elsif new.kind in ('order','guidance','return') and new.status in ('published','cancelled') then
  select user_id into recipient from public.inova_portal_links where patient_id=new.patient_id;
  label:=case new.kind when 'order' then 'Pedido de exames' when 'guidance' then 'Orientação médica' else 'Retorno planejado' end||case when new.status='published' then ' publicado' else ' retirado' end;
 end if;
 if recipient is not null then insert into public.inova_notifications(user_id,patient_id,entry_id,event,title)
 values(recipient,new.patient_id,new.id,new.status,label) on conflict(user_id,entry_id,event) do nothing;end if;
 return new;
end;$$;
revoke all on function public.inova_notify_consultation() from public,anon,authenticated;
drop trigger if exists inova_consultation_notification on public.inova_consultation_entries;
create trigger inova_consultation_notification after insert or update of status on public.inova_consultation_entries
for each row execute function public.inova_notify_consultation();
create or replace function public.inova_mark_notifications_read(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin update public.inova_notifications set read_at=now() where user_id=p_user and read_at is null;return jsonb_build_object('ok',true);end;$$;
revoke all on function public.inova_mark_notifications_read(uuid) from public,anon,authenticated;
grant execute on function public.inova_mark_notifications_read(uuid) to service_role;
create or replace function public.inova_save_real_genetics(p_patient uuid,p_doctor uuid,p_author uuid,p_filename text,p_text text,p_hash text,p_stats jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result public.inova_real_genetics;
begin
 perform id from public.inova_medical_patients where id=p_patient and doctor_id=p_doctor for update;
 if not found then raise exception 'Patient unavailable';end if;
 if p_author<>p_doctor and not exists(select 1 from public.inova_portal_links where patient_id=p_patient and user_id=p_author and doctor_id=p_doctor) then raise exception 'Unauthorized';end if;
 select * into result from public.inova_real_genetics where patient_id=p_patient and doctor_id=p_doctor and sha256=p_hash;
 if not found then insert into public.inova_real_genetics(patient_id,doctor_id,author_id,filename,original_text,sha256,stats)
 values(p_patient,p_doctor,p_author,p_filename,p_text,p_hash,p_stats) returning * into result;
 insert into public.inova_notifications(user_id,patient_id,event,title) values(p_doctor,p_patient,'genetics-imported','Arquivo genético recebido');end if;
 return jsonb_build_object('id',result.id);
end;$$;
revoke all on function public.inova_save_real_genetics(uuid,uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.inova_save_real_genetics(uuid,uuid,uuid,text,text,text,jsonb) to service_role;
create or replace function public.inova_review_real_genetics(p_id uuid,p_doctor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin update public.inova_real_genetics set reviewed_at=coalesce(reviewed_at,now()) where id=p_id and doctor_id=p_doctor;
 if not found then raise exception 'File unavailable';end if;return jsonb_build_object('ok',true);end;$$;
revoke all on function public.inova_review_real_genetics(uuid,uuid) from public,anon,authenticated;
grant execute on function public.inova_review_real_genetics(uuid,uuid) to service_role;
commit;
