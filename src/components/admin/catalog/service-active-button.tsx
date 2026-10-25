"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, toApiError, type ApiError } from "@/lib/api-client";

// UC14 FA02 and FA03 (docs/catalogo/servicos-do-painel.md): the deactivation
// and the reactivation of a service, with no confirmation. The button keeps
// the focus while the call runs (RNF004, RNF005), and a failure goes to the
// listing. A service deactivated leaves the listing that hides the inactive
// ones, and with it this button: the focus goes to the switch of the inactive
// ones, in the same panel.

type ServiceActiveButtonProps = {
  id: string;
  isActive: boolean;
  // The listing shows the inactive services too.
  isInactiveShown: boolean;
  updatedAt: string;
  onChanged: () => void;
  onFailed: (error: ApiError) => void;
};

export function ServiceActiveButton({
  id,
  isActive,
  isInactiveShown,
  updatedAt,
  onChanged,
  onFailed,
}: ServiceActiveButtonProps) {
  const [isRunning, setIsRunning] = useState(false);

  async function change() {
    setIsRunning(true);
    try {
      await apiRequest(`/api/admin/services/${id}`, {
        method: "PATCH",
        body: { isActive: !isActive, updatedAt },
      });
      if (isActive && !isInactiveShown) {
        document
          .querySelector<HTMLElement>('[role="tabpanel"] [role="switch"]')
          ?.focus();
      }
      onChanged();
    } catch (error) {
      onFailed(toApiError(error));
    } finally {
      setIsRunning(false);
    }
  }

  const runningLabel = isActive ? "Desativando…" : "Reativando…";
  return (
    <Button
      variant="outline"
      disabled={isRunning}
      focusableWhenDisabled
      onClick={() => void change()}
      className="aria-disabled:cursor-progress aria-disabled:opacity-70"
    >
      {isRunning && (
        <LoaderCircleIcon aria-hidden className="animate-spin text-link" />
      )}
      {isRunning ? runningLabel : isActive ? "Desativar" : "Reativar"}
    </Button>
  );
}
