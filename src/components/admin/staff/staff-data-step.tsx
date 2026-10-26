"use client";

import { useFormContext } from "react-hook-form";
import type { StaffFormValues } from "@/components/admin/staff/staff-form-values";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { Input } from "@/components/ui/input";

// UC19 step 3 and UC20 steps 4 and 5 (docs/equipe/equipe-do-painel.md): the
// first step of the form of a staff member, checked by the schemas of the
// routes (FE01).

export function StaffDataStep({ isEditing }: { isEditing: boolean }) {
  const { control } = useFormContext<StaffFormValues>();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          control={control}
          name="firstName"
          label="Nome"
          renderInput={(field) => <Input {...field} autoComplete="off" />}
        />
        <FormField
          control={control}
          name="lastName"
          label="Sobrenome"
          renderInput={(field) => <Input {...field} autoComplete="off" />}
        />
      </div>
      {/* UC20 step 4: the e-mail is shown, not edited. */}
      <FormField
        control={control}
        name="email"
        label="E-mail"
        description={
          isEditing ? "O e-mail de acesso não pode ser alterado." : undefined
        }
        renderInput={(field) => (
          <Input
            {...field}
            type="email"
            readOnly={isEditing}
            autoComplete="off"
            spellCheck={false}
            className={isEditing ? "text-muted-foreground" : undefined}
          />
        )}
      />
      {/* RN023: the password the staff member signs in with, changed at the
          first access. */}
      {!isEditing && (
        <FormField
          control={control}
          name="password"
          label="Senha inicial"
          description="De 8 a 72 caracteres, com letra maiúscula, número e caractere especial. O funcionário troca a senha no primeiro acesso."
          renderInput={(field) => (
            <PasswordInput {...field} autoComplete="new-password" />
          )}
        />
      )}
      <FormField
        control={control}
        name="jobTitle"
        label="Cargo na empresa (opcional)"
        description="Texto livre, como Recepcionista. Não altera as permissões."
        renderInput={(field) => <Input {...field} autoComplete="off" />}
      />
    </div>
  );
}
