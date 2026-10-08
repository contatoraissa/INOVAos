-- Execute after INOVA_EXAMES_SQL_EDITOR.sql. No existing results are removed.
begin;
alter table public.inova_medical_reports add column if not exists review_method text
  check(review_method in ('manual','ai_review'));
alter table public.inova_medical_reports add column if not exists original_ai_summary jsonb;
create or replace function public.inova_review_manual_results(p_id uuid,p_doctor uuid,p_date date,p_summary jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare report public.inova_medical_reports;
begin
 select * into report from public.inova_medical_reports where id=p_id and doctor_id=p_doctor for update;
 if not found or report.kind<>'Laboratorial' then raise exception 'Report unavailable';end if;
 if report.reviewed_at is not null then return to_jsonb(report);end if;
 if jsonb_typeof(p_summary->'observations') is distinct from 'array' then raise exception 'Invalid results';end if;
 if jsonb_array_length(p_summary->'observations') not between 1 and 100 then raise exception 'Invalid results';end if;
 update public.inova_medical_reports set original_ai_summary=summary,summary=p_summary,review_method='manual'
 where id=p_id;
 return public.inova_review_medical_report(p_id,p_doctor,p_date);
end;$$;
revoke all on function public.inova_review_manual_results(uuid,uuid,date,jsonb) from public,anon,authenticated;
grant execute on function public.inova_review_manual_results(uuid,uuid,date,jsonb) to service_role;
commit;
