"use client";

import { useState } from "react";
import type { SizeOption } from "@/lib/catalogue";
import { formatINR, whatsappLink } from "@/lib/site";

type Props = {
  title: string;
  url: string;
  kind: "garment" | "fabric" | "empty";
  priceText: string;
  sizes: SizeOption[];
  soldOut: boolean;
  whatsappNumber: string;
  checking?: boolean;
};

/** Size picker and the WhatsApp order / enquiry button. */
export function OrderPanel({ title, url, kind, priceText, sizes, soldOut, whatsappNumber, checking }: Props) {
  const available = sizes.filter((s) => s.left > 0);
  const named = sizes.filter((s) => s.size);
  const [picked, setPicked] = useState<string | null>(available.length === 1 ? available[0].size : null);
  const choice = sizes.find((s) => s.size === picked);
  const price = choice?.price_paise != null ? formatINR(choice.price_paise) : priceText;

  if (kind === "fabric") {
    const href = whatsappLink(whatsappNumber, `Hello, I'd like to know more about this fabric: ${title}\n${url}`);
    return (
      <div className="sf-order">
        <p className="sf-order-price">{priceText}</p>
        <p className="sf-order-note">Fabric is cut to your length in the showroom. Ask us for shades, width and pricing.</p>
        <a className="btn-primary sf-order-btn" href={href} target="_blank" rel="noopener noreferrer">
          <span>Enquire on WhatsApp</span>
          <span className="btn-arrow">&rarr;</span>
        </a>
      </div>
    );
  }

  const needsSize = named.length > 0 && !picked;
  const lines = [`Hello, I'd like to order: ${title}`];
  if (picked) lines.push(`Size: ${picked}`);
  if (price) lines.push(`Price: ${price}`);
  lines.push(url);
  const orderHref = whatsappLink(whatsappNumber, lines.join("\n"));
  const askHref = whatsappLink(whatsappNumber, `Hello, is this available again? ${title}\n${url}`);

  return (
    <div className="sf-order">
      <p className="sf-order-price">{price}</p>
      {named.length ? (
        <fieldset className="sf-sizes" disabled={checking}>
          <legend>Size</legend>
          <div className="sf-size-row">
            {named.map((s) => (
              <button
                key={s.size}
                type="button"
                className={`sf-size${picked === s.size ? " active" : ""}`}
                disabled={s.left <= 0}
                aria-pressed={picked === s.size}
                onClick={() => setPicked(s.size)}
              >
                {s.size}
              </button>
            ))}
          </div>
          {choice && choice.left > 0 && choice.left <= 2 ? <p className="sf-left">Only {choice.left} left</p> : null}
        </fieldset>
      ) : null}
      {checking ? <p className="sf-order-note">Checking showroom stock…</p> : null}
      {soldOut ? (
        <>
          <p className="sf-order-note">Sold out for now. Message us and we&rsquo;ll tell you when it&rsquo;s back.</p>
          <a className="btn-outline sf-order-btn sf-order-btn-dark" href={askHref} target="_blank" rel="noopener noreferrer">
            <span>Ask on WhatsApp</span>
          </a>
        </>
      ) : needsSize ? (
        <button type="button" className="btn-primary sf-order-btn" disabled>
          <span>Choose a size</span>
        </button>
      ) : (
        <a className="btn-primary sf-order-btn" href={orderHref} target="_blank" rel="noopener noreferrer">
          <span>Order on WhatsApp</span>
          <span className="btn-arrow">&rarr;</span>
        </a>
      )}
      <p className="sf-order-note">We confirm availability, fit and delivery with you on WhatsApp before you pay.</p>
    </div>
  );
}
