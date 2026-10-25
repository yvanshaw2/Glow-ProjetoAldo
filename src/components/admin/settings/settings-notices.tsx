import { CircleCheckIcon } from "lucide-react";
import { FormAlert } from "@/components/shared/form-alert";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ApiError } from "@/lib/api-client";

type SettingsNoticesProps = {
  // The text of the success, or null while there is none.
  savedMessage: string | null;
  failure: { key: number; error: ApiError } | null;
};

// docs/padroes/componentes.md, Formulários: the success of a form that stays
// on the screen is a status at its top, in the place of the notice of failure.
export function SettingsNotices({
  savedMessage,
  failure,
}: SettingsNoticesProps) {
  return (
    <>
      {/* RNF004: a polite status, present before the notice appears, so the
          screen reader hears it without the focus leaving the button. */}
      <div role="status">
        {savedMessage !== null && (
          <Alert role="none">
            <CircleCheckIcon aria-hidden />
            <AlertDescription>{savedMessage}</AlertDescription>
          </Alert>
        )}
      </div>
      {failure && (
        <FormAlert key={failure.key}>{failure.error.message}</FormAlert>
      )}
    </>
  );
}
