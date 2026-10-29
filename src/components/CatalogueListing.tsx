import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getProducts, type Section } from "@/lib/catalogue";
import { sectionPath } from "@/lib/site";
import { ProductGrid } from "./ProductCard";

export const SECTION_COPY: Record<Section, { label: string; title: string; intro: string }> = {
  main: {
    label: "THE COLLECTION",
    title: "SHOP ALL",
    intro: "Sherwanis, kurtas, waistcoats, fabrics and more — every piece here is in our showroom today.",
  },
  mahib: {
    label: "A MAQDOOM’S EXCLUSIVE",
    title: "MAHIB",
    intro: "Elevated designs and exceptional fabrics, chosen for those who appreciate the extraordinary.",
  },
};

/** Section page (/shop, /mahib) or one category inside it. */
export async function CatalogueListing({ section, category }: { section: Section; category?: string }) {
  const [categories, products] = await Promise.all([getCategories(section), getProducts(section, category)]);
  const current = category ? categories.find((c) => c.slug === category) : undefined;
  if (category && !current) notFound();
  const copy = SECTION_COPY[section];
  const crumb = section === "main" ? "Shop" : "MAHIB";

  // Within a category, the staff-chosen featured pieces come first (by rank).
  const sorted = current
    ? [...products].sort(
        (a, b) =>
          Number(b.featured_in_category) - Number(a.featured_in_category) ||
          (a.featured_rank ?? 99) - (b.featured_rank ?? 99),
      )
    : products;

  return (
    <main className={`sf-listing${section === "mahib" ? " sf-listing-mahib" : ""}`}>
      <section className="sf-page-head">
        <div className="container">
          <nav className="sf-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            {current ? <Link href={sectionPath(section)}>{crumb}</Link> : <span>{crumb}</span>}
            {current ? (
              <>
                <span aria-hidden="true">/</span>
                <span>{current.name}</span>
              </>
            ) : null}
          </nav>
          <div className="section-label">{copy.label}</div>
          <h1 className="sf-page-title">{current ? current.name.toUpperCase() : copy.title}</h1>
          <p className="sf-page-intro">{current?.description || copy.intro}</p>
          {categories.length ? (
            <nav className="sf-chips" aria-label="Categories">
              <Link href={sectionPath(section)} className={`sf-chip${current ? "" : " active"}`}>
                All
              </Link>
              {categories.map((c) => (
                <Link key={c.slug} href={sectionPath(section, c.slug)} className={`sf-chip${c.slug === category ? " active" : ""}`}>
                  {c.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </section>
      <section className="featured-section sf-listing-grid">
        <div className="container">
          <ProductGrid products={sorted} empty="Nothing here yet — new pieces are added every week." />
        </div>
      </section>
    </main>
  );
}

/** At least one param is required at build time; "_" renders a 404 when there are no categories yet. */
export async function categoryParams(section: Section) {
  const cats = await getCategories(section);
  return cats.length ? cats.map((c) => ({ category: c.slug })) : [{ category: "_" }];
}
