begin;

-- Persist selected city-level coordinates and keep the shared geocode cache staff-readable only.

alter table public.profiles
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_label text;

alter table public.listings
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_label text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_location_lat_range_check'
  ) then
    alter table public.profiles
      add constraint profiles_location_lat_range_check
      check (location_lat is null or location_lat between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_location_lng_range_check'
  ) then
    alter table public.profiles
      add constraint profiles_location_lng_range_check
      check (location_lng is null or location_lng between -180 and 180);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_location_coordinates_pair_check'
  ) then
    alter table public.profiles
      add constraint profiles_location_coordinates_pair_check
      check ((location_lat is null) = (location_lng is null));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_location_label_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_location_label_length_check
      check (location_label is null or char_length(location_label) <= 120);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_location_lat_range_check'
  ) then
    alter table public.listings
      add constraint listings_location_lat_range_check
      check (location_lat is null or location_lat between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_location_lng_range_check'
  ) then
    alter table public.listings
      add constraint listings_location_lng_range_check
      check (location_lng is null or location_lng between -180 and 180);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_location_coordinates_pair_check'
  ) then
    alter table public.listings
      add constraint listings_location_coordinates_pair_check
      check ((location_lat is null) = (location_lng is null));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_location_label_length_check'
  ) then
    alter table public.listings
      add constraint listings_location_label_length_check
      check (location_label is null or char_length(location_label) <= 120);
  end if;
end;
$$;

create table if not exists public.location_geocodes (
  label_key text primary key,
  label text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  source text not null,
  resolved_at timestamptz not null default now()
);

alter table public.location_geocodes enable row level security;

drop policy if exists location_geocodes_staff_select on public.location_geocodes;
create policy location_geocodes_staff_select
  on public.location_geocodes
  for select
  to authenticated
  using (public.is_staff());

grant select on public.location_geocodes to authenticated;
grant all on public.location_geocodes to service_role;

commit;
