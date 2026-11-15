create or replace function public.notify_listing_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'draft' and new.status = 'available' then
      insert into public.notifications (user_id, type, payload)
      values (new.seller_id, 'listing_published',
              jsonb_build_object('listing_id', new.id, 'title', new.title));
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

drop trigger if exists listings_notify on public.listings;
create trigger listings_notify after update of status on public.listings
for each row execute function public.notify_listing_status();
