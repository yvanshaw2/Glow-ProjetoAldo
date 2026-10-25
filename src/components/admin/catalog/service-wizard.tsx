"use client";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { ServiceLinksField } from "@/components/admin/catalog/service-links-step";
import {
  AdditionalServiceStep,
  ServiceInfoStep,
} from "@/components/admin/catalog/service-data-step";
import {
  getInitialValues,
  getServiceSteps,
  toRequestBody,
  type ServiceFormValues,
} from "@/components/admin/catalog/service-form-values";
import {
  serviceResolver,
  toFormField,
} from "@/components/admin/catalog/service-form-resolver";
import { ServicePricesStep } from "@/components/admin/catalog/service-prices-step";
import { FormAlert } from "@/components/shared/form-alert";
import { StepForm } from "@/components/shared/step-form";
import { useFormFailure } from "@/hooks/use-form-failure";
import { ApiError, apiRequest } from "@/lib/api-client";
import type { AdminService } from "@/shared/api/catalog";
import type { ServiceType } from "@/shared/constants/service-types";

// UC13 and UC14 steps 4 to 7 (docs/catalogo/servicos-do-painel.md): the
// service in the steps of its type, or edited with its type fixed. One form
// for all the steps (RNF002), checked by the schema of the route: "Próximo"
// checks the fields of the step, and the send everything. An error of the API
// goes to the top of the window, and the one with `fields`, next to them.

const SERVICES_PATH = "/api/admin/services";

type ServiceWizardProps = {
  type: ServiceType;
  // The service being edited; without it, a new one.
  service?: AdminService;
  onCancel: () => void;
  // The service was created or saved.
  onDone: () => void;
  // RNF011: the service was changed by someone else; read it again.
  onConflict: () => void;
  onGoToCategories: () => void;
  onSubmittingChange: (isSubmitting: boolean) => void;
};

export function ServiceWizard({
  type,
  service,
  onCancel,
  onDone,
  onConflict,
  onGoToCategories,
  onSubmittingChange,
}: ServiceWizardProps) {
  // The choice of a step checks it again, so its message leaves as soon as it
  // is made (RNF003).
  const form = useForm<ServiceFormValues>({
    resolver: serviceResolver(type),
    defaultValues: getInitialValues(type, service),
    mode: "onChange",
  });
  const { failure, showFailure, clearFailure } = useFormFailure(
    form.setError,
    toFormField,
  );
  const steps = getServiceSteps(type);
  const { getValues, reset } = form;

  // RNF011: the service read again after a conflict replaces what was typed;
  // the notice of the conflict stays.
  useEffect(() => {
    reset(getInitialValues(type, service));
  }, [type, service, reset]);

  // The preview of the image is a local address, released with the form.
  useEffect(
    () => () => {
      const image = getValues("image");
      if (image) URL.revokeObjectURL(image.previewUrl);
    },
    [getValues],
  );

  async function submit(values: ServiceFormValues) {
    clearFailure();
    // An error of the API stays on a field the person already corrected.
    form.clearErrors();
    onSubmittingChange(true);
    try {
      const body = toRequestBody(type, values);
      await apiRequest(
        service ? `${SERVICES_PATH}/${service.id}` : SERVICES_PATH,
        {
          method: service ? "PATCH" : "POST",
          body: service ? { ...body, updatedAt: service.updatedAt } : body,
        },
      );
      onDone();
    } catch (error) {
      showFailure(error);
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
        onConflict();
      }
    } finally {
      onSubmittingChange(false);
    }
  }

  return (
    <FormProvider {...form}>
      {failure && (
        <FormAlert key={failure.key}>{failure.error.message}</FormAlert>
      )}
      <StepForm
        form={form}
        steps={steps}
        onSubmit={submit}
        submitLabel="Salvar serviço"
        loadingLabel="Salvando…"
        onCancel={onCancel}
      >
        {(stepIndex) => {
          if (type === "additional") return <AdditionalServiceStep />;
          if (stepIndex === 0) {
            return <ServiceInfoStep onGoToCategories={onGoToCategories} />;
          }
          if (stepIndex === 1) return <ServicePricesStep />;
          return (
            <ServiceLinksField
              linkedType="additional"
              legend="Serviços adicionais que podem ser contratados junto (opcional)"
              emptyText="Nenhum serviço adicional cadastrado."
            />
          );
        }}
      </StepForm>
    </FormProvider>
  );
}
