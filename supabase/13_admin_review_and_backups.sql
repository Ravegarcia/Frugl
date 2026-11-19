begin;

alter table public.listings
  drop constraint if exists listings_status_check,
  add constraint listings_status_check
    check (status in ('draft', 'pending_review', 'rejected', 'available', 'reserved', 'sold')),
  add column if not exists review_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

create index if not exists listings_pending_review_created_idx
  on public.listings (created_at desc)
  where status = 'pending_review';

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
        ) then
          raise exception 'This listing status change is not allowed.' using errcode = '42501';
        end if;
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop policy if exists photos_write on public.listing_photos;
create policy photos_write on public.listing_photos for all to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid() and l.status <> 'pending_review'
    )
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid() and l.status <> 'pending_review'
    )
  );

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

    if new.status in ('reserved','sold') and new.buyer_id is not null then
      insert into public.notifications (user_id, type, payload)
      values (new.buyer_id, 'listing_' || new.status, jsonb_build_object('listing_id', new.id, 'title', new.title));
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

insert into storage.buckets (id, name, public)
values ('admin-backups', 'admin-backups', false)
on conflict (id) do update set public = false;

commit;
