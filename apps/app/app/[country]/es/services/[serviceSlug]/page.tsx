import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES_DATA } from "@grenbee/config";
import { SERVICES_I18N_ES } from "@grenbee/config/servicesI18n";
import ServiceLandingView from "@/components/views/ServiceLandingView";

// ── Static generation ─────────────────────────────────────────────────────────
export function generateStaticParams() {
  return SERVICES_DATA.map((s) => ({ serviceSlug: s.id }));
}

// ── Metadata (Spanish) ────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ serviceSlug: string }>;
}): Promise<Metadata> {
  const { serviceSlug } = await params;
  const service = SERVICES_DATA.find((s) => s.id === serviceSlug);
  if (!service) return {};

  const esOverlay = SERVICES_I18N_ES[serviceSlug as keyof typeof SERVICES_I18N_ES];
  const name        = esOverlay?.name        ?? service.name;
  const description = esOverlay?.description ?? service.description;

  return {
    title: { absolute: `${name} | Grenbee Servicios del Hogar` },
    description,
    openGraph: {
      title:       `${name} | Grenbee`,
      description,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function ServicePageES({
  params,
}: {
  params: Promise<{ serviceSlug: string }>;
}) {
  const { serviceSlug } = await params;
  const service = SERVICES_DATA.find((s) => s.id === serviceSlug);
  if (!service) notFound();

  return <ServiceLandingView serviceId={serviceSlug} />;
}
