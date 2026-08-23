import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">No encontramos esa página</h1>
      <p className="mt-2 text-sm text-surface-text">
        Puede que el enlace esté mal o que esa materia ya no esté en tu plan.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
