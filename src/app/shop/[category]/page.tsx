import type { Metadata } from "next";
import { CatalogueListing, categoryParams } from "@/components/CatalogueListing";
import { getCategories } from "@/lib/catalogue";

export function generateStaticParams() {
  return categoryParams("main");
}

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const c = (await getCategories("main")).find((x) => x.slug === category);
  if (!c) return {};
  return {
    title: c.name,
    description: c.description ?? `${c.name} at MAQDOOM'S Big Mall.`,
    alternates: { canonical: `/shop/${c.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  return <CatalogueListing section="main" category={category} />;
}
