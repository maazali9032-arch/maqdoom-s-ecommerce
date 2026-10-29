import type { Metadata } from "next";
import { CatalogueListing, categoryParams } from "@/components/CatalogueListing";
import { getCategories } from "@/lib/catalogue";

export function generateStaticParams() {
  return categoryParams("mahib");
}

export async function generateMetadata({ params }: PageProps<"/mahib/[category]">): Promise<Metadata> {
  const { category } = await params;
  const c = (await getCategories("mahib")).find((x) => x.slug === category);
  if (!c) return {};
  return {
    title: c.name,
    description: c.description ?? `${c.name} at MAQDOOM'S Big Mall.`,
    alternates: { canonical: `/mahib/${c.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/mahib/[category]">) {
  const { category } = await params;
  return <CatalogueListing section="mahib" category={category} />;
}
