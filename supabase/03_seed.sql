insert into public.laptop_models (brand, series, model_number, cpu, gpu, screen_size, resolution, default_ram, default_storage, release_year) values
('Apple', 'MacBook Air (M1, 2020)', 'A2337', 'Apple M1 8-core', 'Apple M1 7-core GPU', 13.3, '2560x1600', '8GB', '256GB', 2020),
('Apple', 'MacBook Pro 13 (M1, 2020)', 'A2338', 'Apple M1 8-core', 'Apple M1 8-core GPU', 13.3, '2560x1600', '8GB', '256GB', 2020),
('Dell', 'Latitude 5420', null, 'Intel Core i5-1145G7', 'Intel Iris Xe', 14.0, '1920x1080', '8GB', '256GB', 2021),
('Dell', 'XPS 13 9310', null, 'Intel Core i7-1185G7', 'Intel Iris Xe', 13.4, '1920x1200', '16GB', '512GB', 2020),
('HP', 'EliteBook 840 G7', null, 'Intel Core i5-10210U', 'Intel UHD Graphics', 14.0, '1920x1080', '8GB', '256GB', 2020),
('HP', 'Pavilion 15-eg0000', null, 'Intel Core i5-1135G7', 'Intel Iris Xe', 15.6, '1920x1080', '8GB', '512GB', 2021),
('Lenovo', 'ThinkPad T14 Gen 2', null, 'Intel Core i5-1135G7', 'Intel Iris Xe', 14.0, '1920x1080', '8GB', '256GB', 2021),
('Lenovo', 'ThinkPad X1 Carbon Gen 9', null, 'Intel Core i7-1165G7', 'Intel Iris Xe', 14.0, '1920x1200', '16GB', '512GB', 2021),
('Lenovo', 'IdeaPad 3 15ITL6', null, 'Intel Core i3-1115G4', 'Intel UHD Graphics', 15.6, '1920x1080', '8GB', '256GB', 2021),
('ASUS', 'VivoBook 15 X515EA', null, 'Intel Core i3-1115G4', 'Intel UHD Graphics', 15.6, '1920x1080', '8GB', '256GB', 2021),
('ASUS', 'ROG Zephyrus G14 GA401', null, 'AMD Ryzen 9 4900HS', 'NVIDIA GeForce RTX 2060 Max-Q', 14.0, '1920x1080', '16GB', '1TB', 2020),
('Acer', 'Aspire 5 A515-56', null, 'Intel Core i5-1135G7', 'Intel Iris Xe', 15.6, '1920x1080', '8GB', '512GB', 2021),
('Acer', 'Nitro 5 AN515-57', null, 'Intel Core i5-11400H', 'NVIDIA GeForce RTX 3050', 15.6, '1920x1080', '8GB', '512GB', 2021),
('MSI', 'GF63 Thin 10SC', null, 'Intel Core i5-10500H', 'NVIDIA GeForce GTX 1650', 15.6, '1920x1080', '8GB', '512GB', 2020)
on conflict do nothing;

-- PLACEHOLDER prices in PHP for testing only (like-new base price per model)
with base(series, price) as (values
  ('MacBook Air (M1, 2020)', 38000), ('MacBook Pro 13 (M1, 2020)', 45000), ('Latitude 5420', 22000),
  ('XPS 13 9310', 38000), ('EliteBook 840 G7', 24000), ('Pavilion 15-eg0000', 26000),
  ('ThinkPad T14 Gen 2', 28000), ('ThinkPad X1 Carbon Gen 9', 40000), ('IdeaPad 3 15ITL6', 21000),
  ('VivoBook 15 X515EA', 20000), ('ROG Zephyrus G14 GA401', 48000), ('Aspire 5 A515-56', 25000),
  ('Nitro 5 AN515-57', 38000), ('GF63 Thin 10SC', 28000))
insert into public.price_reports (model_id, ram, storage, condition, low, median, high, sample_size, source, is_estimate)
select m.id, m.default_ram, m.default_storage, c.cond,
       round(b.price * c.mult * 0.85, -2), round(b.price * c.mult, -2), round(b.price * c.mult * 1.15, -2),
       0, 'placeholder estimate', true
from base b
join public.laptop_models m on m.series = b.series
cross join (values ('brand_new', 1.15), ('like_new', 1.0), ('lightly_used', 0.88), ('well_used', 0.75), ('heavily_used', 0.6)) as c(cond, mult);
