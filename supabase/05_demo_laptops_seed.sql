-- Register a normal Frugl account first, then replace this email with that
-- account's email before running the script in the Supabase SQL Editor.
do $seed$
declare
  seed_seller_email text := 'tristanjamestorres9@gmail.com';
  seed_seller_id uuid;
begin
  select p.id
  into seed_seller_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(seed_seller_email)
  limit 1;

  if seed_seller_id is null then
    raise exception 'No Frugl profile found for %. Register this email first, then update seed_seller_email in this script.', seed_seller_email;
  end if;

  insert into public.listings (
    id, seller_id, model_id, title, description, price, brand, model,
    condition, deal_methods, location, cpu, gpu, screen_size, ram, storage,
    status, specs_verified, is_featured, is_visible, created_at, published_at
  )
  select
    d.id,
    seed_seller_id,
    laptop_model.id,
    d.title,
    d.description,
    d.price,
    d.brand,
    d.model,
    d.condition,
    d.deal_methods,
    d.location,
    d.cpu,
    d.gpu,
    d.screen_size,
    d.ram,
    d.storage,
    'available',
    false,
    d.is_featured,
    true,
    now() - (11 - d.sort_order) * interval '1 day',
    now() - (11 - d.sort_order) * interval '1 day'
  from (
    values
      (
        '50000000-0000-4000-8000-000000000001'::uuid,
        'Apple', 'MacBook Air (M1, 2020)', 'Sample · Apple MacBook Air M1',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        35000, 'like_new', array['public_meetup']::text[], 'Quezon City',
        'Apple M1 8-core', 'Apple M1 7-core GPU', 13.3, '8GB', '256GB', true, 1
      ),
      (
        '50000000-0000-4000-8000-000000000002'::uuid,
        'Apple', 'MacBook Pro 13 (M1, 2020)', 'Sample · Apple MacBook Pro 13 M1',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        43000, 'like_new', array['public_meetup','door_dropoff']::text[], 'Makati City',
        'Apple M1 8-core', 'Apple M1 8-core GPU', 13.3, '8GB', '256GB', false, 2
      ),
      (
        '50000000-0000-4000-8000-000000000003'::uuid,
        'Dell', 'Latitude 5420', 'Sample · Dell Latitude 5420',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        21000, 'lightly_used', array['public_meetup']::text[], 'San Pablo City',
        'Intel Core i5-1145G7', 'Intel Iris Xe', 14.0, '8GB', '256GB', false, 3
      ),
      (
        '50000000-0000-4000-8000-000000000004'::uuid,
        'Dell', 'XPS 13 9310', 'Sample · Dell XPS 13 9310',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        36000, 'lightly_used', array['public_meetup','door_dropoff']::text[], 'Pasig City',
        'Intel Core i7-1185G7', 'Intel Iris Xe', 13.4, '16GB', '512GB', true, 4
      ),
      (
        '50000000-0000-4000-8000-000000000005'::uuid,
        'HP', 'EliteBook 840 G7', 'Sample · HP EliteBook 840 G7',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        18000, 'well_used', array['public_meetup']::text[], 'Calamba City',
        'Intel Core i5-10210U', 'Intel UHD Graphics', 14.0, '8GB', '256GB', false, 5
      ),
      (
        '50000000-0000-4000-8000-000000000006'::uuid,
        'HP', 'Pavilion 15-eg0000', 'Sample · HP Pavilion 15',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        24000, 'like_new', array['public_meetup','door_dropoff']::text[], 'Manila',
        'Intel Core i5-1135G7', 'Intel Iris Xe', 15.6, '8GB', '512GB', false, 6
      ),
      (
        '50000000-0000-4000-8000-000000000007'::uuid,
        'Lenovo', 'ThinkPad T14 Gen 2', 'Sample · Lenovo ThinkPad T14 Gen 2',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        25000, 'lightly_used', array['public_meetup']::text[], 'Santa Rosa City',
        'Intel Core i5-1135G7', 'Intel Iris Xe', 14.0, '8GB', '256GB', false, 7
      ),
      (
        '50000000-0000-4000-8000-000000000008'::uuid,
        'Lenovo', 'ThinkPad X1 Carbon Gen 9', 'Sample · Lenovo ThinkPad X1 Carbon Gen 9',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        39000, 'like_new', array['public_meetup','door_dropoff']::text[], 'Quezon City',
        'Intel Core i7-1165G7', 'Intel Iris Xe', 14.0, '16GB', '512GB', true, 8
      ),
      (
        '50000000-0000-4000-8000-000000000009'::uuid,
        'ASUS', 'VivoBook 15 X515EA', 'Sample · ASUS VivoBook 15',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        16000, 'well_used', array['public_meetup']::text[], 'Biñan City',
        'Intel Core i3-1115G4', 'Intel UHD Graphics', 15.6, '8GB', '256GB', false, 9
      ),
      (
        '50000000-0000-4000-8000-000000000010'::uuid,
        'Acer', 'Nitro 5 AN515-57', 'Sample · Acer Nitro 5',
        'Sample listing for development preview. Details are illustrative; inspect any device before purchase.',
        34000, 'lightly_used', array['public_meetup','door_dropoff']::text[], 'San Pedro City',
        'Intel Core i5-11400H', 'NVIDIA GeForce RTX 3050', 15.6, '8GB', '512GB', false, 10
      )
  ) as d(
    id, brand, model, title, description, price, condition, deal_methods, location,
    cpu, gpu, screen_size, ram, storage, is_featured, sort_order
  )
  left join lateral (
    select m.id
    from public.laptop_models m
    where m.brand = d.brand and m.series = d.model
    order by m.id
    limit 1
  ) as laptop_model on true
  on conflict (id) do update set
    seller_id = excluded.seller_id,
    model_id = excluded.model_id,
    title = excluded.title,
    description = excluded.description,
    price = excluded.price,
    brand = excluded.brand,
    model = excluded.model,
    condition = excluded.condition,
    deal_methods = excluded.deal_methods,
    location = excluded.location,
    cpu = excluded.cpu,
    gpu = excluded.gpu,
    screen_size = excluded.screen_size,
    ram = excluded.ram,
    storage = excluded.storage,
    status = excluded.status,
    specs_verified = excluded.specs_verified,
    is_featured = excluded.is_featured,
    is_visible = excluded.is_visible,
    created_at = excluded.created_at,
    published_at = excluded.published_at;
end;
$seed$;
