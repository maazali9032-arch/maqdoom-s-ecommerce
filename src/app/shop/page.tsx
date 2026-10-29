import type { Metadata } from "next";
import { CatalogueListing, SECTION_COPY } from "@/components/CatalogueListing";

export const metadata: Metadata = {
  title: "Shop All",
  description: SECTION_COPY.main.intro,
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return <CatalogueListing section="main" />;
}
