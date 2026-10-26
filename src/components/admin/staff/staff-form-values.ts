import type { FormStep } from "@/components/shared/step-form";
import type { AdminStaffMember } from "@/shared/api/staff";

// The values of the form of a staff member (docs/equipe/equipe-do-painel.md).
// The e-mail is shown but not sent when editing, and the password only
// exists in the register (UC19 step 3, UC20 step 4).
export type StaffFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  jobTitle: string;
  roleId: string | null;
};

export function getInitialValues(member?: AdminStaffMember): StaffFormValues {
  return {
    firstName: member?.firstName ?? "",
    lastName: member?.lastName ?? "",
    email: member?.email ?? "",
    password: "",
    jobTitle: member?.jobTitle ?? "",
    roleId: member?.roleId ?? null,
  };
}

// RF079: the data first, then the role. The edit has no password.
export function getStaffSteps(isEditing: boolean): FormStep<StaffFormValues>[] {
  return [
    {
      title: "Informações",
      fields: isEditing
        ? ["firstName", "lastName", "jobTitle"]
        : ["firstName", "lastName", "email", "password", "jobTitle"],
    },
    { title: "Cargo", fields: ["roleId"] },
  ];
}
