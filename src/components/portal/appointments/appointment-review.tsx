"use client";

import { StarIcon } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { apiRequest, toApiError } from "@/lib/api-client";
import type { ClientAppointment } from "@/shared/api/appointments";

// UC28, RN043 (docs/agendamento/meus-agendamentos.md): the rating of a
// completed appointment, once. With a rating, it shows; with none and in the
// 30 days, the five options in native radio buttons, so the arrow keys move
// through them; out of the days, nothing. The API decides (RS008).

const RATINGS = [1, 2, 3, 4, 5];
const RATING_REQUIRED = "Escolha uma nota de 1 a 5.";
const SENT_MESSAGE = "Avaliação enviada.";

type AppointmentReviewProps = {
  appointment: ClientAppointment;
  onReviewed: (appointment: ClientAppointment) => void;
};

export function AppointmentReview({
  appointment,
  onReviewed,
}: AppointmentReviewProps) {
  const [isSent, setIsSent] = useState(false);
  const { rating, canReview } = appointment;
  return (
    <>
      {rating !== null && (
        <p className="border-t border-border pt-4">
          Sua avaliação: {rating} de 5
        </p>
      )}
      {rating === null && canReview && (
        <ReviewForm
          id={appointment.id}
          onSent={(updated) => {
            setIsSent(true);
            onReviewed(updated);
          }}
        />
      )}
      {/* RNF004: present before the message, so the screen reader hears it. */}
      <p role="status" className="sr-only">
        {isSent ? SENT_MESSAGE : ""}
      </p>
    </>
  );
}

type ReviewFormProps = {
  id: string;
  onSent: (appointment: ClientAppointment) => void;
};

function ReviewForm({ id, onSent }: ReviewFormProps) {
  const groupName = useId();
  const errorId = `${groupName}-error`;
  const [chosen, setChosen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (chosen === null) {
      setError(RATING_REQUIRED);
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      onSent(
        await apiRequest<ClientAppointment>(
          `/api/me/appointments/${id}/review`,
          { method: "POST", body: { rating: chosen } },
        ),
      );
    } catch (caught) {
      setError(toApiError(caught).message);
      setIsSending(false);
    }
  }

  return (
    <form
      onSubmit={send}
      noValidate
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <fieldset
        className="min-w-0"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        <legend className="mb-2 font-semibold">Como foi o atendimento?</legend>
        <div className="flex flex-wrap gap-2">
          {RATINGS.map((value) => {
            const inputId = `${groupName}-${value}`;
            return (
              <div key={value} className="relative">
                <input
                  id={inputId}
                  type="radio"
                  name={groupName}
                  value={value}
                  checked={chosen === value}
                  onChange={() => {
                    setChosen(value);
                    setError(null);
                  }}
                  className="peer sr-only"
                />
                <label
                  htmlFor={inputId}
                  className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm font-semibold text-muted-foreground transition-colors select-none peer-not-checked:hover:text-foreground peer-checked:border-link peer-checked:text-link peer-checked:shadow-neu-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ring"
                >
                  <StarIcon aria-hidden className="size-4" />
                  {value} de 5
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
      {error && <FieldError id={errorId}>{error}</FieldError>}
      <Button
        type="submit"
        variant="secondary"
        className="w-full sm:w-auto sm:self-start"
        disabled={isSending}
      >
        {isSending ? "Enviando…" : "Enviar avaliação"}
      </Button>
    </form>
  );
}
