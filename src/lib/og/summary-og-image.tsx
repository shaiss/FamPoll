import type { SummaryOgCard } from "./summary-share";

export const SUMMARY_OG_SIZE = { width: 1200, height: 630 };

const paper = "#faf6f0";
const ink = "#201c18";
const ink2 = "#5e564e";
const ink3 = "#8a8178";
const tealDeep = "#147a68";
const tealTint = "#dcf2ec";
const tealInk = "#0f4f42";
const card = "#ffffff";
const line = "#eae2d8";

/** JSX tree for `ImageResponse` — inline styles only (Satori). */
export function SummaryOgImage({ card: c }: { card: SummaryOgCard }) {
  const hasEvent = Boolean(c.eventTitle);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: paper,
        padding: 48,
        fontFamily: 'Figtree, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: 1000,
          background: card,
          borderRadius: 28,
          overflow: "hidden",
          border: `1px solid ${line}`,
          boxShadow: "0 12px 40px rgba(32, 28, 24, 0.08)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", padding: "36px 44px 28px", gap: 8 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: ink3,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {c.brandName}
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: ink,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              fontFamily: 'Bricolage Grotesque, "Avenir Next", system-ui, sans-serif',
            }}
          >
            {c.heading}
          </div>
        </div>
        {hasEvent ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: tealTint,
              padding: "32px 44px",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: tealDeep,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {c.eventTitle}
            </div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: tealInk,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                fontFamily: 'Bricolage Grotesque, "Avenir Next", system-ui, sans-serif',
              }}
            >
              {c.dateLine}
            </div>
            {c.statusLine ? (
              <div style={{ fontSize: 26, fontWeight: 600, color: tealDeep, marginTop: 4 }}>{c.statusLine}</div>
            ) : null}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", padding: "28px 44px 40px", gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: ink2, lineHeight: 1.35 }}>{c.brandTagline}</div>
          </div>
        )}
        {hasEvent ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 44px",
              borderTop: `1px solid ${line}`,
              fontSize: 20,
              color: ink3,
            }}
          >
            <span>{c.brandTagline}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
