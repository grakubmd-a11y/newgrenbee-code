import type { Metadata } from "next";
import { areaMetadata, AreaPage, areaStaticParams } from "@/lib/areaRender";

export const revalidate = 3600;

export const generateStaticParams = areaStaticParams;

export async function generateMetadata(
  { params }: { params: Promise<{ areaSlug: string }> },
): Promise<Metadata> {
  const { areaSlug } = await params;
  return areaMetadata(areaSlug, "en");
}

export default async function Page({ params }: { params: Promise<{ areaSlug: string }> }) {
  const { areaSlug } = await params;
  return AreaPage(areaSlug, "en");
}
