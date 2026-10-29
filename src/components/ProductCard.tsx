import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalogue";
import { imageUrl, priceText } from "@/lib/site";

/** Product grid card, using the original design's classes. */
export function ProductCard({ product }: { product: Card }) {
  const src = imageUrl(product.thumbnail, "card");
  return (
    <article className="product-card">
      <Link href={`/product/${product.slug}`} className="product-card-link" aria-label={product.title}>
        <div className="product-media-box">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="product-img" src={src} alt={product.title} loading="lazy" width={600} height={750} />
          ) : null}
          <span className="product-category-tag">{product.category.name}</span>
          {product.sold_out ? <span className="product-soldout-tag">Sold out</span> : null}
        </div>
        <div className="product-details">
          <h3 className="product-title">{product.title}</h3>
          <div className="product-price-row">
            <span className="product-price">{priceText(product)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products, empty }: { products: Card[]; empty: string }) {
  if (!products.length) return <p className="sf-empty">{empty}</p>;
  return (
    <div className="products-grid">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
