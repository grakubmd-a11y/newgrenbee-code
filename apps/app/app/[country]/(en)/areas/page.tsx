import type { Metadata } from "next";
import AreasView from "@/components/areas/AreasView";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Coverage Areas | Grenbee",
  description:
    "Check if Grenbee serves your city. We cover Utah County, Salt Lake County & the Wasatch Back — Mapleton, Spanish Fork, Springville, Salem, Draper, South Jordan, Riverton, Heber, Midway, Park City. Join the waitlist to expand near you.",
  alternates: { canonical: "/us/areas" },
};

export default function Page() {
  return <AreasView lang="en" />;
}
