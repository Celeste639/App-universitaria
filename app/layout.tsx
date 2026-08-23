import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "traza",
  description:
    "traza te lee el plan de estudios, prioriza materias y arma un calendario de estudio con IA.",
  icons: {
    icon: [
      { url: "/favicon-16.svg", sizes: "16x16", type: "image/svg+xml" },
      { url: "/traza-icon.svg", sizes: "32x32", type: "image/svg+xml" },
    ],
    apple: [{ url: "/traza-icon.svg", sizes: "32x32", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} min-h-screen bg-surface-light font-sans text-text antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
