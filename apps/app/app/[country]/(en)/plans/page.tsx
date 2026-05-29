import { Metadata } from "next";
import PlansPage from "@/components/views/PlansPage";

export const metadata: Metadata = {
  title: {
    absolute: "Home Cleaning Membership Plans | Grenbee — Utah County",
  },
  description:
    "Grenbee home cleaning membership plans for Utah County. Bi-weekly or weekly professional cleaning by home size — from small condos to large estates. Transparent pricing, no contracts.",
  openGraph: {
    title: "Home Cleaning Membership Plans | Grenbee",
    description:
      "Bi-weekly or weekly house cleaning plans for Utah County homes. Transparent pricing by home size. Cancel anytime.",
    type: "website",
  },
};

export default function Page() {
  return <PlansPage />;
}
