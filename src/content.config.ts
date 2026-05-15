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
 * Categories (granular, one per product) — grouped into umbrella sections
 * at the nav / listing level:
 *
 *   Aromáticos umbrella (/aromaticos):
 *   - "velas"         → soy-wax candles
 *   - "ambientadores" → room sprays, oils, etc.
 *   - "difusores"     → reed / ceramic diffusers
 *
 *   Cuidado personal umbrella (/cuidado-personal):
 *   - "jabones" → handcrafted soaps. Future: face oils, balms, etc. land here.
 *
 *   Sets umbrella (/sets):
 *   - "sets" → bundles. Same product shape, plus a `tags` entry like
 *              "san-valentin" or "dia-de-las-madres" used for seasonal
 *              grouping. The contents live in `includes` as plain strings.
 *
 *   Otros — uncategorized:
 *   - "otros" → anything new that doesn't yet fit an umbrella. Shows up only
 *               in the /productos overview, no dedicated listing page.
 *
 * "Souvenirs y Corporativos" lives on its own page (/personalizados) and is
 * NOT part of the product collection — it's a services/inquiry page with a
 * WhatsApp CTA, not a cart-checkout flow.
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
      category: z.enum([
        "velas",
        "ambientadores",
        "difusores",
        "jabones",
        "sets",
        "otros",
      ]),
      tags: z.array(z.string()).default([]),

      // Commerce
      priceDOP: z.number().int().positive(),
      sku: z.string().optional(),
      available: z.boolean().default(true),

      // Media — first item is the cover. Plain strings cover external URLs
      // (picsum placeholders) and Decap-uploaded paths like "/uploads/foo.jpg"
      // served from public/. image() handles relative-path imports for
      // bundled assets. Templates render whichever shape comes in.
      //
      // NOT required: Decap's list widget can't enforce a minimum, so a
      // product created without a photo would otherwise fail the whole
      // build and freeze every other pending change. Default to [] and let
      // templates fall back to a placeholder until a photo is uploaded.
      images: z.array(z.union([z.string(), image()])).default([]),

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
