import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HAG FinTrack";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          backgroundColor: "#081526",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        {/* Subtle grid pattern background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(77,163,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(77,163,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(77,163,255,0.08) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
        {/* Logo + tagline */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, position: "relative" }}>
          {/* HAG FinTrack text logo (fallback — SVG not renderable in ImageResponse) */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 80, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-2px" }}>HAG</span>
            <span style={{ fontSize: 80, fontWeight: 400, color: "#4DA3FF", letterSpacing: "-2px" }}>FinTrack</span>
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#B7BEC7",
              letterSpacing: "3px",
              textTransform: "uppercase",
              fontWeight: 400,
            }}
          >
            Personal Finance
          </div>
          {/* Accent line */}
          <div style={{ width: 80, height: 3, backgroundColor: "#4DA3FF", borderRadius: 2 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
