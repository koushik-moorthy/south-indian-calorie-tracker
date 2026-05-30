import { describe, it, expect } from "vitest";
import { sniffImageMime } from "@/lib/imageType";

describe("sniffImageMime", () => {
  it("detects JPEG from its FF D8 FF signature", () => {
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe(
      "image/jpeg"
    );
  });

  it("detects PNG from its 8-byte signature", () => {
    expect(
      sniffImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ).toBe("image/png");
  });

  it("detects WEBP from the RIFF....WEBP container", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x00, 0x00, 0x00, 0x00, // size (ignored)
      0x57, 0x45, 0x42, 0x50, // "WEBP"
    ]);
    expect(sniffImageMime(bytes)).toBe("image/webp");
  });

  it("returns null for a disallowed type (GIF)", () => {
    expect(
      sniffImageMime(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))
    ).toBeNull();
  });

  it("returns null for too-short input", () => {
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffImageMime(new Uint8Array([]))).toBeNull();
  });
});
