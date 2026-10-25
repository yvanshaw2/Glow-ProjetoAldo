"use client";

import { useRef } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";

// UC17 FA01 (docs/clientes/clientes-do-painel.md): the account is deleted
// after a confirmation; the vehicles and the appointments are kept (RN030).

// A client deleted leaves the list, and with it the button that opened the
// window: the focus goes to the search of the list, in the same page (RNF005).
export function focusSearch() {
  return document.querySelector<HTMLElement>("main input[type=search]");
}

type DeleteClientButtonProps = {
  id: string;
  onDeleted: () => void;
};

export function DeleteClientButton({ id, onDeleted }: DeleteClientButtonProps) {
  const wasDeleted = useRef(false);
  return (
    <ConfirmDialog
      trigger={<Button variant="destructive">Excluir conta</Button>}
      title="Excluir esta conta?"
      description="A conta deixa de ser exibida e perde o acesso ao sistema. Os veículos e os agendamentos do cliente são preservados."
      confirmLabel="Excluir conta"
      loadingLabel="Excluindo…"
      cancelLabel="Voltar"
      isDestructive
      finalFocus={() => (wasDeleted.current ? focusSearch() : true)}
      onConfirm={async () => {
        wasDeleted.current = false;
        await apiRequest(`/api/admin/clients/${id}`, { method: "DELETE" });
        wasDeleted.current = true;
      }}
      onConfirmed={onDeleted}
    />
  );
}
