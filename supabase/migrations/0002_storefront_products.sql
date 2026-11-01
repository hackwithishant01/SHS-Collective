insert into categories (name, slug, description, sort_order)
values
  ('Outerwear', 'outerwear', 'Coats, jackets and layering pieces.', 0),
  ('Bottoms', 'bottoms', 'Trousers, skirts and denim.', 2)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into products (
  slug, title, description, category_id, condition, price_paise, sku, status,
  featured, measurements, published_at
)
select
  product.slug,
  product.title,
  product.description,
  category.id,
  'pre_owned',
  product.price_paise,
  product.sku,
  'published',
  true,
  product.measurements,
  now()
from (
  values
    (
      'red-high-collar-jacket',
      'Red High-Collar Utility Jacket',
      'A bold, versatile high-collar jacket with a sleek, minimalist shape and functional details. An easy everyday layer for unpredictable weather.',
      'outerwear',
      45000,
      'SHS-JACKET-RED-XL',
      'Size: XL'
    ),
    (
      'light-grey-check-jacket',
      'Light Grey Check Jacket',
      E'A timeless light-grey jacket with a subtle check pattern, sleek black details and a clean, minimal design.\n\nFull front zip, stand collar with snap buttons, two front zip pockets and ribbed hem. Lightweight and comfortable.\n\nSize: L\nChest: 44 in\nLength: 26 in',
      'outerwear',
      40000,
      'SHS-JACKET-GREY-L',
      'Size: L; chest 44 in; length 26 in'
    ),
    (
      'classic-blue-jeans',
      'Classic Blue Straight-Leg Jeans',
      E'A clean, timeless pair of jeans with a naturally faded blue wash and subtle worn-in texture. The straight, comfortable silhouette is easy to style for everyday wear.\n\nWaist: 34 in\nLength: 40 in\nFit: Straight / regular\nColour: Classic blue\nCondition: Excellent\nUnique pre-owned piece — one available.',
      'bottoms',
      40000,
      'SHS-JEANS-BLUE-34',
      'Waist 34 in; length 40 in; straight/regular fit'
    ),
    (
      'black-off-white-windcheater',
      'Black & Off-White Hooded Windcheater',
      E'A black-and-off-white windcheater with contrast panels, embroidered detailing and a lightweight feel for everyday wear.\n\nAttached hood, smooth front zip with button flap, and a comfortable regular fit.\n\nSize: L\nChest: 24 in\nLength: 28 in\nUnique pre-owned piece — one available.',
      'outerwear',
      60000,
      'SHS-WINDCHEATER-BLACK-L',
      'Size: L; chest 24 in; length 28 in'
    )
) as product(slug, title, description, category_slug, price_paise, sku, measurements)
join categories category on category.slug = product.category_slug
where not exists (
  select 1 from products existing where existing.slug = product.slug
);

insert into product_images (product_id, storage_key, alt_text, sort_order)
select product.id, image.storage_key, image.alt_text, image.sort_order
from (
  values
    ('red-high-collar-jacket', 'catalog/red-high-collar-jacket/01.webp', 'Red high-collar utility jacket, front view', 0),
    ('red-high-collar-jacket', 'catalog/red-high-collar-jacket/02.webp', 'Red high-collar utility jacket, back view', 1),
    ('light-grey-check-jacket', 'catalog/light-grey-check-jacket/01.webp', 'Light grey check jacket, front view', 0),
    ('light-grey-check-jacket', 'catalog/light-grey-check-jacket/02.webp', 'Light grey check jacket, back view', 1),
    ('light-grey-check-jacket', 'catalog/light-grey-check-jacket/03.webp', 'Light grey check jacket, folded detail', 2),
    ('classic-blue-jeans', 'catalog/classic-blue-jeans/01.webp', 'Classic blue jeans, front view', 0),
    ('classic-blue-jeans', 'catalog/classic-blue-jeans/02.webp', 'Classic blue jeans, back view', 1),
    ('classic-blue-jeans', 'catalog/classic-blue-jeans/03.webp', 'Classic blue jeans, waistband detail', 2),
    ('black-off-white-windcheater', 'catalog/black-off-white-windcheater/01.webp', 'Black and off-white hooded windcheater, front view', 0),
    ('black-off-white-windcheater', 'catalog/black-off-white-windcheater/02.webp', 'Black and off-white hooded windcheater, back view', 1),
    ('black-off-white-windcheater', 'catalog/black-off-white-windcheater/03.webp', 'Black and off-white windcheater, close-up detail', 2),
    ('black-off-white-windcheater', 'catalog/black-off-white-windcheater/04.webp', 'Black and off-white hooded windcheater, alternate front view', 3),
    ('black-off-white-windcheater', 'catalog/black-off-white-windcheater/05.webp', 'Black and off-white windcheater sleeve detail', 4),
    ('black-off-white-windcheater', 'catalog/black-off-white-windcheater/06.webp', 'Black and off-white windcheater, folded view', 5)
) as image(product_slug, storage_key, alt_text, sort_order)
join products product on product.slug = image.product_slug
where not exists (
  select 1
  from product_images existing
  where existing.product_id = product.id
    and existing.storage_key = image.storage_key
);

insert into product_variants (
  product_id, size, color, color_hex, sku, stock_quantity, is_active, sort_order
)
select
  product.id,
  variant.size,
  variant.color,
  variant.color_hex,
  variant.sku,
  1,
  true,
  0
from (
  values
    ('red-high-collar-jacket', 'XL', 'Red', '#B51F35', 'SHS-JACKET-RED-XL'),
    ('light-grey-check-jacket', 'L', 'Light Grey', '#B8BDB9', 'SHS-JACKET-GREY-L'),
    ('classic-blue-jeans', '34', 'Classic Blue', '#2D4661', 'SHS-JEANS-BLUE-34'),
    ('black-off-white-windcheater', 'L', 'Black / Off-White', '#161616', 'SHS-WINDCHEATER-BLACK-L')
) as variant(product_slug, size, color, color_hex, sku)
join products product on product.slug = variant.product_slug
on conflict do nothing;

insert into inventory_movements (variant_id, delta, reason, note)
select variant.id, 1, 'restock', 'Initial storefront listing'
from product_variants variant
join products product on product.id = variant.product_id
where product.slug in (
  'red-high-collar-jacket',
  'light-grey-check-jacket',
  'classic-blue-jeans',
  'black-off-white-windcheater'
)
and not exists (
  select 1
  from inventory_movements movement
  where movement.variant_id = variant.id
    and movement.reason = 'restock'
    and movement.note = 'Initial storefront listing'
);
