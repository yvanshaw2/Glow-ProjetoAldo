import type { Metadata } from "next";
import { StaffTabs } from "@/components/admin/staff/staff-tabs";
import { DemoNotice } from "@/components/shared/demo-notice";
import { PERMISSION_LABELS } from "@/shared/constants/permissions";

export const metadata: Metadata = { title: "Funcionários – Glow" };

// UC19 to UC21: the staff and the roles of the panel, with the data of
// src/lib/demo/ until the routes exist (decision 0055).
export default function StaffPage() {
  return (
    <>
      <h1 className="text-h3 font-bold md:text-h2">
        {PERMISSION_LABELS.staff}
      </h1>
      <DemoNotice />
      <StaffTabs />
    </>
  );
}
