"use client";

import { RoleCard } from "@/components/admin/roles/role-card";
import { InactiveSwitch } from "@/components/shared/inactive-switch";
import { PaginatedList } from "@/components/shared/paginated-list";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { AdminRole } from "@/shared/api/staff";
import { ADMIN_LIST_PAGE_SIZE } from "@/shared/constants/pagination";

// UC21 (docs/equipe/equipe-do-painel.md): the roles by page, with the
// inactive ones on request, in the states of docs/padroes/componentes.md,
// Listagem.

type RoleFilters = { includeInactive: boolean };

export function RoleList() {
  const list = usePaginatedList<AdminRole, RoleFilters>({
    path: "/api/admin/roles",
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
      emptyTitle="Nenhum cargo cadastrado"
      emptyDescription="Os cargos dos funcionários aparecem aqui."
      renderItems={(roles) => (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <li key={role.id}>
              <RoleCard role={role} onChange={list.reload} />
            </li>
          ))}
        </ul>
      )}
    />
  );
}
