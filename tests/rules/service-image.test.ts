import { describe, expect, it } from "vitest";
import {
  findImageType,
  IMAGE_MAX_BYTES,
  validateImageFile,
} from "@/server/rules/service-image";

// The image of a service (UC13 FE02, RS015, docs/catalogo/rotas.md): the type
// comes from the first bytes of the file, never from its name, and the size
// is at most 2 MB.

const JPEG_START = [0xff, 0xd8, 0xff, 0xe0];
const PNG_START = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// "RIFF", a size of four bytes and "WEBP".
const WEBP_START = [
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];

function fileOf(start: number[], size = 64): Uint8Array {
  const bytes = new Uint8Array(Math.max(size, start.length));
  bytes.set(start);
  return bytes;
}

function textOf(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe("findImageType", () => {
  it("detects a JPEG, a PNG and a WebP by the first bytes", () => {
    expect(findImageType(fileOf(JPEG_START))).toBe("image/jpeg");
    expect(findImageType(fileOf(PNG_START))).toBe("image/png");
    expect(findImageType(fileOf(WEBP_START))).toBe("image/webp");
  });

  it("rejects a PDF, a text file and an SVG", () => {
    expect(findImageType(textOf("%PDF-1.7\n"))).toBeNull();
    expect(findImageType(textOf("just some text"))).toBeNull();
    expect(
      findImageType(textOf('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    ).toBeNull();
  });

  it("rejects a RIFF file that is not a WebP", () => {
    const wave = [...WEBP_START.slice(0, 8), 0x57, 0x41, 0x56, 0x45];
    expect(findImageType(fileOf(wave))).toBeNull();
  });

  it("rejects an empty file and one shorter than the signature", () => {
    expect(findImageType(new Uint8Array())).toBeNull();
    expect(findImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(findImageType(new Uint8Array(PNG_START.slice(0, 4)))).toBeNull();
  });
});

describe("validateImageFile", () => {
  it("accepts an image of an accepted type", () => {
    expect(validateImageFile(fileOf(JPEG_START))).toEqual({
      ok: true,
      contentType: "image/jpeg",
    });
  });

  it("rejects a file renamed to .png that is not an image", () => {
    expect(validateImageFile(textOf("%PDF-1.7\n"))).toEqual({
      ok: false,
      error: "INVALID_FORMAT",
    });
  });

  it("accepts a file of exactly 2 MB and rejects one byte more", () => {
    expect(IMAGE_MAX_BYTES).toBe(2_097_152);
    expect(validateImageFile(fileOf(PNG_START, IMAGE_MAX_BYTES)).ok).toBe(true);
    expect(validateImageFile(fileOf(PNG_START, IMAGE_MAX_BYTES + 1))).toEqual({
      ok: false,
      error: "TOO_LARGE",
    });
  });

  it("reports the size before the format of a big file", () => {
    expect(validateImageFile(new Uint8Array(IMAGE_MAX_BYTES + 1))).toEqual({
      ok: false,
      error: "TOO_LARGE",
    });
  });

  it("rejects an empty file", () => {
    expect(validateImageFile(new Uint8Array())).toEqual({
      ok: false,
      error: "INVALID_FORMAT",
    });
  });
});
