import Link from "next/link";
import { cerrarSesion } from "@/app/actions/auth";
import { getAuthUser } from "@/lib/auth";

const LINKS_APP = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/historial", label: "Historial" },
  { href: "/onboarding", label: "Onboarding" },
];

export async function AppNav() {
  const user = await getAuthUser();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-sm font-semibold text-slate-900">
          Copiloto de carrera
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {user ? (
            <>
              {LINKS_APP.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
              <form action={cerrarSesion}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
