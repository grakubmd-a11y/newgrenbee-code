import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES_DATA } from "@grenbee/config";
import ServiceLandingView from "@/components/views/ServiceLandingView";

// ── Static generation — one page per service ──────────────────────────────────
export function generateStaticParams() {
  return SERVICES_DATA.map((s) => ({ serviceSlug: s.id }));
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ serviceSlug: string }>;
}): Promise<Metadata> {
  const { serviceSlug } = await params;
  const service = SERVICES_DATA.find((s) => s.id === serviceSlug);
  if (!service) return {};

  return {
    title: { absolute: `${service.name} | Grenbee Home Services` },
    description: service.description,
    openGraph: {
      title:       `${service.name} | Grenbee`,
      description: service.description,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function ServicePage({
  params,
}: {
  params: Promise<{ serviceSlug: string }>;
}) {
  const { serviceSlug } = await params;
  const service = SERVICES_DATA.find((s) => s.id === serviceSlug);
  if (!service) notFound();

  return <ServiceLandingView serviceId={serviceSlug} />;
}
