"use client";

import { useState } from "react";

/** Main photo plus thumbnails. URLs are built on the server. */
export function ProductGallery({ images, title }: { images: { large: string; card: string }[]; title: string }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return <div className="sf-gallery-main sf-gallery-empty" aria-hidden="true" />;
  const current = images[Math.min(index, images.length - 1)];
  return (
    <div className="sf-gallery">
      <div className="sf-gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.large} alt={`${title} — photo ${index + 1}`} width={1600} height={2000} fetchPriority="high" />
      </div>
      {images.length > 1 ? (
        <div className="sf-gallery-thumbs" role="tablist" aria-label="Product photos">
          {images.map((img, i) => (
            <button
              key={img.large}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              className={`sf-thumb${i === index ? " active" : ""}`}
              onClick={() => setIndex(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.card} alt="" width={120} height={150} loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
