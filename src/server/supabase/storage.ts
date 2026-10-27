import "server-only";
import { randomUUID } from "node:crypto";
import type { ImageContentType } from "@/server/rules/service-image";
import { getServiceClient } from "@/server/supabase/clients";

// The images of the services in the bucket service-images of the Storage
// (docs/catalogo/dados.md): public to read, written only here, with the key of
// service.

const IMAGE_BUCKET = "service-images";
const IMAGE_FOLDER = "services";

const EXTENSIONS: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// The public address of an image, from its path.
export function getImageUrl(path: string): string {
  return getServiceClient().storage.from(IMAGE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

// RS015: the name is generated here, never taken from the file sent, and
// nothing is overwritten. Returns the path to keep in services.image_path.
export async function uploadServiceImage(
  bytes: Uint8Array,
  contentType: ImageContentType,
): Promise<string> {
  const path = `${IMAGE_FOLDER}/${randomUUID()}.${EXTENSIONS[contentType]}`;
  const { error } = await getServiceClient()
    .storage.from(IMAGE_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) {
    throw error;
  }
  return path;
}
