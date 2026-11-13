create extension if not exists pgcrypto;

-- PROFILES (public) and PRIVATE CONTACT DETAILS ------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'buyer' check (role in ('buyer','seller','moderator','admin')),
  status text not null default 'active' check (status in ('active','suspended')),
  seller_verified boolean not null default false,
  avatar_url text,
  default_location text,
  created_at timestamptz not null default now()
);

create table public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  contact_number text
);

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('moderator','admin') and status = 'active' from public.profiles where id = auth.uid()), false);
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' and status = 'active' from public.profiles where id = auth.uid()), false);
$$;

-- every new sign-up gets a profile row
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- users cannot promote themselves (the SQL editor and the server key are allowed)
create function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and (new.id = auth.uid() or not public.is_admin()) then
    new.role := old.role;
    new.status := old.status;
    new.seller_verified := old.seller_verified;
  end if;
  return new;
end;
$$;

create trigger profiles_protect before update on public.profiles
for each row execute function public.protect_profile_fields();

-- CATALOG AND PRICES ----------------------------------------------------
create table public.laptop_models (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  series text not null,
  model_number text,
  cpu text,
  gpu text,
  screen_size numeric(3,1),
  resolution text,
  default_ram text,
  default_storage text,
  release_year int,
  unique nulls not distinct (brand, series, model_number)
);

create table public.price_reports (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.laptop_models(id) on delete cascade,
  ram text,
  storage text,
  condition text not null check (condition in ('brand_new','like_new','lightly_used','well_used','heavily_used')),
  low numeric(12,2) not null,
  median numeric(12,2) not null,
  high numeric(12,2) not null,
  sample_size int not null default 0,
  source text not null default 'estimate',
  is_estimate boolean not null default true,
  updated_at timestamptz not null default now()
);
create index on public.price_reports (model_id, condition);

-- LISTINGS ---------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  model_id uuid references public.laptop_models(id) on delete set null,
  title text not null default '',
  description text not null default '',
  price numeric(12,2) check (price is null or price >= 0),
  brand text not null default '',
  model text not null default '',
  condition text check (condition in ('brand_new','like_new','lightly_used','well_used','heavily_used')),
  deal_methods text[] not null default '{}',
  location text not null default '',
  address_detail text,
  cpu text,
  gpu text,
  screen_size numeric(3,1),
  ram text,
  storage text,
  status text not null default 'draft' check (status in ('draft','available','reserved','sold')),
  reserved_by uuid references public.profiles(id) on delete set null,
  reserved_until timestamptz,
  buyer_id uuid references public.profiles(id) on delete set null,
  specs_verified boolean not null default false,
  is_featured boolean not null default false,
  is_visible boolean not null default true,
  ai_filled text[] not null default '{}',
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index on public.listings (status, created_at desc);
create index on public.listings (seller_id);

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_path text not null,
  image_url text not null,
  view_type text not null default 'photo',
  sort_order int not null default 0
);
create index on public.listing_photos (listing_id, sort_order);

create table public.identification_results (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  candidates jsonb not null default '[]',
  brand text,
  series text,
  model_number text,
  visible_text text[] not null default '{}',
  confidence numeric(4,3),
  tier text,
  provider text,
  hints_used text[] not null default '{}',
  confirmed_by_seller boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.seller_hints (
  id uuid primary key default gen_random_uuid(),
  identification_id uuid not null references public.identification_results(id) on delete cascade,
  brand text, series text, model_number text, serial_number text,
  purchase_year int, ram text, storage text, cpu text,
  system_info_path text, receipt_path text, notes text
);

create table public.condition_reports (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  battery_health text, screen_grade text, keyboard_grade text,
  hinge_grade text, ports text, charger text,
  suggested_condition text
);

-- DEALS: OFFERS, SAVES, CHAT -----------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  counter_amount numeric(12,2),
  status text not null default 'pending' check (status in ('pending','countered','accepted','declined','withdrawn')),
  created_at timestamptz not null default now()
);
create index on public.offers (listing_id);

create table public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_flagged boolean not null default false,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);
create index on public.messages (conversation_id, sent_at);

create table public.chat_alerts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  matched_phrases text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- TRUST AND SAFETY -------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (listing_id, reviewer_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('listing','user')),
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

create table public.usage_counters (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, action, day)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  created_at timestamptz not null default now()
);

-- LISTING RULES ----------------------------------------------------------
create function public.protect_listing_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.is_featured := false;
      new.is_visible := true;
      new.specs_verified := false;
    else
      new.is_featured := old.is_featured;
      new.is_visible := old.is_visible;
      new.specs_verified := old.specs_verified;
      new.seller_id := old.seller_id;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger listings_protect before insert or update on public.listings
for each row execute function public.protect_listing_fields();

create function public.increment_views(p_listing uuid) returns void
language sql security definer set search_path = public as $$
  update public.listings set views = views + 1 where id = p_listing and status in ('available','reserved');
$$;

-- a reserved listing goes back on sale when its hold time ends
create function public.release_expired_reservations() returns void
language sql security definer set search_path = public as $$
  update public.listings
  set status = 'available', reserved_by = null, reserved_until = null, buyer_id = null
  where status = 'reserved' and reserved_until is not null and reserved_until < now();
$$;
grant execute on function public.release_expired_reservations() to anon, authenticated;

-- daily usage caps (called only by the server key)
create function public.bump_usage(p_user uuid, p_action text, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.usage_counters (user_id, action, day, count) values (p_user, p_action, current_date, 1)
  on conflict (user_id, action, day) do update set count = public.usage_counters.count + 1
  returning count into c;
  return c <= p_limit;
end;
$$;
revoke execute on function public.bump_usage(uuid, text, int) from public, anon, authenticated;

-- NOTIFICATION TRIGGERS (users cannot insert notifications themselves) -------
create function public.notify_offer() returns trigger
language plpgsql security definer set search_path = public as $$
declare l public.listings;
begin
  select * into l from public.listings where id = new.listing_id;
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, payload)
    values (l.seller_id, 'offer', jsonb_build_object('listing_id', new.listing_id, 'title', l.title, 'amount', new.amount));
  elsif new.status is distinct from old.status then
    insert into public.notifications (user_id, type, payload)
    values (case when auth.uid() = new.buyer_id then l.seller_id else new.buyer_id end, 'offer_update',
            jsonb_build_object('listing_id', new.listing_id, 'title', l.title, 'status', new.status));
  end if;
  return new;
end;
$$;
create trigger offers_notify after insert or update on public.offers
for each row execute function public.notify_offer();

create function public.notify_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  insert into public.notifications (user_id, type, payload)
  values (case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end, 'message',
          jsonb_build_object('conversation_id', c.id, 'listing_id', c.listing_id));
  update public.conversations set updated_at = now() where id = c.id;
  return new;
end;
$$;
create trigger messages_notify after insert on public.messages
for each row execute function public.notify_message();

create function public.notify_listing_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('reserved','sold') and new.buyer_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (new.buyer_id, 'listing_' || new.status, jsonb_build_object('listing_id', new.id, 'title', new.title));
  end if;
  return new;
end;
$$;
create trigger listings_notify after update of status on public.listings
for each row execute function public.notify_listing_status();
