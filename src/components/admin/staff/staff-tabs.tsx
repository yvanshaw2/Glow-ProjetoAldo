"use client";

import { RoleList } from "@/components/admin/roles/role-list";
import { StaffList } from "@/components/admin/staff/staff-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// RF077 (docs/equipe/equipe-do-painel.md): the staff and the roles, one tab
// each, starting at the staff.

const SECTIONS = [
  { value: "staff", label: "Funcionários" },
  { value: "roles", label: "Cargos" },
] as const;

export function StaffTabs() {
  return (
    <Tabs defaultValue="staff" className="gap-6">
      <TabsList className="w-full md:w-fit">
        {SECTIONS.map(({ value, label }) => (
          <TabsTrigger key={value} value={value}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {/* Each tab mounts its list when chosen, so it reads the route again
          and starts with the inactive ones hidden. The cards have their own
          buttons, so the panel takes no focus stop of its own. */}
      <TabsContent value="staff" tabIndex={-1}>
        <StaffList />
      </TabsContent>
      <TabsContent value="roles" tabIndex={-1}>
        <RoleList />
      </TabsContent>
    </Tabs>
  );
}
