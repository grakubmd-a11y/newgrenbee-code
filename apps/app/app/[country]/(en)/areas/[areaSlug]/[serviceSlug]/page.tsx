import type { Metadata } from "next";
import { serviceMetadata, ServicePage, serviceStaticParams } from "@/lib/areaRender";

export const revalidate = 3600;

export const generateStaticParams = serviceStaticParams;

export async function generateMetadata(
  { params }: { params: Promise<{ areaSlug: string; serviceSlug: string }> },
): Promise<Metadata> {
  const { areaSlug, serviceSlug } = await params;
  return serviceMetadata(areaSlug, serviceSlug, "en");
}

export default async function Page(
  { params }: { params: Promise<{ areaSlug: string; serviceSlug: string }> },
) {
  const { areaSlug, serviceSlug } = await params;
  return ServicePage(areaSlug, serviceSlug, "en");
}
