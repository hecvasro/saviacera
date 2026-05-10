import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Product collection
 * ------------------
 * One Markdown file per product under `src/content/products/`. Frontmatter is
 * Zod-validated below. The schema is intentionally Decap-CMS friendly (flat
 * scalars + simple arrays) so we can drop a `config.yml` on top later without
 * reshaping content.
 *
 * Categories:
 *   - "velas"   → soy-wax candles
 *   - "jabones" → handcrafted soaps
 *   - "kits"    → bundles. Same product shape, just `category: "kits"` plus a
 *                 `tags` entry like "san-valentin" or "dia-de-las-madres" used
 *                 for seasonal grouping. The contents of the kit live in the
 *                 `includes` field as a plain string list — no relations.
 */
const products = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: ({ image }) =>
    z.object({
      // Display
      name: z.string(),
      tagline: z.string().optional(),
      description: z.string(),

      // Taxonomy
      category: z.enum(["velas", "jabones", "kits"]),
      tags: z.array(z.string()).default([]),

      // Commerce
      priceDOP: z.number().int().positive(),
      sku: z.string().optional(),
      stock: z.number().int().nonnegative().optional(),
      available: z.boolean().default(true),

      // Media — first item is the cover. Strings (URLs) and local image refs
      // both supported so we can swap picsum placeholders for real photos
      // later without touching templates.
      images: z.array(z.union([z.string().url(), image()])).min(1),

      // Kit-specific. Optional everywhere else so the schema stays one shape.
      includes: z.array(z.string()).default([]),

      // Free-form details rendered on the PDP, e.g. ["Aroma: coco + vainilla", "Duración: ~40h"]
      details: z.array(z.string()).default([]),

      // Sorting / surfacing
      featured: z.boolean().default(false),
      order: z.number().int().default(100),

      // Meta
      createdAt: z.coerce.date().optional(),
    }),
});

export const collections = { products };
