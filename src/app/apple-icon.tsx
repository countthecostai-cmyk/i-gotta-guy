import { ImageResponse } from "next/og";
import { LOGO_DATA_URL } from "@/lib/brand/logo-data";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS doesn't handle a transparent touch-icon well, so this one gets a
// white backing square behind the logo (the rest of the circular badge's
// background is already transparent — see src/lib/brand/logo-data.ts).
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
          background: "#ffffff",
        }}
      >
        <img src={LOGO_DATA_URL} width={size.width} height={size.height} alt="" />
      </div>
    ),
    { ...size },
  );
}
