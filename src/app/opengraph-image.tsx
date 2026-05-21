import { ImageResponse } from "next/og";

/**
 * Dynamically generated OG / share-card image for the site root.
 * Next.js serves this at `/opengraph-image` and wires it into the page's
 * OpenGraph + Twitter card metadata automatically. No binary asset to ship.
 */
export const alt = "Kinetic — Triage Gmail without giving up control";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0f1115",
          color: "#f5f6f7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#19a974",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            K
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Kinetic</div>
        </div>
        <div
          style={{
            fontSize: 62,
            fontWeight: 700,
            lineHeight: 1.15,
            marginTop: "40px",
            maxWidth: "960px",
          }}
        >
          Triage Gmail without giving up control.
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#9aa0a6",
            marginTop: "28px",
            maxWidth: "900px",
          }}
        >
          A read-only cockpit — your inbox stays in your browser.
        </div>
      </div>
    ),
    { ...size },
  );
}
