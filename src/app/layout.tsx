import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./design.css";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-cinzel" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-jakarta" });

const DESCRIPTION =
  "Premium Indian menswear, fine fabrics and bespoke tailoring from MAQDOOM'S Big Mall. Sherwanis, kurtas, waistcoats and the MAHIB exclusive edit.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Premium Indian Menswear`, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cinzel.variable} ${cormorant.variable} ${jakarta.variable}`}>
      <body>
        <a href="#content" className="sr-only">
          Skip to content
        </a>
        <SiteHeader />
        <div id="content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
