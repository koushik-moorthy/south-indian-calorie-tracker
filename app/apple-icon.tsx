import { ImageResponse } from "next/og";

// Apple touch icon (used for iOS "Add to Home Screen"). iOS applies its own
// rounded-corner mask, so a full-bleed orange square with the "C" mark works.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f97316",
          color: "#ffffff",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        C
      </div>
    ),
    size
  );
}
