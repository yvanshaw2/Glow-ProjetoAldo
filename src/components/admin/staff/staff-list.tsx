"use client";

import { StaffCard } from "@/components/admin/staff/staff-card";
import { InactiveSwitch } from "@/components/shared/inactive-switch";
import { PaginatedList } from "@/components/shared/paginated-list";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { AdminStaffMember } from "@/shared/api/staff";
import { ADMIN_LIST_PAGE_SIZE } from "@/shared/constants/pagination";

// UC20 (docs/equipe/equipe-do-painel.md): the staff by page, without the
// administrator (RN027), with the inactive ones on request, in the states of
// docs/padroes/componentes.md, Listagem.

type StaffFilters = { includeInactive: boolean };

export function StaffList() {
  const list = usePaginatedList<AdminStaffMember, StaffFilters>({
    path: "/api/admin/staff",
    pageSize: ADMIN_LIST_PAGE_SIZE,
    initialFilters: { includeInactive: false },
  });
  return (
    <PaginatedList
      list={list}
      hasClearButton={false}
      filters={
        <InactiveSwitch
          checked={list.filters.includeInactive}
          onCheckedChange={(checked) =>
            list.setFilter("includeInactive", checked)
          }
        />
      }
      emptyTitle="Nenhum funcionário cadastrado"
      emptyDescription="Cadastre um funcionário para ele aparecer aqui."
      renderItems={(members) => (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <li key={member.id}>
              <StaffCard member={member} onChange={list.reload} />
            </li>
          ))}
        </ul>
      )}
    />
  );
}
