"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { RoleFormDialog } from "@/components/admin/roles/role-form-dialog";
import { RoleList } from "@/components/admin/roles/role-list";
import { StaffFormDialog } from "@/components/admin/staff/staff-form-dialog";
import { StaffList } from "@/components/admin/staff/staff-list";
import { DemoNotice } from "@/components/shared/demo-notice";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// RF077 (docs/equipe/equipe-do-painel.md): the staff and the roles, one tab
// each, starting at the staff, with the button that creates the item of the
// tab beside them.

const SECTIONS = [
  { value: "staff", label: "Funcionários" },
  { value: "roles", label: "Cargos" },
] as const;

type Section = (typeof SECTIONS)[number]["value"];

export function StaffTabs() {
  const [section, setSection] = useState<Section>("staff");
  // A new staff member or role makes its list be read again.
  const [staffReadCount, setStaffReadCount] = useState(0);
  const [roleReadCount, setRoleReadCount] = useState(0);
  return (
    <Tabs
      value={section}
      onValueChange={(value) => setSection(value as Section)}
      className="gap-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <TabsList className="w-full md:w-fit">
          {SECTIONS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {section === "staff" && (
          <StaffFormDialog
            onSaved={() => setStaffReadCount((count) => count + 1)}
            onGoToRoles={() => setSection("roles")}
            trigger={
              <Button className="w-full md:w-auto">
                <PlusIcon aria-hidden />
                Novo funcionário
              </Button>
            }
          />
        )}
        {section === "roles" && (
          <RoleFormDialog
            onSaved={() => setRoleReadCount((count) => count + 1)}
            trigger={
              <Button className="w-full md:w-auto">
                <PlusIcon aria-hidden />
                Novo cargo
              </Button>
            }
          />
        )}
      </div>
      {/* Each tab mounts its list when chosen, so it reads the route again
          and starts with the inactive ones hidden. The cards have their own
          buttons, so the panel takes no focus stop of its own. */}
      <TabsContent value="staff" tabIndex={-1} className="flex flex-col gap-6">
        <DemoNotice />
        <StaffList key={staffReadCount} />
      </TabsContent>
      <TabsContent value="roles" tabIndex={-1}>
        <RoleList key={roleReadCount} />
      </TabsContent>
    </Tabs>
  );
}
