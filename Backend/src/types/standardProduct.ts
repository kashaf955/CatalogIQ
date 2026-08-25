import { z } from "zod";

/**
 * The Standard Product shape (spec section 3). Every source (our catalog,
 * manufacturer file, competitor scrape) is normalized into this shape before
 * it reaches the matching engine, so the engine never depends on the
 * original source format.
 */
export const standardProductSchema = z.object({
  sku: z.string().trim().min(1).optional(),
  mpn: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  brand: z.string().trim().optional(),
  description: z.string().optional(),
  gtin: z.string().trim().optional(),
  price: z.number().nonnegative().optional(),
  images: z.array(z.string()).optional(),
  category: z.string().optional(),
  variants: z.array(z.string()).optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  material: z.string().optional(),
  finish: z.string().optional(),
  fitment: z.string().optional(),
  availability: z.string().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
});

export type StandardProduct = z.infer<typeof standardProductSchema>;

export const STANDARD_PRODUCT_FIELDS = Object.keys(
  standardProductSchema.shape
) as (keyof StandardProduct)[];
