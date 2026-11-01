import Link from "next/link";
import { getCategories, getHomeFeatured, getSettings, type Category } from "@/lib/catalogue";
import { SITE_NAME, imageUrl, sectionPath, whatsappLink } from "@/lib/site";
import { HeroCycler } from "@/components/HeroCycler";
import { CategoryRing } from "@/components/CategoryRing";
import { GoldenThread } from "@/components/GoldenThread";
import { HERO_OUTFITS } from "@/lib/hero";
import { ProductGrid } from "@/components/ProductCard";

/* Design artwork for categories until the e-commerce team adds banners in the ERP. */
const DESIGN_ART: [RegExp, string][] = [
  [/kurta/, "/images/section_2_kurtas.webp"],
  [/sherwani/, "/images/section_2_sherwanis.webp"],
  [/waistcoat|jacket|coat/, "/images/section_2_waistcoats.webp"],
  [/fabric|thaan|cloth/, "/images/section_2_fabrics.webp"],
  [/accessor|stole|safa|shoe|mojri/, "/images/section_2_accessories.webp"],
];
function categoryArt(c: Category) {
  if (c.banner) return imageUrl(c.banner, "card") ?? "";
  const key = `${c.slug} ${c.name}`.toLowerCase();
  return DESIGN_ART.find(([re]) => re.test(key))?.[1] ?? "/images/section_2_fabrics.webp";
}

const isFabric = (c: Category) => /fabric|thaan/.test(`${c.slug} ${c.name}`.toLowerCase());

export default async function HomePage() {
  const [main, featured, settings] = await Promise.all([getCategories("main"), getHomeFeatured(), getSettings()]);
  const fabrics = main.find(isFabric);
  const fabricsHref = fabrics ? sectionPath("main", fabrics.slug) : "/shop";
  const tailoringHref = whatsappLink(
    settings.whatsapp_number,
    `Hello ${SITE_NAME}, I'd like to book a custom tailoring appointment.`,
  );

  return (
    <main>
      {/* 1. HERO */}
      <section className="hero-section" id="heroSection" aria-label="Hero Showcase">
        <div className="hero-background-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-bg-img" src="/images/hero_bg.webp" alt="" fetchPriority="high" />
          <div className="hero-overlay" />
        </div>
        <div className="container hero-container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-eyebrow">
                <span>TRADITION</span>
                <span className="divider-dash" />
                <span>CRAFTSMANSHIP</span>
                <span className="divider-dash" />
                <span>A TIMELESS PRESENCE</span>
              </div>
              <div className="hero-title-group">
                <h1 className="sr-only">{SITE_NAME}</h1>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/name.webp" alt="" className="hero-name-img" fetchPriority="high" />
                <span className="hero-brand-subline">BIG MALL</span>
              </div>
              <p className="hero-description">
                Premium Indian menswear, fine fabrics and bespoke tailoring — crafted for every chapter of your life.
              </p>
              <div className="hero-actions">
                <Link href="/shop" className="btn-primary" id="exploreCollectionBtn">
                  <span>Explore Collection</span>
                  <span className="btn-arrow">&rarr;</span>
                </Link>
                <Link href="/mahib" className="btn-outline" id="watchFilmBtn">
                  <span>Discover MAHIB</span>
                </Link>
              </div>
              <HeroCycler />
            </div>
            <div className="hero-model-stage" aria-live="polite">
              <div className="model-cutout-wrap">
                {HERO_OUTFITS.map((o, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={o.src}
                    className={`model-outfit${i === 0 ? " active" : ""}`}
                    src={o.src}
                    alt={o.alt}
                    fetchPriority={i === 0 ? "high" : "auto"}
                  />
                ))}
                {/* gold edge of the curtain: the same cutout, tinted gold, shown only as a thin band */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="model-outfit curtain-glow" src={HERO_OUTFITS[0].src} alt="" aria-hidden="true" />
              </div>
            </div>
            <div className="hero-editorial-col">
              <div className="editorial-pillars">
                <span>HERITAGE</span>
                <span>FABRICS</span>
                <span>MODERN FITS</span>
                <span>TIMELESS</span>
                <span>OCCASIONS</span>
              </div>
              <Link href={fabricsHref} className="editorial-floating-card" aria-label="A closer look at our fabrics">
                <div className="floating-card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/section_2_fabrics.webp" alt="Curated thaans and brocades" loading="lazy" />
                </div>
                <p className="floating-card-caption">A CLOSER LOOK AT OUR FABRICS</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES (from the ERP) */}
      {main.length ? (
        <section className="categories-section" aria-label="Product Categories">
          <div className="container">
            <div className="section-header-row">
              <div>
                <div className="section-label">CURATED WARDROBE</div>
                <h2 className="section-title-light">CATEGORIES</h2>
              </div>
            </div>
            <CategoryRing
              cards={main.map((c) => ({ href: sectionPath("main", c.slug), name: c.name, img: categoryArt(c), desc: c.description }))}
            />
          </div>
        </section>
      ) : null}

      {/* 3. THE GOLDEN THREAD: the Maqdoom story since 1895 (same family, confirmed by the owner) */}
      <GoldenThread
        knots={[
          { mark: "1895", title: "Where it began", text: "The Maqdoom family opens its doors in Hyderabad." },
          { mark: "MAHIB", title: "Couture by hand", text: "Our in-house label: hand-embroidered, minutely detailed pieces.", href: "/mahib" },
          { mark: "4 HRS", title: "Stitched to you", text: "Measured in store and tailored to your fit, the same day.", href: tailoringHref, external: true },
          {
            mark: "WORLDWIDE",
            title: "Grooms abroad",
            text: "Clients from around the world shop with us. Ask us on WhatsApp.",
            href: whatsappLink(settings.whatsapp_number, `Hello ${SITE_NAME}, I'm shopping from abroad and have a question.`),
            external: true,
          },
        ]}
      />

      {/* 4. MAHIB */}
      <section className="mahib-section" id="mahib" aria-label="MAHIB Exclusive Premium Division">
        <div className="mahib-bg-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mahib-bg-img" src="/images/section_3_bg.webp" alt="" loading="lazy" />
          <div className="mahib-gradient-overlay" />
        </div>
        <div className="container mahib-container">
          <div className="mahib-grid">
            <div className="mahib-content">
              <div className="mahib-badge">A MAQDOOM&rsquo;S EXCLUSIVE</div>
              <h2 className="mahib-title">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/mahib.webp" alt="MAHIB" loading="lazy" />
              </h2>
              <p className="mahib-desc">
                Elevated designs. Exceptional fabrics. A refined selection for those who appreciate the extraordinary.
              </p>
              <Link href="/mahib" className="btn-mahib">
                <span>Explore MAHIB</span>
                <span>&rarr;</span>
              </Link>
            </div>
            <div />
            <div className="mahib-editorial-col">
              <div className="mahib-pillars">
                <span>EXCLUSIVE</span>
                <span>DESIGNS</span>
                <span>FINEST FABRICS</span>
                <span>ELEVATED</span>
                <span>CRAFTSMANSHIP</span>
              </div>
              <Link href="/mahib" className="mahib-floating-card" aria-label="Explore MAHIB">
                <div className="mahib-card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/hero_section_person_c_1.3.webp" alt="MAHIB couture sherwani detail" loading="lazy" />
                  <div className="mahib-arrow-badge">&rarr;</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FABRICS */}
      <section className="fabrics-section" id="fabrics" aria-label="Fabric Collection">
        <div className="fabrics-bg-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="fabrics-bg-img" src="/images/section_4_bg.webp" alt="" loading="lazy" />
          <div className="fabrics-gradient-overlay" />
        </div>
        <div className="container fabrics-container">
          <div className="fabrics-grid">
            <div className="fabrics-content">
              <div className="fabrics-label">OUR FABRICS</div>
              <h2 className="fabrics-title">
                THAANS
                <br />
                THAT INSPIRE
              </h2>
              <p className="fabrics-desc">
                Explore a curated range of premium fabrics in rich textures, elegant patterns and timeless colours.
              </p>
              <Link href={fabricsHref} className="btn-fabrics">
                <span>Explore Fabrics</span>
                <span>&rarr;</span>
              </Link>
            </div>
            <div />
            <div className="fabrics-editorial-col">
              <div className="fabrics-type-list">
                <span>COTTON</span>
                <span>SILK</span>
                <span>LINEN</span>
                <span>JACQUARD</span>
                <span>BLENDS</span>
                <span>&amp; MORE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FEATURED — one home-featured product per category, chosen in the ERP */}
      <section className="featured-section" id="featured-products" aria-label="Featured Products">
        <div className="container">
          <div className="featured-header-row">
            <div className="featured-heading-wrap">
              <h2 className="featured-title">FEATURED PRODUCTS</h2>
              <span className="heading-line" />
            </div>
            <Link href="/shop" className="view-all-link">
              <span>View All</span>
              <span>&rarr;</span>
            </Link>
          </div>
          <ProductGrid products={featured} empty="New arrivals are being photographed. Visit again soon." />
        </div>
      </section>

      {/* 7. CUSTOM TAILORING */}
      <section className="tailoring-section" id="tailoring" aria-label="Custom Tailoring">
        <div className="tailoring-bg-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tailoring-bg-img" src="/images/section_6_tailoring_image.webp" alt="" loading="lazy" />
          <div className="tailoring-overlay" />
        </div>
        <div className="container tailoring-container">
          <div className="tailoring-grid">
            <div className="tailoring-content">
              <h2 className="tailoring-title">
                CUSTOM
                <br />
                TAILORING
              </h2>
              <p className="tailoring-desc">Your fabric. Your measurements. Our craftsmanship.</p>
              <a href={tailoringHref} className="btn-tailoring" target="_blank" rel="noopener noreferrer">
                <span>Book on WhatsApp</span>
                <span>&rarr;</span>
              </a>
            </div>
            <div />
            <div className="tailoring-editorial-col">
              <div className="tailoring-process-list">
                <span>SELECT FABRIC</span>
                <span>CHOOSE STYLE</span>
                <span>TAKE MEASUREMENTS</span>
                <span>PERFECT FIT</span>
              </div>
              <a href={tailoringHref} className="tailoring-floating-card" target="_blank" rel="noopener noreferrer" aria-label="Book custom tailoring">
                <div className="mahib-card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/hero_section_person_b_1.2.webp" alt="Bespoke suit example" loading="lazy" />
                  <div className="mahib-arrow-badge">&rarr;</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
