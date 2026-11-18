import type { Metadata } from "next";
import { AppointmentTabs } from "@/components/portal/appointments/appointment-tabs";

export const metadata: Metadata = { title: "Meus agendamentos – Glow" };

// UC07: the current appointments and the history of the client, in tabs
// (docs/agendamento/meus-agendamentos.md).
export default function AppointmentsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-14 lg:px-8">
      <h1 className="text-h3 font-bold md:text-h2">Meus agendamentos</h1>
      <AppointmentTabs />
    </div>
  );
}
