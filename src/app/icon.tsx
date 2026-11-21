import { ImageResponse } from "next/og";
import { LOGO_DATA_URL } from "@/lib/brand/logo-data";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Generated at request time from the inlined logo data URI (see
// src/lib/brand/logo-data.ts) rather than a static file under src/app/ —
// this gives us a real favicon without needing a binary asset file.
export default function Icon() {
  return new ImageResponse(
    <img src={LOGO_DATA_URL} width={size.width} height={size.height} alt="" />,
    { ...size },
  );
}
