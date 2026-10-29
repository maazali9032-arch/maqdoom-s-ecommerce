import type { Metadata } from "next";
import { CatalogueListing, SECTION_COPY } from "@/components/CatalogueListing";

export const metadata: Metadata = {
  title: "MAHIB — The Exclusive Edit",
  description: SECTION_COPY.mahib.intro,
  alternates: { canonical: "/mahib" },
};

export default function MahibPage() {
  return <CatalogueListing section="mahib" />;
}
