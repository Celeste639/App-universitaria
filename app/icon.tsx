import { ImageResponse } from "next/og";

export const runtime = "edge";

export function generateImageMetadata() {
  return [
    { contentType: "image/png", size: { width: 16, height: 16 }, id: "16" },
    { contentType: "image/png", size: { width: 32, height: 32 }, id: "32" },
  ];
}

export default function Icon({ id }: { id: string }) {
  const simple = id === "16";
  const stroke = simple ? "5" : "4.5";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F1E2CF",
          borderRadius: simple ? 4 : 8,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: "#B6CFDB",
            borderRadius: simple ? 4 : 8,
            position: "relative",
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 64 64">
            <rect width="64" height="64" rx={simple ? 16 : 14} fill="#B6CFDB" />
            <path
              d="M18 20c10 0 14 5 16 12"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            <path
              d="M32 18v28"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            <circle cx={simple ? 46 : 48} cy={simple ? 44 : 46} r={simple ? 5 : 4} fill="#8AB0C4" />
          </svg>
        </div>
      </div>
    ),
    { width: simple ? 16 : 32, height: simple ? 16 : 32 },
  );
}
