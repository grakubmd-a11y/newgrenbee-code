import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import HostsLandingView from "@/components/hosts/HostsLandingView";
import { HOSTS_COPY } from "@/lib/hostsCopy";
import { getBusinessPhone } from "@/lib/areaContent.server";

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ country: "us" }];
}

export const metadata: Metadata = {
  title: { absolute: HOSTS_COPY.en.seoTitle },
  description: HOSTS_COPY.en.seoDescription,
  alternates: { canonical: "/us/hosts" },
  openGraph: {
    title: HOSTS_COPY.en.seoTitle,
    description: HOSTS_COPY.en.seoDescription,
    url: "/us/hosts",
  },
};

export default async function Page() {
  const phone = await getBusinessPhone();
  return (
    <PageShell>
      <HostsLandingView copy={HOSTS_COPY.en} lang="en" phone={phone} />
    </PageShell>
  );
}
