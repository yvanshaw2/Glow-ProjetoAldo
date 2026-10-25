"use client";

import { useFormContext } from "react-hook-form";
import type { RoleFormValues } from "@/components/admin/roles/role-form-values";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// UC21 steps 4 and 5 (docs/equipe/equipe-do-painel.md): the first step of the
// form of a role, with its name and optional description. With the demo data
// the form has no validation schema yet (decision 0055), so only the empty
// name is checked (FE01).

const REQUIRED_MESSAGE = "Preencha este campo.";

export function RoleDataStep() {
  const { control } = useFormContext<RoleFormValues>();
  return (
    <div className="flex flex-col gap-5">
      <FormField
        control={control}
        name="name"
        label="Nome"
        rules={{ validate: (name) => name.trim() !== "" || REQUIRED_MESSAGE }}
        renderInput={(field) => (
          <Input {...field} placeholder="Ex.: Atendente" autoComplete="off" />
        )}
      />
      <FormField
        control={control}
        name="description"
        label="Descrição (opcional)"
        renderInput={(field) => (
          <Textarea {...field} placeholder="O que o cargo faz" />
        )}
      />
    </div>
  );
}
