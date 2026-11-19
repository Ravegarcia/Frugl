begin;

alter table public.chat_alerts
  add column if not exists status text not null default 'open',
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

alter table public.chat_alerts
  drop constraint if exists chat_alerts_status_check,
  add constraint chat_alerts_status_check
    check (status in ('open', 'resolved', 'dismissed'));

create index if not exists chat_alerts_status_created_idx
  on public.chat_alerts (status, created_at desc);

drop policy if exists chat_alerts_staff_update on public.chat_alerts;
create policy chat_alerts_staff_update on public.chat_alerts for update to authenticated
  using (public.is_staff() and status = 'open')
  with check (public.is_staff() and status in ('resolved', 'dismissed'));

revoke update on table public.chat_alerts from public, anon, authenticated;
grant update (status, resolved_by, resolved_at) on table public.chat_alerts to authenticated;

commit;
