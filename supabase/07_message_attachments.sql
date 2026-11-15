alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  4194304,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists message_attachments_read on storage.objects;
create policy message_attachments_read on storage.objects for select to authenticated using (
  bucket_id = 'message-attachments'
  and exists (
    select 1
    from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);
