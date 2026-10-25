"use client";

import { useEffect, type ReactElement } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { RoleDataStep } from "@/components/admin/roles/role-data-step";
import {
  getInitialValues,
  ROLE_STEPS,
  toRequestBody,
  type RoleFormValues,
} from "@/components/admin/roles/role-form-values";
import { RolePermissionsStep } from "@/components/admin/roles/role-permissions-step";
import { FormAlert } from "@/components/shared/form-alert";
import { FormDialog } from "@/components/shared/form-dialog";
import { StepForm } from "@/components/shared/step-form";
import { useFormFailure } from "@/hooks/use-form-failure";
import { ApiError, apiRequest } from "@/lib/api-client";
import type { AdminRole } from "@/shared/api/staff";

// UC21 steps 3 to 8 and FA01 (docs/equipe/equipe-do-painel.md): the window of
// a new or edited role, in two steps (RF082, RF083). One form for both steps
// (RNF002). With the demo data the form has no validation schema yet
// (decision 0055): "Próximo" only checks that the step was filled, and the
// send shows the NOT_IMPLEMENTED of the demo.

const ROLES_PATH = "/api/admin/roles";

type RoleFormDialogProps = {
  // The button that opens the window, as the `render` of the trigger.
  trigger: ReactElement;
  // The role being edited; none for a new one.
  role?: AdminRole;
  // The role was created or saved.
  onSaved: () => void;
  // RNF011: the role was changed by someone else; read the list again.
  onConflict?: () => void;
};

export function RoleFormDialog({
  trigger,
  role,
  onSaved,
  onConflict,
}: RoleFormDialogProps) {
  return (
    <FormDialog trigger={trigger} title={role ? "Editar cargo" : "Novo cargo"}>
      {({ close, setSubmitting }) => (
        <RoleWizard
          role={role}
          onCancel={close}
          onDone={() => {
            close();
            onSaved();
          }}
          onConflict={onConflict}
          onSubmittingChange={setSubmitting}
        />
      )}
    </FormDialog>
  );
}

type RoleWizardProps = Pick<RoleFormDialogProps, "role" | "onConflict"> & {
  onCancel: () => void;
  onDone: () => void;
  onSubmittingChange: (isSubmitting: boolean) => void;
};

function RoleWizard({
  role,
  onCancel,
  onDone,
  onConflict,
  onSubmittingChange,
}: RoleWizardProps) {
  const isEditing = role !== undefined;
  const form = useForm<RoleFormValues>({
    defaultValues: getInitialValues(role),
  });
  const { failure, showFailure, clearFailure } = useFormFailure(form.setError);
  const { reset } = form;

  // RNF011: after a version conflict the list is read again, and the current
  // data of the role replaces what was typed.
  useEffect(() => {
    reset(getInitialValues(role));
  }, [role, reset]);

  async function submit(values: RoleFormValues) {
    clearFailure();
    onSubmittingChange(true);
    try {
      const body = toRequestBody(values);
      await apiRequest(isEditing ? `${ROLES_PATH}/${role.id}` : ROLES_PATH, {
        method: isEditing ? "PATCH" : "POST",
        body: isEditing ? { ...body, updatedAt: role.updatedAt } : body,
      });
      onDone();
    } catch (error) {
      showFailure(error);
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
        onConflict?.();
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
        steps={ROLE_STEPS}
        onSubmit={submit}
        submitLabel={isEditing ? "Salvar alterações" : "Cadastrar cargo"}
        loadingLabel={isEditing ? "Salvando…" : "Cadastrando…"}
        onCancel={onCancel}
      >
        {(stepIndex) =>
          stepIndex === 0 ? (
            <RoleDataStep />
          ) : (
            <RolePermissionsStep isEditing={isEditing} />
          )
        }
      </StepForm>
    </FormProvider>
  );
}
