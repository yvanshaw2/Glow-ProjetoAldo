import type { FormStep } from "@/components/shared/step-form";
import type { AdminService } from "@/shared/api/catalog";
import type { PricingMode } from "@/shared/constants/pricing-modes";
import type { ServiceType } from "@/shared/constants/service-types";
import type { VehicleSize } from "@/shared/constants/vehicle-sizes";

// The image of the form (UC13, UC14): the file chosen, with the local address
// of its preview and sent when the form is confirmed, or the one the service
// already has, with its public address. Without a value, there is no image.
export type ServiceImageValue =
  | { kind: "new"; file: File; previewUrl: string }
  | { kind: "saved"; url: string };

// The values of the form of a service (docs/catalogo/servicos-do-painel.md).
// The type is not a field: it is chosen before the form and cannot change
// (docs/catalogo/dados.md).
export type ServiceFormValues = {
  categoryId: string | null;
  pricingMode: PricingMode;
  durationMinutes: number | null;
  name: string;
  description: string;
  image: ServiceImageValue | null;
  fixedPrice: number | null;
  prices: Record<VehicleSize, number | null>;
  // RN042: the cost of the supplies, optional, in the form of the price.
  fixedCost: number | null;
  costs: Record<VehicleSize, number | null>;
  // The additionals of a main service, or the main services of an additional.
  linkedIds: string[];
};

const EMPTY_VALUES: ServiceFormValues = {
  categoryId: null,
  pricingMode: "by_size",
  durationMinutes: null,
  name: "",
  description: "",
  image: null,
  fixedPrice: null,
  prices: { small: null, medium: null, large: null, extra_large: null },
  fixedCost: null,
  costs: { small: null, medium: null, large: null, extra_large: null },
  linkedIds: [],
};

// A new service: the additional is always fixed (RN009).
export function getInitialValues(
  type: ServiceType,
  service?: AdminService,
): ServiceFormValues {
  if (!service) {
    return {
      ...EMPTY_VALUES,
      pricingMode: type === "additional" ? "fixed" : EMPTY_VALUES.pricingMode,
    };
  }
  return {
    categoryId: service.category?.id ?? null,
    pricingMode: service.pricingMode ?? "fixed",
    durationMinutes: service.avgDurationMinutes,
    name: service.name,
    description: service.description ?? "",
    image: service.imageUrl ? { kind: "saved", url: service.imageUrl } : null,
    fixedPrice: service.fixedPrice,
    prices: service.prices ?? EMPTY_VALUES.prices,
    fixedCost: service.fixedCost,
    costs: service.costs ?? EMPTY_VALUES.costs,
    linkedIds:
      service.type === "additional"
        ? service.mainServiceIds
        : service.additionalIds,
  };
}

// RF060 to RF063: the steps of each type. The additional has one only (FA01),
// and the complementary has no step of additionals (FA02).
export function getServiceSteps(
  type: ServiceType,
): FormStep<ServiceFormValues>[] {
  if (type === "additional") {
    return [
      {
        title: "Dados do serviço",
        fields: [
          "name",
          "durationMinutes",
          "fixedPrice",
          "fixedCost",
          "linkedIds",
        ],
      },
    ];
  }
  const steps: FormStep<ServiceFormValues>[] = [
    {
      title: "Informações",
      fields: [
        "categoryId",
        "pricingMode",
        "durationMinutes",
        "name",
        "description",
        "image",
      ],
    },
    {
      title: "Valores",
      fields: [
        "fixedPrice",
        "prices.small",
        "prices.medium",
        "prices.large",
        "prices.extra_large",
        "fixedCost",
        "costs.small",
        "costs.medium",
        "costs.large",
        "costs.extra_large",
      ],
    },
  ];
  if (type === "main") {
    steps.push({ title: "Adicionais", fields: ["linkedIds"] });
  }
  return steps;
}

// The body of POST and PATCH /api/admin/services (docs/catalogo/rotas.md),
// without the image: it goes by its own route and joins the body as imagePath
// (see findImagePath).
export function toRequestBody(type: ServiceType, values: ServiceFormValues) {
  const common = {
    name: values.name.trim(),
    avgDurationMinutes: values.durationMinutes,
  };
  if (type === "additional") {
    return {
      type,
      ...common,
      fixedPrice: values.fixedPrice,
      fixedCost: values.fixedCost,
      mainServiceIds: values.linkedIds,
    };
  }
  return {
    type,
    ...common,
    categoryId: values.categoryId,
    description: values.description.trim(),
    pricingMode: values.pricingMode,
    ...(values.pricingMode === "fixed"
      ? { fixedPrice: values.fixedPrice, fixedCost: values.fixedCost }
      : { prices: values.prices, costs: values.costs }),
    ...(type === "main" && { additionalIds: values.linkedIds }),
  };
}

// UC14: what the body says about the image. A new file has to be sent first,
// so the path comes from the upload; the one the service has is kept (no
// field), and one taken off leaves as null. An additional service has none.
export function findImagePath(
  type: ServiceType,
  values: ServiceFormValues,
  service: AdminService | undefined,
  uploadedPath: string | null,
): { imagePath?: string | null } {
  if (type === "additional") return {};
  if (values.image?.kind === "new" && uploadedPath !== null) {
    return { imagePath: uploadedPath };
  }
  if (values.image === null && service?.imageUrl) return { imagePath: null };
  return {};
}
