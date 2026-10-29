import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalogue";
import { SITE_URL, sectionPath } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cats, main, mahib] = await Promise.all([getCategories(), getProducts("main"), getProducts("mahib")]);
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/mahib`, changeFrequency: "daily", priority: 0.9 },
    ...cats.map((c) => ({ url: `${SITE_URL}${sectionPath(c.section, c.slug)}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...[...main, ...mahib].map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
