import type { Metadata } from "next";
import { AppointmentViews } from "@/components/admin/appointments/appointment-views";
import { PERMISSION_LABELS } from "@/shared/constants/permissions";

export const metadata: Metadata = { title: "Agendamentos – Glow" };

// UC10 to UC12, UC25 and UC26: the appointments of the panel.
export default function AppointmentsPage() {
  return (
    <>
      <h1 className="text-h3 font-bold md:text-h2">
        {PERMISSION_LABELS.appointments}
      </h1>
      <AppointmentViews />
    </>
  );
}
