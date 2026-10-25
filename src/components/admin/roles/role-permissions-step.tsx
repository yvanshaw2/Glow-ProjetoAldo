"use client";

import { useId } from "react";
import { useController } from "react-hook-form";
import type { RoleFormValues } from "@/components/admin/roles/role-form-values";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  PERMISSION_LABELS,
  PERMISSIONS,
  type Permission,
} from "@/shared/constants/permissions";

// UC21 steps 6 and 7 and FA01 (docs/equipe/equipe-do-painel.md): the second
// step of the form of a role, the six permissions in the order of RN025, at
// least one (FE03).

const REQUIRED_MESSAGE = "Selecione ao menos uma permissão.";

export function RolePermissionsStep({ isEditing }: { isEditing: boolean }) {
  const { field, fieldState } = useController<RoleFormValues, "permissionKeys">(
    {
      name: "permissionKeys",
      rules: {
        validate: (keys) => keys.length > 0 || REQUIRED_MESSAGE,
      },
    },
  );
  const groupName = useId();

  // The value keeps the order of RN025, whatever the order of the clicks.
  function toggle(permission: Permission, isChecked: boolean) {
    field.onChange(
      PERMISSIONS.filter((candidate) =>
        candidate === permission ? isChecked : field.value.includes(candidate),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {isEditing && (
        <Alert role="note">
          <AlertDescription>
            As alterações valem para todos os funcionários deste cargo.
          </AlertDescription>
        </Alert>
      )}
      <FieldSet className="gap-3">
        <FieldLegend variant="label">
          Escolha as páginas que o cargo pode acessar.
        </FieldLegend>
        <ul className="flex flex-col gap-3">
          {PERMISSIONS.map((permission, index) => {
            const inputId = `${groupName}-${permission}`;
            const descriptionId = `${inputId}-description`;
            return (
              <li
                key={permission}
                className="flex items-start gap-3 rounded-xl bg-background p-3 shadow-neu-sm"
              >
                <Checkbox
                  id={inputId}
                  ref={index === 0 ? field.ref : undefined}
                  checked={field.value.includes(permission)}
                  onCheckedChange={(isChecked) => toggle(permission, isChecked)}
                  onBlur={field.onBlur}
                  aria-describedby={descriptionId}
                  aria-invalid={fieldState.invalid}
                  className="mt-0.5"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Label htmlFor={inputId}>
                    {PERMISSION_LABELS[permission]}
                  </Label>
                  <p
                    id={descriptionId}
                    className="text-sm text-muted-foreground"
                  >
                    Consultar, criar, editar e excluir em{" "}
                    {PERMISSION_LABELS[permission]}.
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <FieldError errors={[fieldState.error]} />
      </FieldSet>
    </div>
  );
}
