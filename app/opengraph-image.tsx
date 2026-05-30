import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CS2 Case ROI — Live unboxing ROI for 425 containers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0f12",
          backgroundImage:
            "radial-gradient(800px 400px at 90% 10%, rgba(222,155,53,0.15), transparent 70%), radial-gradient(600px 300px at 5% 90%, rgba(94,152,217,0.08), transparent 70%)",
          color: "#e6e8ee",
          padding: 80,
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 12,
            color: "#de9b35",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          counter-strike 2
        </div>
        <div
          style={{
            fontSize: 128,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          CASE <span style={{ color: "#de9b35" }}>ROI</span>
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#9aa0ad",
            marginTop: 32,
            textAlign: "center",
          }}
        >
          Live unboxing ROI · 425 containers · 3 markets
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#de9b35",
            fontFamily: "monospace",
            marginTop: 48,
            letterSpacing: 4,
          }}
        >
          STEAM · CSFLOAT · SKINPORT
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
