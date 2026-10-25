import { demoPage } from "@/lib/demo/list";
import type { DemoRequest } from "@/lib/demo/routes";
import type { Page } from "@/shared/api/pagination";
import type { AdminStaffMember } from "@/shared/api/staff";
import { ADMIN_LIST_PAGE_SIZE } from "@/shared/constants/pagination";

// Demo data of the staff list (decision 0055); the roles (#39) come from the
// database. Neither supabase/seed.sql (only the administrator, RN027) nor
// seed-demo.sql has staff, so the members are made up here, and the role ids
// below belong to no row of the database. One member is inactive, to show
// "Exibir inativos".

const UPDATED_AT = "2026-06-23T12:00:00+00:00";
const SORT_LOCALE = "pt-BR";

const ROLES = [
  { id: "19e290c2-796d-e34e-8670-c7c3f3f5de44", name: "Gerente" },
  { id: "f2622d67-b5c9-23b7-22fe-9ed68246947c", name: "Atendente" },
  { id: "219f8df5-acd9-247d-6d88-bb8464ade6a6", name: "Detalhista" },
];

function roleNamed(name: string): { id: string; name: string } {
  const role = ROLES.find((candidate) => candidate.name === name);
  if (!role) throw new Error(`No demo role is named ${name}`);
  return role;
}

function member(
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  jobTitle: string | null,
  roleName: string,
  isActive = true,
): AdminStaffMember {
  return {
    id,
    firstName,
    lastName,
    email,
    jobTitle,
    roleId: roleNamed(roleName).id,
    roleName,
    isActive,
    updatedAt: UPDATED_AT,
  };
}

const STAFF: AdminStaffMember[] = [
  member(
    "121e493a-0e6e-ad35-d23d-0e52f2460039",
    "Rafaela",
    "Nogueira",
    "rafaela.nogueira@example.com",
    "Gerente de operações",
    "Gerente",
  ),
  member(
    "b92a0b83-c77d-5d71-2093-fdf271b59256",
    "Thiago",
    "Barbosa",
    "thiago.barbosa@example.com",
    "Recepcionista",
    "Atendente",
  ),
  member(
    "20c25c65-e164-405b-5542-d5c250cf9cef",
    "Camila",
    "Vasconcelos",
    "camila.vasconcelos@example.com",
    null,
    "Atendente",
  ),
  member(
    "0852cd61-ba02-7a5b-8273-1321c51b38d8",
    "Leandro",
    "Prado",
    "leandro.prado@example.com",
    "Técnico de estética automotiva",
    "Detalhista",
  ),
  member(
    "c5dc8a15-fe64-a1ec-fc5f-8e3d3624b94c",
    "Murilo",
    "Teixeira",
    "murilo.teixeira@example.com",
    null,
    "Detalhista",
    false,
  ),
].sort((first, second) =>
  `${first.firstName} ${first.lastName}`.localeCompare(
    `${second.firstName} ${second.lastName}`,
    SORT_LOCALE,
  ),
);

// The reading of includeInactive: only the text "true" shows them.
function visibleItems<T extends { isActive: boolean }>(
  items: readonly T[],
  query: URLSearchParams,
): T[] {
  return query.get("includeInactive") === "true"
    ? [...items]
    : items.filter(({ isActive }) => isActive);
}

// GET /api/admin/staff (UC20): by full name, without the administrator
// (RN027), the inactive ones on request (FA01).
export function answerAdminStaff({
  query,
}: DemoRequest): Page<AdminStaffMember> {
  return demoPage(visibleItems(STAFF, query), query, {
    pageSize: ADMIN_LIST_PAGE_SIZE,
  });
}
