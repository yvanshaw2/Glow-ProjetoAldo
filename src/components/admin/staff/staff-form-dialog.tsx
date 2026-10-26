"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { StaffDataStep } from "@/components/admin/staff/staff-data-step";
import {
  getInitialValues,
  getStaffSteps,
  type StaffFormValues,
} from "@/components/admin/staff/staff-form-values";
import { StaffRoleStep } from "@/components/admin/staff/staff-role-step";
import { FormAlert } from "@/components/shared/form-alert";
import { FormDialog } from "@/components/shared/form-dialog";
import { StepForm } from "@/components/shared/step-form";
import { useFormFailure } from "@/hooks/use-form-failure";
import { ApiError, apiRequest } from "@/lib/api-client";
import type { AdminStaffMember } from "@/shared/api/staff";
import {
  staffEditSchema,
  staffInputSchema,
  type StaffInput,
} from "@/shared/validation/staff";

// UC19 and UC20 steps 3 to 6 (docs/equipe/equipe-do-painel.md): the window of
// a new or edited staff member, in two steps (RF079, RF080). One form for
// both steps (RNF002), checked by the schemas of the routes (RN023, RN035):
// "Próximo" checks the fields of the step, and the last button sends
// everything.

const STAFF_PATH = "/api/admin/staff";

// What the schema hands over: the edit has no e-mail nor password.
type StaffSubmitted = Omit<StaffInput, "email" | "password"> &
  Partial<Pick<StaffInput, "email" | "password">>;

type StaffFormDialogProps = {
  // The button that opens the window, as the `render` of the trigger.
  trigger: ReactElement;
  // The member being edited; none for a new one.
  member?: AdminStaffMember;
  // The member was created or saved.
  onSaved: () => void;
  // RNF011: the member was changed by someone else; read the list again.
  onConflict?: () => void;
  // The way to the roles when there is no active one.
  onGoToRoles?: () => void;
};

export function StaffFormDialog({
  trigger,
  member,
  onSaved,
  onConflict,
  onGoToRoles,
}: StaffFormDialogProps) {
  return (
    <FormDialog
      trigger={trigger}
      title={member ? "Editar funcionário" : "Novo funcionário"}
    >
      {({ close, setSubmitting }) => (
        <StaffWizard
          member={member}
          onCancel={close}
          onDone={() => {
            close();
            onSaved();
          }}
          onConflict={onConflict}
          onGoToRoles={
            onGoToRoles &&
            (() => {
              close();
              onGoToRoles();
            })
          }
          onSubmittingChange={setSubmitting}
        />
      )}
    </FormDialog>
  );
}

type StaffWizardProps = Pick<
  StaffFormDialogProps,
  "member" | "onConflict" | "onGoToRoles"
> & {
  onCancel: () => void;
  onDone: () => void;
  onSubmittingChange: (isSubmitting: boolean) => void;
};

function StaffWizard({
  member,
  onCancel,
  onDone,
  onConflict,
  onGoToRoles,
  onSubmittingChange,
}: StaffWizardProps) {
  const isEditing = member !== undefined;
  const form = useForm<StaffFormValues, unknown, StaffSubmitted>({
    // The edit has no e-mail nor password to check; the schemas also take a
    // missing or null role, from a request, and the form holds null.
    resolver: (isEditing
      ? zodResolver(staffEditSchema)
      : zodResolver(staffInputSchema)) as unknown as Resolver<
      StaffFormValues,
      unknown,
      StaffSubmitted
    >,
    defaultValues: getInitialValues(member),
  });
  const { failure, showFailure, clearFailure } = useFormFailure(form.setError);
  const { reset } = form;

  // RNF011: after a version conflict the list is read again, and the current
  // data of the member replaces what was typed.
  useEffect(() => {
    reset(getInitialValues(member));
  }, [member, reset]);

  async function submit(values: StaffSubmitted) {
    // The route can refuse a field the person has already corrected.
    form.clearErrors();
    clearFailure();
    onSubmittingChange(true);
    try {
      await apiRequest(isEditing ? `${STAFF_PATH}/${member.id}` : STAFF_PATH, {
        method: isEditing ? "PATCH" : "POST",
        body: isEditing
          ? {
              firstName: values.firstName,
              lastName: values.lastName,
              jobTitle: values.jobTitle,
              roleId: values.roleId,
              updatedAt: member.updatedAt,
            }
          : values,
      });
      onDone();
    } catch (error) {
      showFailure(error);
      // UC19 FE02: the e-mail is in the first step, which the form goes back to.
      if (error instanceof ApiError && error.code === "EMAIL_IN_USE") {
        form.setError("email", { message: error.message });
      }
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
        steps={getStaffSteps(isEditing)}
        onSubmit={submit}
        submitLabel={isEditing ? "Salvar alterações" : "Cadastrar funcionário"}
        loadingLabel={isEditing ? "Salvando…" : "Cadastrando…"}
        onCancel={onCancel}
      >
        {(stepIndex) =>
          stepIndex === 0 ? (
            <StaffDataStep isEditing={isEditing} />
          ) : (
            <StaffRoleStep
              currentRole={
                member && { id: member.roleId, name: member.roleName }
              }
              onGoToRoles={onGoToRoles}
            />
          )
        }
      </StepForm>
    </FormProvider>
  );
}
