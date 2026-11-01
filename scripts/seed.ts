import "./env";
import { closeDb, query, tx, databaseLabel, usingEmbeddedDatabase } from "../src/lib/db";
import { storeImage } from "../src/lib/storage";
import type { ProductCondition } from "../src/lib/types";

interface DemoVariant {
  size: string | null;
  color: string | null;
  colorHex: string | null;
  stock: number;
}

interface DemoProduct {
  slug: string;
  title: string;
  category: string;
  condition: ProductCondition;
  pricePaise: number;
  compareAtPricePaise?: number;
  featured?: boolean;
  description: string;
  measurements: string;
  variants: DemoVariant[];
  palette: [string, string, string];
}

const categories = [
  { name: "Outerwear", slug: "outerwear", description: "Coats, jackets and layering pieces." },
  { name: "Tops", slug: "tops", description: "Shirts, tees and knits." },
  { name: "Bottoms", slug: "bottoms", description: "Trousers, skirts and denim." },
  { name: "Accessories", slug: "accessories", description: "Small leather goods and finishing pieces." },
];

const demoNotice =
  "Demo listing — this is a sample product used to preview the storefront. It is not real inventory and cannot be purchased as described. Replace or archive it before launch.";

const products: DemoProduct[] = [
  {
    slug: "demo-wool-blend-overcoat",
    title: "Demo — Wool-Blend Overcoat",
    category: "outerwear",
    condition: "pre_owned",
    pricePaise: 499900,
    compareAtPricePaise: 749900,
    featured: true,
    description: `${demoNotice}\n\nA longline overcoat with notch lapels and a single-breasted front. Sample condition note: light wear at the cuffs, no holes.`,
    measurements: "Sample measurements: chest 42 in, length 46 in, sleeve 25 in.",
    palette: ["#2a2419", "#171411", "#c9a84c"],
    variants: [
      { size: "M", color: "Camel", colorHex: "#a9855a", stock: 1 },
      { size: "L", color: "Camel", colorHex: "#a9855a", stock: 1 },
    ],
  },
  {
    slug: "demo-structured-denim-jacket",
    title: "Demo — Structured Denim Jacket",
    category: "outerwear",
    condition: "pre_owned",
    pricePaise: 289900,
    featured: true,
    description: `${demoNotice}\n\nA boxy denim jacket with metal buttons and patch pockets. Sample condition note: minor fading at the shoulders.`,
    measurements: "Sample measurements: chest 44 in, length 24 in, sleeve 24 in.",
    palette: ["#1d2a33", "#10171c", "#7f9bab"],
    variants: [
      { size: "S", color: "Indigo", colorHex: "#2f4a5c", stock: 1 },
      { size: "M", color: "Indigo", colorHex: "#2f4a5c", stock: 1 },
      { size: "L", color: "Indigo", colorHex: "#2f4a5c", stock: 0 },
    ],
  },
  {
    slug: "demo-pleated-midi-skirt",
    title: "Demo — Pleated Midi Skirt",
    category: "bottoms",
    condition: "pre_owned",
    pricePaise: 189900,
    featured: true,
    description: `${demoNotice}\n\nA softly pleated midi skirt with an elasticated waist. Sample condition note: excellent, no visible marks.`,
    measurements: "Sample measurements: waist 28 in, length 31 in.",
    palette: ["#2a2730", "#161419", "#9a8fb0"],
    variants: [
      { size: "S", color: "Charcoal", colorHex: "#3a3740", stock: 1 },
      { size: "M", color: "Charcoal", colorHex: "#3a3740", stock: 1 },
    ],
  },
  {
    slug: "demo-silk-blend-shirt",
    title: "Demo — Silk-Blend Shirt",
    category: "tops",
    condition: "pre_owned",
    pricePaise: 219900,
    featured: true,
    description: `${demoNotice}\n\nA relaxed shirt with a soft drape and mother-of-pearl style buttons. Sample condition note: one tiny repair at the inner placket.`,
    measurements: "Sample measurements: chest 40 in, length 27 in, sleeve 23 in.",
    palette: ["#332f27", "#1a1814", "#d8cfc0"],
    variants: [
      { size: "S", color: "Ivory", colorHex: "#e6dfd2", stock: 1 },
      { size: "M", color: "Ivory", colorHex: "#e6dfd2", stock: 1 },
    ],
  },
  {
    slug: "demo-heavyweight-cotton-tee",
    title: "Demo — Heavyweight Cotton Tee",
    category: "tops",
    condition: "new",
    pricePaise: 89900,
    featured: true,
    description: `${demoNotice}\n\nA boxy, heavyweight cotton tee with a ribbed neckline. Sample product, unused.`,
    measurements: "Sample measurements: chest 42 in, length 27 in.",
    palette: ["#24231f", "#141311", "#b9b0a0"],
    variants: [
      { size: "S", color: "Black", colorHex: "#111111", stock: 4 },
      { size: "M", color: "Black", colorHex: "#111111", stock: 4 },
      { size: "L", color: "Black", colorHex: "#111111", stock: 3 },
      { size: "M", color: "White", colorHex: "#f2eee6", stock: 2 },
    ],
  },
  {
    slug: "demo-wide-leg-trousers",
    title: "Demo — Wide-Leg Trousers",
    category: "bottoms",
    condition: "new",
    pricePaise: 249900,
    description: `${demoNotice}\n\nHigh-rise trousers with a clean front and a full wide leg. Sample product, unused.`,
    measurements: "Sample measurements: waist 30 in, inseam 30 in, leg opening 22 in.",
    palette: ["#2c2a24", "#181713", "#a9a08e"],
    variants: [
      { size: "28", color: "Stone", colorHex: "#b7ac97", stock: 2 },
      { size: "30", color: "Stone", colorHex: "#b7ac97", stock: 2 },
      { size: "32", color: "Stone", colorHex: "#b7ac97", stock: 1 },
    ],
  },
  {
    slug: "demo-leather-card-holder",
    title: "Demo — Leather Card Holder",
    category: "accessories",
    condition: "new",
    pricePaise: 129900,
    description: `${demoNotice}\n\nA slim card holder with four pockets. Sample product, unused.`,
    measurements: "Sample measurements: 10 cm × 7.5 cm.",
    palette: ["#31251a", "#1a130d", "#b98b5e"],
    variants: [{ size: null, color: "Tan", colorHex: "#9d6b42", stock: 3 }],
  },
  {
    slug: "demo-ribbed-knit-beanie",
    title: "Demo — Ribbed Knit Beanie",
    category: "accessories",
    condition: "new",
    pricePaise: 79900,
    description: `${demoNotice}\n\nA close-fitting ribbed beanie with a folded cuff. Sample product, unused.`,
    measurements: "Sample measurements: one size, 21 cm flat width.",
    palette: ["#242b1f", "#11150e", "#8a9b6e"],
    variants: [{ size: null, color: "Olive", colorHex: "#5d6b45", stock: 4 }],
  },
  {
    slug: "demo-linen-camp-collar-shirt",
    title: "Demo — Linen Camp Collar Shirt",
    category: "tops",
    condition: "new",
    pricePaise: 279900,
    description: `${demoNotice}\n\nA relaxed linen shirt with a camp collar and straight hem. Sample product, unused.`,
    measurements: "Sample measurements: chest 44 in, length 29 in, sleeve 24 in.",
    palette: ["#302c21", "#191712", "#cbbd9e"],
    variants: [
      { size: "M", color: "Sand", colorHex: "#c3b394", stock: 2 },
      { size: "L", color: "Sand", colorHex: "#c3b394", stock: 2 },
    ],
  },
  {
    slug: "demo-canvas-tote",
    title: "Demo — Canvas Tote",
    category: "accessories",
    condition: "new",
    pricePaise: 149900,
    description: `${demoNotice}\n\nA structured canvas tote with an internal pocket and flat handles. Sample product, unused.`,
    measurements: "Sample measurements: 38 cm × 34 cm × 12 cm.",
    palette: ["#2d2a24", "#171612", "#c9c1af"],
    variants: [{ size: null, color: "Ecru", colorHex: "#ded5c2", stock: 3 }],
  },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function demoSvg(product: DemoProduct, index: number): string {
  const [top, bottom, accent] = product.palette;
  const label = product.title.replace(/^Demo — /, "");
  const words = label.split(" ");
  const midpoint = Math.ceil(words.length / 2);
  const firstLine = escapeXml(words.slice(0, midpoint).join(" "));
  const secondLine = escapeXml(words.slice(midpoint).join(" "));
  const variantLabel = index === 0 ? "FRONT VIEW" : "DETAIL VIEW";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1250" viewBox="0 0 1000 1250">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${index === 0 ? "0.35" : "0.65"}" cy="0.28" r="0.75">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.30"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1000" height="1250" fill="url(#bg)"/>
  <rect width="1000" height="1250" fill="url(#glow)"/>
  <rect x="42" y="42" width="916" height="1166" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="1.5"/>
  <text x="500" y="120" text-anchor="middle" fill="${accent}" font-family="Georgia, serif" font-size="30" letter-spacing="12">SHS</text>
  <text x="500" y="156" text-anchor="middle" fill="${accent}" fill-opacity="0.7" font-family="Arial, sans-serif" font-size="14" letter-spacing="9">COLLECTIVE</text>
  <line x1="370" y1="196" x2="630" y2="196" stroke="${accent}" stroke-opacity="0.35"/>
  <text x="500" y="930" text-anchor="middle" fill="#f3eee4" font-family="Georgia, serif" font-size="54">${firstLine}</text>
  <text x="500" y="995" text-anchor="middle" fill="#f3eee4" font-family="Georgia, serif" font-size="54">${secondLine}</text>
  <text x="500" y="1052" text-anchor="middle" fill="#d6ccbc" fill-opacity="0.75" font-family="Arial, sans-serif" font-size="17" letter-spacing="6">${variantLabel}</text>
  <rect x="310" y="1100" width="380" height="52" fill="none" stroke="${accent}" stroke-opacity="0.65"/>
  <text x="500" y="1132" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="17" font-weight="bold" letter-spacing="5">DEMO IMAGE</text>
  <text x="500" y="1178" text-anchor="middle" fill="#9b9284" font-family="Arial, sans-serif" font-size="13" letter-spacing="3">NOT A REAL PRODUCT PHOTO</text>
</svg>`;
}

function variantSku(base: string, variant: DemoVariant, index: number): string {
  const parts = [base, variant.size, variant.color, String(index + 1)]
    .filter(Boolean)
    .join("-")
    .toUpperCase();
  return parts.replace(/[^A-Z0-9-]/g, "");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seeding is disabled when NODE_ENV=production.");
  }
  if (process.env.DATABASE_URL && process.env.SHS_ALLOW_DEMO_SEED !== "1") {
    throw new Error(
      "Refusing to seed demo products into a real database. Set SHS_ALLOW_DEMO_SEED=1 only if this database is intentionally a staging/demo database.",
    );
  }

  const existing = await query<{ count: number }>(
    `select count(*)::int as count from products where is_demo = true`,
  );
  if (Number(existing[0]?.count ?? 0) > 0 && process.env.SHS_SEED_RESET !== "1") {
    console.info(
      `[db:seed] ${existing[0]?.count} demo products already exist. Set SHS_SEED_RESET=1 to replace them.`,
    );
    return;
  }

  if (process.env.SHS_SEED_RESET === "1") {
    await query(`delete from products where is_demo = true`);
    console.info("[db:seed] removed previous demo products.");
  }

  for (const category of categories) {
    await query(
      `insert into categories (name, slug, description, sort_order)
       values ($1, $2, $3, $4)
       on conflict (slug) do update set name = excluded.name, description = excluded.description`,
      [category.name, category.slug, category.description, categories.indexOf(category)],
    );
  }

  const stored: Array<{ product: DemoProduct; images: Array<{ key: string; width: number; height: number }> }> = [];

  for (const product of products) {
    const images: Array<{ key: string; width: number; height: number }> = [];
    for (let index = 0; index < 2; index += 1) {
      const image = await storeImage(Buffer.from(demoSvg(product, index)), {
        prefix: "demo",
        maxBytes: 2 * 1024 * 1024,
      });
      images.push({ key: image.key, width: image.width, height: image.height });
    }
    stored.push({ product, images });
  }

  await tx(async (client) => {
    const categoryRows = await client.query<{ id: string; slug: string }>(
      `select id, slug from categories where slug = any($1::text[])`,
      [categories.map((category) => category.slug)],
    );
    const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

    for (let index = 0; index < stored.length; index += 1) {
      const { product, images } = stored[index]!;
      const categoryId = categoryIds.get(product.category);
      if (!categoryId) throw new Error(`Missing category ${product.category}`);

      const rows = await client.query<{ id: string }>(
        `insert into products (
           slug, title, description, category_id, condition, price_paise,
           compare_at_price_paise, sku, status, featured, measurements, is_demo, published_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'published', $9, $10, true,
           now() - ($11::int * interval '1 day'))
         returning id`,
        [
          product.slug,
          product.title,
          product.description,
          categoryId,
          product.condition,
          product.pricePaise,
          product.compareAtPricePaise ?? null,
          `DEMO-${String(index + 1).padStart(3, "0")}`,
          product.featured ?? false,
          product.measurements,
          index,
        ],
      );
      const productId = rows[0]?.id;
      if (!productId) throw new Error(`Failed to insert ${product.slug}`);

      for (let imageIndex = 0; imageIndex < images.length; imageIndex += 1) {
        const image = images[imageIndex]!;
        await client.query(
          `insert into product_images (product_id, storage_key, alt_text, width, height, sort_order)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            productId,
            image.key,
            `Demo image for ${product.title.replace(/^Demo — /, "")} (${imageIndex + 1} of ${images.length})`,
            image.width,
            image.height,
            imageIndex,
          ],
        );
      }

      for (let variantIndex = 0; variantIndex < product.variants.length; variantIndex += 1) {
        const variant = product.variants[variantIndex]!;
        const variantRows = await client.query<{ id: string }>(
          `insert into product_variants (
             product_id, size, color, color_hex, sku, stock_quantity, is_active, sort_order
           ) values ($1, $2, $3, $4, $5, $6, true, $7)
           returning id`,
          [
            productId,
            variant.size,
            variant.color,
            variant.colorHex,
            variantSku(`DEMO-${String(index + 1).padStart(3, "0")}`, variant, variantIndex),
            variant.stock,
            variantIndex,
          ],
        );
        const variantId = variantRows[0]?.id;
        if (variantId && variant.stock > 0) {
          await client.query(
            `insert into inventory_movements (variant_id, delta, reason, note)
             values ($1, $2, 'restock', $3)`,
            [variantId, variant.stock, "Demo seed stock"],
          );
        }
      }
    }
  });

  console.info(`[db:seed] ${databaseLabel()}`);
  console.info(`[db:seed] inserted ${products.length} clearly-labelled demo products.`);
  if (usingEmbeddedDatabase()) {
    console.info("[db:seed] demo products are shown only in development or when SHS_SHOW_DEMO=1.");
  }
}

main()
  .catch((error) => {
    console.error("[db:seed] failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
