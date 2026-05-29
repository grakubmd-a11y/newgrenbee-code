import type { Metadata } from "next";
import AreasView from "@/components/areas/AreasView";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Áreas de Cobertura | Grenbee",
  description:
    "Verifica si Grenbee atiende tu ciudad. Cubrimos Utah County y el Wasatch Back — Mapleton, Spanish Fork, Heber, Midway, Park City. Únete a la lista de espera.",
  alternates: { canonical: "/us/es/areas" },
};

export default function Page() {
  return <AreasView lang="es" />;
}
