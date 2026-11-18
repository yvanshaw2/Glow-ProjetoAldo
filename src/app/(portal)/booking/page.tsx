import type { Metadata } from "next";
import { BookingWizard } from "@/components/portal/appointments/booking-wizard";

export const metadata: Metadata = { title: "Agendar serviço – Glow" };

// UC06: the booking in steps (docs/agendamento/agendar-servico.md).
export default function BookingPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 lg:px-8">
      <h1 className="text-h3 font-bold md:text-h2">Agendar serviço</h1>
      <BookingWizard />
    </div>
  );
}
