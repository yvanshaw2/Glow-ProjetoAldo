import type { Metadata } from "next";
import { ServiceCatalog } from "@/components/portal/catalog/service-catalog";

export const metadata: Metadata = { title: "Serviços – Glow" };

// UC01, steps 3 and 4: the catalog of active services (RN008, RN031).
export default function ServicesPage() {
  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-6 py-14 lg:px-8">
      <div className="flex flex-col gap-5">
        <h1 className="text-h3 font-bold md:text-h2">Serviços</h1>
        <p className="text-muted-foreground">
          Conheça os serviços disponíveis e filtre por categoria.
        </p>
      </div>
      <ServiceCatalog />
    </div>
  );
}
