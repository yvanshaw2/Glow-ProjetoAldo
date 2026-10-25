import type { Metadata } from "next";
import { ClientList } from "@/components/admin/clients/client-list";
import { PERMISSION_LABELS } from "@/shared/constants/permissions";

export const metadata: Metadata = { title: "Clientes – Glow" };

// UC16 and UC17: the clients in the panel; the vehicles of the client keep
// the data of src/lib/demo/ until #45 (decision 0055).
export default function ClientsPage() {
  return (
    <>
      <h1 className="text-h3 font-bold md:text-h2">
        {PERMISSION_LABELS.clients}
      </h1>
      <ClientList />
    </>
  );
}
