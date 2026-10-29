import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProduct, getProductLive, getProducts, getSettings, type Product } from "@/lib/catalogue";
import { SITE_NAME, SITE_URL, imageUrl, priceText, sectionPath } from "@/lib/site";
import { ProductGallery } from "@/components/ProductGallery";
import { OrderPanel } from "@/components/OrderPanel";

/** At least one param is required at build time; "_" renders a 404 when nothing is published yet. */
export async function generateStaticParams() {
  const all = [...(await getProducts("main")), ...(await getProducts("mahib"))];
  return all.length ? all.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const image = imageUrl(p.thumbnail ?? p.images[0], "large");
  const description = p.seo_description || p.description?.slice(0, 160) || `${p.title} at ${SITE_NAME}.`;
  return {
    title: p.seo_title || p.title,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.seo_title || p.title, description, images: image ? [{ url: image, width: 1600, height: 2000 }] : [] },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getSettings()]);
  if (!product) notFound();

  const url = `${SITE_URL}/product/${product.slug}`;
  // Thumbnail (the starred photo) first, then the rest in staff order.
  const paths = product.thumbnail ? [product.thumbnail, ...product.images.filter((i) => i !== product.thumbnail)] : product.images;
  const images = paths.map((p) => ({ large: imageUrl(p, "large")!, card: imageUrl(p, "card")! }));
  const section = product.category.section;
  const panel = (p: Product, checking = false) => (
    <OrderPanel
      title={p.title}
      url={url}
      kind={p.kind}
      priceText={priceText(p)}
      sizes={p.sizes}
      soldOut={p.sold_out}
      whatsappNumber={settings.whatsapp_number}
      checking={checking}
    />
  );

  return (
    <main className={`sf-product${section === "mahib" ? " sf-listing-mahib" : ""}`}>
      <div className="container">
        <nav className="sf-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={sectionPath(section)}>{section === "mahib" ? "MAHIB" : "Shop"}</Link>
          <span aria-hidden="true">/</span>
          <Link href={sectionPath(section, product.category.slug)}>{product.category.name}</Link>
        </nav>
        <div className="sf-product-grid">
          <ProductGallery images={images} title={product.title} />
          <div className="sf-product-info">
            <div className="section-label">{product.category.name.toUpperCase()}</div>
            <h1 className="sf-product-title">{product.title}</h1>
            <Suspense fallback={panel(product, true)}>
              <LivePanel slug={product.slug} render={panel} />
            </Suspense>
            {product.description ? (
              <div className="sf-product-desc">
                {product.description.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : null}
            {product.tags.length ? (
              <ul className="sf-tags" aria-label="Tags">
                {product.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        // JSON-LD for search engines; "<" is escaped so text can't close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(product, url, images[0]?.large)).replace(/</g, "\\u003c") }}
      />
    </main>
  );
}

/** Reads sizes and pieces left at request time, so stock is never stale. */
async function LivePanel({ slug, render }: { slug: string; render: (p: Product) => React.ReactNode }) {
  const live = await getProductLive(slug);
  if (!live) return <p className="sf-order-note">This piece is no longer available.</p>;
  return render(live);
}

function jsonLd(p: Product, url: string, image?: string) {
  const prices = p.sizes.map((s) => s.price_paise).filter((x): x is number => x != null);
  const availability = p.sold_out ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
  const offers =
    p.kind === "fabric"
      ? undefined
      : prices.length > 1 && Math.min(...prices) !== Math.max(...prices)
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: Math.min(...prices) / 100,
            highPrice: Math.max(...prices) / 100,
            offerCount: prices.length,
            availability,
          }
        : p.price_min_paise != null
          ? { "@type": "Offer", priceCurrency: "INR", price: p.price_min_paise / 100, availability, url }
          : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.seo_description || p.description || undefined,
    image: image ? [image] : undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: p.category.name,
    url,
    offers,
  };
}
