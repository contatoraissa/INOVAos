-- Optional fictional profile, only for a development/test project.
insert into public.inova_patients(id, display_name, birth_date)
values ('mariana-oliveira', 'Mariana Oliveira', '1994-03-14')
on conflict (id) do nothing;
