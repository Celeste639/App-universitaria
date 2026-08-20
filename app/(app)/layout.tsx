import { AppNav } from "@/components/AppNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppNav />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</div>
    </>
  );
}
