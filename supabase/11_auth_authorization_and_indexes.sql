begin;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select status = 'active' from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid() and public.is_active_user());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists private_own on public.profile_private;
create policy private_own on public.profile_private for all to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid() and public.is_active_user());

drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings for insert to authenticated with check (
  seller_id = auth.uid()
  and public.is_active_user()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings for update to authenticated
  using ((seller_id = auth.uid() and public.is_active_user()) or public.is_staff())
  with check ((seller_id = auth.uid() and public.is_active_user()) or public.is_staff());

drop policy if exists listings_delete on public.listings;
create policy listings_delete on public.listings for delete to authenticated
  using ((seller_id = auth.uid() and public.is_active_user()) or public.is_staff());

drop policy if exists photos_write on public.listing_photos;
create policy photos_write on public.listing_photos for all to authenticated
  using (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  )
  with check (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

drop policy if exists condition_write on public.condition_reports;
create policy condition_write on public.condition_reports for all to authenticated
  using (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  )
  with check (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

drop policy if exists ident_owner on public.identification_results;
create policy ident_owner on public.identification_results for all to authenticated
  using (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  )
  with check (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

drop policy if exists hints_owner on public.seller_hints;
create policy hints_owner on public.seller_hints for all to authenticated
  using (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (
      select 1
      from public.identification_results i
      join public.listings l on l.id = i.listing_id
      where i.id = identification_id and l.seller_id = auth.uid()
    )
  )
  with check (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (
      select 1
      from public.identification_results i
      join public.listings l on l.id = i.listing_id
      where i.id = identification_id and l.seller_id = auth.uid()
    )
  );

drop policy if exists offers_read on public.offers;
create policy offers_read on public.offers for select to authenticated
  using (
    public.is_active_user()
    and (
      buyer_id = auth.uid()
      or public.is_staff()
      or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
    )
  );

drop policy if exists offers_insert on public.offers;
create policy offers_insert on public.offers for insert to authenticated with check (
  buyer_id = auth.uid()
  and public.is_active_user()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and exists (
    select 1 from public.listings l
    where l.id = listing_id and l.status = 'available' and l.seller_id <> auth.uid()
  )
);

drop policy if exists offers_update on public.offers;
create policy offers_update on public.offers for update to authenticated
  using (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and status = 'pending'
    and (buyer_id = auth.uid()
      or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  )
  with check (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and (
      (buyer_id = auth.uid() and status = 'withdrawn')
      or (
        status in ('accepted', 'declined')
        and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
      )
    )
  );

drop policy if exists saved_own on public.saved_listings;
create policy saved_own on public.saved_listings for all to authenticated
  using (user_id = auth.uid() and public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (user_id = auth.uid() and public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists conv_read on public.conversations;
create policy conv_read on public.conversations for select to authenticated using (
  public.is_active_user()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and (buyer_id = auth.uid() or seller_id = auth.uid())
);

drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert to authenticated with check (
  buyer_id = auth.uid()
  and seller_id <> auth.uid()
  and public.is_active_user()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.seller_id = conversations.seller_id
      and l.status in ('available', 'reserved')
      and l.is_visible
  )
);

drop policy if exists msg_read on public.messages;
create policy msg_read on public.messages for select to authenticated
  using (
    public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists msg_mark_read on public.messages;
create policy msg_mark_read on public.messages for update to authenticated
  using (
    public.is_active_user()
    and sender_id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  )
  with check (
    public.is_active_user()
    and sender_id <> auth.uid()
    and read_at is not null
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

revoke update on table public.messages from public, anon, authenticated;
grant update (read_at) on table public.messages to authenticated;
grant update on table public.messages to service_role;

revoke update on table public.offers from public, anon, authenticated;
grant update (status) on table public.offers to authenticated;
grant update on table public.offers to service_role;

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated with check (
  reviewer_id = auth.uid()
  and public.is_active_user()
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
  and public.is_active_user()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select to authenticated
  using (public.is_active_user() and (reporter_id = auth.uid() or public.is_staff()));

drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select to authenticated
  using (
    user_id = auth.uid()
    and public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using (
    user_id = auth.uid()
    and public.is_active_user()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and read_at is not null
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

revoke update on table public.notifications from public, anon, authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant update on table public.notifications to service_role;

drop policy if exists message_attachments_read on storage.objects;
create policy message_attachments_read on storage.objects for select to authenticated using (
  bucket_id = 'message-attachments'
  and public.is_active_user()
  and exists (
    select 1
    from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

create index if not exists listings_seller_status_created_idx
  on public.listings (seller_id, status, created_at desc);
create index if not exists conversations_buyer_updated_idx
  on public.conversations (buyer_id, updated_at desc);
create index if not exists conversations_seller_updated_idx
  on public.conversations (seller_id, updated_at desc);
create index if not exists offers_buyer_created_idx
  on public.offers (buyer_id, created_at desc);
create index if not exists reviews_reviewee_created_idx
  on public.reviews (reviewee_id, created_at desc);
create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);
create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);
create index if not exists chat_alerts_created_idx
  on public.chat_alerts (created_at desc);

commit;
