alter table public.profiles
  add column if not exists public_contact_email text;

comment on column public.profiles.public_contact_email is
  'Optional email explicitly provided for public display on seller listings.';
