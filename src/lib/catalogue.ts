import "server-only";
import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/**
 * Read-only access to the shared ERP database through its public storefront
 * functions (see STOREFRONT_RULES.md). Public key only; no table access.
 * Product content is cached for a minute; availability is read live.
 */

export type Section = "main" | "mahib";

export type Category = {
  slug: string;
  name: string;
  section: Section;
  description: string | null;
  banner: string | null;
  products: number;
};

export type ProductCard = {
  slug: string;
  title: string;
  thumbnail: string | null;
  category: { slug: string; name: string; section: Section };
  kind: "garment" | "fabric" | "empty";
  price_min_paise: number | null;
  price_max_paise: number | null;
  price_from_paise_per_m: number | null;
  sold_out: boolean;
  featured_in_category: boolean;
  featured_rank: number | null;
  home_featured: boolean;
};

export type SizeOption = { size: string | null; price_paise: number | null; left: number };

export type Product = ProductCard & {
  description: string | null;
  images: string[];
  tags: string[];
  /** Short bullet list (empty until staff add some; missing before ERP migration 20261030000800). */
  highlights?: string[];
  seo_title: string;
  seo_description: string | null;
  sizes: SizeOption[];
};

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export async function getCategories(section?: Section): Promise<Category[]> {
  "use cache";
  cacheLife("minutes");
  return (await call<Category[]>("storefront_categories", { p_section: section ?? null })) ?? [];
}

export async function getProducts(section?: Section, category?: string): Promise<ProductCard[]> {
  "use cache";
  cacheLife("minutes");
  return (
    (await call<ProductCard[]>("storefront_products", {
      p_section: section ?? null,
      p_category: category ?? null,
    })) ?? []
  );
}

export async function getHomeFeatured(): Promise<ProductCard[]> {
  "use cache";
  cacheLife("minutes");
  return (await call<ProductCard[]>("storefront_home_featured")) ?? [];
}

/** Cached product content (title, photos, description, SEO). */
export async function getProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  return (await call<Product | null>("storefront_product", { p_slug: slug })) ?? null;
}

/** Live read for sizes, pieces left and sold-out state. Never cached. */
export async function getProductLive(slug: string): Promise<Product | null> {
  return (await call<Product | null>("storefront_product", { p_slug: slug })) ?? null;
}

export async function getSettings(): Promise<{ whatsapp_number: string }> {
  "use cache";
  cacheLife("hours");
  return await call<{ whatsapp_number: string }>("storefront_settings");
}
