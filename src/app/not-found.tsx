import Link from "next/link";

export default function NotFound() {
  return (
    <main className="sf-listing">
      <section className="sf-page-head sf-not-found">
        <div className="container">
          <div className="section-label">PAGE NOT FOUND</div>
          <h1 className="sf-page-title">THIS PIECE HAS MOVED ON</h1>
          <p className="sf-page-intro">It may have sold, or the link has changed. Browse what&rsquo;s in the showroom today.</p>
          <div className="hero-actions">
            <Link href="/shop" className="btn-primary">
              <span>Shop All</span>
              <span className="btn-arrow">&rarr;</span>
            </Link>
            <Link href="/" className="btn-outline sf-order-btn-dark">
              <span>Home</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
