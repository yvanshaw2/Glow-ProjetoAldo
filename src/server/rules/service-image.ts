// The image of a service (UC13 FE02, UC14, RS015): the type is read from the
// first bytes of the file, never from its name or from the type the browser
// declared, and the size is limited.

// docs/catalogo/dados.md: the bucket accepts up to 2 MB.
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";

export type ImageError = "INVALID_FORMAT" | "TOO_LARGE";

export type ImageCheck =
  | { ok: true; contentType: ImageContentType }
  | { ok: false; error: ImageError };

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
// After "RIFF" come four bytes of size, then the format: "WEBP".
const WEBP_FORMAT_OFFSET = 8;
const WEBP_FORMAT = [0x57, 0x45, 0x42, 0x50];

function startsWith(
  bytes: Uint8Array,
  signature: number[],
  offset = 0,
): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function findImageType(bytes: Uint8Array): ImageContentType | null {
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (
    startsWith(bytes, RIFF_SIGNATURE) &&
    startsWith(bytes, WEBP_FORMAT, WEBP_FORMAT_OFFSET)
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageFile(bytes: Uint8Array): ImageCheck {
  if (bytes.byteLength > IMAGE_MAX_BYTES) {
    return { ok: false, error: "TOO_LARGE" };
  }
  const contentType = findImageType(bytes);
  return contentType === null
    ? { ok: false, error: "INVALID_FORMAT" }
    : { ok: true, contentType };
}
