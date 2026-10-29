# Storefront rules (MAQDOOM'S Big Mall website)

This site is a read-only window onto the ERP's shared Supabase database.
The ERP (`maqdoom-s-INV`) owns the data, the schema and every migration.

## Hard rules

1. **Public key only.** Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never add a
   service-role or secret key to this project, its `.env` files or Vercel.
2. **No migrations here.** No `supabase/` folder, no SQL. Schema changes are
   made in the ERP repo, tested on the test project, then applied to live.
3. **Storefront functions only.** Read data through these RPCs, nothing else:
   - `storefront_settings()` — WhatsApp number
   - `storefront_categories(p_section)` — `main` / `mahib` / null for both
   - `storefront_products(p_section, p_category)` — product cards
   - `storefront_home_featured()` — one home pick per category
   - `storefront_product(p_slug)` — product page, sizes and pieces left
   Direct table reads are blocked for the public role, by design.
4. **Photos** come from the public `ecommerce-images` bucket. Each photo has a
   large copy `<id>.webp` (1600×2000) and a card copy `<id>.card.webp` (600×750).
   Use `imageUrl(path, "large" | "card")` from `src/lib/site.ts`.
5. **Prices** are in paise. Online price = showroom selling price, set in the ERP.

## How it works

- Content (titles, photos, categories) is cached for a few minutes
  (`"use cache"` + `cacheLife` in `src/lib/catalogue.ts`).
- Sizes and stock on the product page are read live on every visit
  (`getProductLive`, inside `<Suspense>`).
- Ordering happens on WhatsApp. Fabrics are enquire-only.
- Staff publish, feature and archive products in the ERP's E-commerce section.

## Later (cart, payments, international delivery)

Add these as new ERP functions (e.g. `storefront_place_order`) that run as
`SECURITY DEFINER` and validate everything server-side, plus a Next.js route
handler for the payment provider's webhook. Keep rule 1: the storefront never
holds a secret database key.

## Original design

`reference/` has the original static design (`index.html`, `app.js`,
`styles.css`). `src/app/design.css` is that stylesheet; storefront additions
live in `src/app/globals.css`.
