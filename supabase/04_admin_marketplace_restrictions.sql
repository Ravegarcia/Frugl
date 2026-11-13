-- Admin accounts use the moderation workspace, not buyer or seller actions.

create or replace function public.protect_profile_fields() returns trigger
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

drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings for insert to authenticated with check (
  seller_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists photos_write on public.listing_photos;
create policy photos_write on public.listing_photos for all to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

drop policy if exists condition_write on public.condition_reports;
create policy condition_write on public.condition_reports for all to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

drop policy if exists ident_owner on public.identification_results;
create policy ident_owner on public.identification_results for all to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

drop policy if exists hints_owner on public.seller_hints;
create policy hints_owner on public.seller_hints for all to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (
      select 1
      from public.identification_results i
      join public.listings l on l.id = i.listing_id
      where i.id = identification_id and l.seller_id = auth.uid()
    )
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (
      select 1
      from public.identification_results i
      join public.listings l on l.id = i.listing_id
      where i.id = identification_id and l.seller_id = auth.uid()
    )
  );

drop policy if exists offers_insert on public.offers;
create policy offers_insert on public.offers for insert to authenticated with check (
  buyer_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and exists (
    select 1 from public.listings l
    where l.id = listing_id and l.status = 'available' and l.seller_id <> auth.uid()
  )
);

drop policy if exists offers_update on public.offers;
create policy offers_update on public.offers for update to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and (buyer_id = auth.uid() or exists (
      select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()
    ))
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and (buyer_id = auth.uid() or exists (
      select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()
    ))
  );

drop policy if exists saved_own on public.saved_listings;
create policy saved_own on public.saved_listings for all to authenticated
  using (
    user_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists conv_read on public.conversations;
create policy conv_read on public.conversations for select to authenticated using (
  not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and (buyer_id = auth.uid() or seller_id = auth.uid())
);

drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert to authenticated with check (
  buyer_id = auth.uid()
  and seller_id <> auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists msg_read on public.messages;
create policy msg_read on public.messages for select to authenticated using (
  not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

drop policy if exists msg_mark_read on public.messages;
create policy msg_mark_read on public.messages for update to authenticated using (
  sender_id <> auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated with check (
  reviewer_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.status = 'sold'
      and (
        (l.seller_id = auth.uid() and l.buyer_id = reviewee_id)
        or (l.buyer_id = auth.uid() and l.seller_id = reviewee_id)
      )
  )
);

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (
  reporter_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select to authenticated using (
  user_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated using (
  user_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
