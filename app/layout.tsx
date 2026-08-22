import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Clever",
  description:
    "Clever te lee el plan de estudios, prioriza materias y arma un calendario de estudio con IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} min-h-screen bg-clever-beige font-sans text-clever-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
