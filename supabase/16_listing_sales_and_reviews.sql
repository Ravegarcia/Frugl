begin;

create table public.listing_transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index listing_transactions_listing_created_idx
  on public.listing_transactions (listing_id, created_at desc);
create index listing_transactions_buyer_created_idx
  on public.listing_transactions (buyer_id, created_at desc);

alter table public.listings
  add column sold_transaction_id uuid references public.listing_transactions(id) on delete set null;

alter table public.reviews
  add column transaction_id uuid references public.listing_transactions(id) on delete cascade;

alter table public.reviews
  drop constraint if exists reviews_listing_id_reviewer_id_key;

create unique index reviews_legacy_listing_reviewer_uidx
  on public.reviews (listing_id, reviewer_id)
  where transaction_id is null;
create unique index reviews_transaction_reviewer_uidx
  on public.reviews (transaction_id, reviewer_id)
  where transaction_id is not null;

alter table public.listing_transactions enable row level security;

create policy listing_transactions_participant_read on public.listing_transactions
  for select to authenticated
  using (
    public.is_active_user()
    and (seller_id = auth.uid() or buyer_id = auth.uid())
  );
grant select on public.listing_transactions to authenticated;

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated with check (
  reviewer_id = auth.uid()
  and public.is_active_user()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and (
    (
      transaction_id is not null
      and exists (
        select 1
        from public.listing_transactions t
        where t.id = reviews.transaction_id
          and t.listing_id = reviews.listing_id
          and (
            (t.seller_id = auth.uid() and t.buyer_id = reviews.reviewee_id)
            or (t.buyer_id = auth.uid() and t.seller_id = reviews.reviewee_id)
          )
      )
    )
    or (
      transaction_id is null
      and exists (
        select 1
        from public.listings l
        where l.id = reviews.listing_id
          and l.status = 'sold'
          and l.sold_transaction_id is null
          and (
            (l.seller_id = auth.uid() and l.buyer_id = reviews.reviewee_id)
            or (l.buyer_id = auth.uid() and l.seller_id = reviews.reviewee_id)
          )
      )
    )
  )
);

create or replace function public.protect_listing_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'draft';
      new.review_reason := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.published_at := null;
      new.is_featured := false;
      new.is_visible := true;
      new.specs_verified := false;
    else
      new.is_featured := old.is_featured;
      new.is_visible := old.is_visible;
      new.specs_verified := old.specs_verified;
      new.seller_id := old.seller_id;
      new.review_reason := old.review_reason;
      new.reviewed_at := old.reviewed_at;
      new.reviewed_by := old.reviewed_by;
      new.published_at := old.published_at;

      if old.status = 'pending_review' and (
        new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.price is distinct from old.price
        or new.brand is distinct from old.brand
        or new.model is distinct from old.model
        or new.condition is distinct from old.condition
        or new.deal_methods is distinct from old.deal_methods
        or new.location is distinct from old.location
        or new.address_detail is distinct from old.address_detail
        or new.cpu is distinct from old.cpu
        or new.gpu is distinct from old.gpu
        or new.screen_size is distinct from old.screen_size
        or new.ram is distinct from old.ram
        or new.storage is distinct from old.storage
      ) then
        raise exception 'This listing is awaiting review and cannot be edited.' using errcode = '42501';
      end if;

      if new.status is distinct from old.status then
        if old.status in ('draft', 'rejected') and new.status = 'pending_review' then
          if not exists (select 1 from public.listing_photos where listing_id = new.id)
            or nullif(trim(new.title), '') is null
            or new.price is null or new.price <= 0
            or new.condition is null
            or nullif(trim(new.brand), '') is null
            or nullif(trim(new.model), '') is null
            or nullif(trim(new.description), '') is null
            or cardinality(new.deal_methods) = 0
            or nullif(trim(new.location), '') is null then
            raise exception 'Complete all required listing fields before requesting review.' using errcode = '23514';
          end if;

          new.review_reason := null;
          new.reviewed_at := null;
          new.reviewed_by := null;
          new.published_at := null;
        elsif not (
          (old.status = 'available' and new.status in ('reserved', 'sold'))
          or (old.status = 'reserved' and new.status in ('available', 'sold'))
          or (old.status = 'sold' and new.status = 'available')
        ) then
          raise exception 'This listing status change is not allowed.' using errcode = '42501';
        end if;
      end if;

      if new.status = 'available' then
        new.reserved_by := null;
        new.reserved_until := null;
        new.buyer_id := null;
        new.sold_transaction_id := null;
      elsif new.status = 'reserved' then
        new.buyer_id := null;
        new.sold_transaction_id := null;
        if new.reserved_by is not null and not exists (
          select 1
          from public.conversations c
          join public.messages m on m.conversation_id = c.id and m.sender_id = c.buyer_id
          join public.profiles buyer
            on buyer.id = c.buyer_id
            and buyer.status = 'active'
            and buyer.role not in ('moderator', 'admin')
          where c.listing_id = new.id
            and c.seller_id = new.seller_id
            and c.buyer_id = new.reserved_by
        ) then
          raise exception 'Choose a buyer who has messaged about this listing.' using errcode = '23514';
        end if;
      elsif new.status = 'sold' and old.status <> 'sold' then
        if new.sold_transaction_id is null or not exists (
          select 1
          from public.listing_transactions t
          where t.id = new.sold_transaction_id
            and t.listing_id = new.id
            and t.seller_id = new.seller_id
            and t.buyer_id is not distinct from new.buyer_id
            and t.created_at >= old.updated_at
        ) then
          raise exception 'Complete the sale through the seller transaction flow.' using errcode = '23514';
        end if;
        new.reserved_by := null;
        new.reserved_until := null;
      elsif new.status = 'sold' then
        new.buyer_id := old.buyer_id;
        new.reserved_by := old.reserved_by;
        new.reserved_until := old.reserved_until;
        new.sold_transaction_id := old.sold_transaction_id;
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.listing_message_buyers(p_listing_id uuid)
returns table (id uuid, name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar_url
  from public.conversations c
  join public.profiles p
    on p.id = c.buyer_id
    and p.status = 'active'
    and p.role not in ('moderator', 'admin')
  where c.listing_id = p_listing_id
    and c.seller_id = auth.uid()
    and c.buyer_id <> auth.uid()
    and public.is_active_user()
    and not exists (
      select 1 from public.profiles staff
      where staff.id = auth.uid() and staff.role = 'admin'
    )
    and exists (
      select 1
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id = c.buyer_id
    )
  order by c.updated_at desc;
$$;

revoke all on function public.listing_message_buyers(uuid) from public, anon;
grant execute on function public.listing_message_buyers(uuid) to authenticated;

create or replace function public.complete_listing_sale(
  p_listing_id uuid,
  p_buyer_id uuid,
  p_rating integer
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_listing public.listings;
  v_transaction_id uuid;
begin
  if auth.uid() is null or not public.is_active_user()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Only an active seller can complete a sale.' using errcode = '42501';
  end if;

  select * into v_listing
  from public.listings l
  where l.id = p_listing_id
  for update;

  if not found or v_listing.seller_id <> auth.uid() then
    raise exception 'Listing not found.' using errcode = '42501';
  end if;
  if v_listing.status not in ('available', 'reserved') then
    raise exception 'This listing is no longer available to mark as sold.' using errcode = '23514';
  end if;

  if p_buyer_id is null then
    if p_rating is not null then
      raise exception 'A buyer must be selected before submitting a rating.' using errcode = '23514';
    end if;
  else
    if p_rating is null or p_rating < 1 or p_rating > 5 then
      raise exception 'Rate the buyer from 1 to 5 stars before completing the sale.' using errcode = '23514';
    end if;
    if not exists (
      select 1
      from public.conversations c
      join public.messages m on m.conversation_id = c.id and m.sender_id = c.buyer_id
      join public.profiles buyer
        on buyer.id = c.buyer_id
        and buyer.status = 'active'
        and buyer.role not in ('moderator', 'admin')
      where c.listing_id = p_listing_id
        and c.seller_id = auth.uid()
        and c.buyer_id = p_buyer_id
    ) then
      raise exception 'Choose a buyer who has messaged about this listing.' using errcode = '23514';
    end if;
  end if;

  insert into public.listing_transactions (listing_id, seller_id, buyer_id)
  values (p_listing_id, auth.uid(), p_buyer_id)
  returning id into v_transaction_id;

  update public.listings
  set status = 'sold',
      buyer_id = p_buyer_id,
      reserved_by = null,
      reserved_until = null,
      sold_transaction_id = v_transaction_id
  where id = p_listing_id;

  if p_buyer_id is not null then
    insert into public.reviews (
      listing_id, transaction_id, reviewer_id, reviewee_id, rating
    ) values (
      p_listing_id, v_transaction_id, auth.uid(), p_buyer_id, p_rating
    );
  end if;

  return v_transaction_id;
end;
$$;

revoke all on function public.complete_listing_sale(uuid, uuid, integer) from public, anon;
grant execute on function public.complete_listing_sale(uuid, uuid, integer) to authenticated;

create or replace function public.notify_listing_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if old.status in ('draft', 'pending_review') and new.status = 'available' then
      insert into public.notifications (user_id, type, payload)
      values (new.seller_id, 'listing_published',
              jsonb_build_object('listing_id', new.id, 'title', new.title));
    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, payload)
      values (new.seller_id, 'listing_rejected',
              jsonb_build_object(
                'listing_id', new.id,
                'title', new.title,
                'reason', new.review_reason
              ));
    end if;

    if new.status = 'reserved' and new.reserved_by is not null then
      insert into public.notifications (user_id, type, payload)
      values (new.reserved_by, 'listing_reserved',
              jsonb_build_object('listing_id', new.id, 'title', new.title));
    elsif new.status = 'sold' and new.buyer_id is not null then
      insert into public.notifications (user_id, type, payload)
      values (new.buyer_id, 'listing_sold',
              jsonb_build_object(
                'listing_id', new.id,
                'title', new.title,
                'transaction_id', new.sold_transaction_id
              ));
    end if;

    if new.status = 'sold' then
      insert into public.notifications (user_id, type, payload)
      select saved.user_id, 'saved_listing_sold',
             jsonb_build_object('listing_id', new.id, 'title', new.title)
      from public.saved_listings saved
      where saved.listing_id = new.id
        and saved.user_id <> new.seller_id
        and saved.user_id is distinct from new.buyer_id;
    end if;
  end if;
  return new;
end;
$$;

commit;
