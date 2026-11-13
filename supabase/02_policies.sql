alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.laptop_models enable row level security;
alter table public.price_reports enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.identification_results enable row level security;
alter table public.seller_hints enable row level security;
alter table public.condition_reports enable row level security;
alter table public.offers enable row level security;
alter table public.saved_listings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.chat_alerts enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.usage_counters enable row level security;
alter table public.audit_log enable row level security;

-- profiles and catalog: public read
create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy private_own on public.profile_private for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy models_read on public.laptop_models for select to anon, authenticated using (true);
create policy models_admin on public.laptop_models for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy prices_read on public.price_reports for select to anon, authenticated using (true);
create policy prices_admin on public.price_reports for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- listings: guests see published ones; drafts are visible only to the seller
create policy listings_read on public.listings for select to anon, authenticated
  using ((status in ('available','reserved','sold') and is_visible) or seller_id = auth.uid() or public.is_staff());
create policy listings_insert on public.listings for insert to authenticated with check (
  seller_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy listings_update on public.listings for update to authenticated
  using (seller_id = auth.uid() or public.is_staff()) with check (seller_id = auth.uid() or public.is_staff());
create policy listings_delete on public.listings for delete to authenticated using (seller_id = auth.uid() or public.is_staff());

create policy photos_read on public.listing_photos for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy photos_write on public.listing_photos for all to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

create policy condition_read on public.condition_reports for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy condition_write on public.condition_reports for all to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

create policy ident_owner on public.identification_results for all to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );
create policy hints_owner on public.seller_hints for all to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.identification_results i join public.listings l on l.id = i.listing_id where i.id = identification_id and l.seller_id = auth.uid())
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.identification_results i join public.listings l on l.id = i.listing_id where i.id = identification_id and l.seller_id = auth.uid())
  );

-- offers
create policy offers_read on public.offers for select to authenticated
  using (buyer_id = auth.uid() or public.is_staff()
         or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy offers_insert on public.offers for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'available' and l.seller_id <> auth.uid())
  );
create policy offers_update on public.offers for update to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and (buyer_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  )
  with check (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and (buyer_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  );

-- saved items
create policy saved_own on public.saved_listings for all to authenticated
  using (user_id = auth.uid() and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (user_id = auth.uid() and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- chat: messages are inserted only by the server (scam check), read by the two people
create policy conv_read on public.conversations for select to authenticated using (
  not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and (buyer_id = auth.uid() or seller_id = auth.uid())
);
create policy conv_insert on public.conversations for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and seller_id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy msg_read on public.messages for select to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
  );
create policy msg_mark_read on public.messages for update to authenticated
  using (
    sender_id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
  );
create policy alerts_staff on public.chat_alerts for select to authenticated using (public.is_staff());

-- reviews, reports, notifications, audit
create policy reviews_read on public.reviews for select to anon, authenticated using (true);
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
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
create policy reports_insert on public.reports for insert to authenticated with check (
  reporter_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy reports_read on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_staff());
create policy reports_staff_update on public.reports for update to authenticated using (public.is_staff());
create policy notif_read on public.notifications for select to authenticated using (
  user_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy notif_update on public.notifications for update to authenticated using (
  user_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy audit_staff on public.audit_log for select to authenticated using (public.is_staff());

-- storage buckets: listing photos are public to read; hint files are private
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg','image/png','image/webp']),
       ('hint-files', 'hint-files', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- real-time: chat messages and notifications
alter publication supabase_realtime add table public.messages, public.notifications;
