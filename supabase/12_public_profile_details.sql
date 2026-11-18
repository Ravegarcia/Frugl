begin;

alter table public.profiles
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists bio text;

update public.profiles
set
  city = nullif(trim(split_part(default_location, ',', 1)), ''),
  region = case
    when position(',' in default_location) > 0
      then nullif(trim(substring(default_location from position(',' in default_location) + 1)), '')
    else null
  end
where default_location is not null
  and default_location <> ''
  and city is null
  and region is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_bio_length_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_bio_length_check
      check (bio is null or char_length(bio) <= 500);
  end if;
end;
$$;

commit;
