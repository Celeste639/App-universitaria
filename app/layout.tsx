import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Copiloto de carrera",
  description:
    "Subí tu plan de estudios y recibí un ranking de materias, un calendario de estudio y resúmenes de clases con IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} min-h-screen bg-slate-50 font-sans text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
