import "server-only";
import { getServiceClient } from "@/server/supabase/clients";
import { AppError } from "@/shared/errors/app-error";

// RN043: one rating per appointment; the primary key refuses a second one
// that arrives at the same time as the first.
const UNIQUE_VIOLATION = "23505";

export async function insertReview(
  appointmentId: string,
  rating: number,
): Promise<void> {
  const { error } = await getServiceClient()
    .from("appointment_reviews")
    .insert({ appointment_id: appointmentId, rating });
  if (error?.code === UNIQUE_VIOLATION) {
    throw new AppError("REVIEW_NOT_ALLOWED");
  }
  if (error) {
    throw error;
  }
}
