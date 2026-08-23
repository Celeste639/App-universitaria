import Link from "next/link";
import { cerrarSesion } from "@/app/actions/auth";
import { LogoTraza } from "@/components/LogoTraza";
import { getAuthUser } from "@/lib/auth";

const LINKS_APP = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/historial", label: "Historial" },
  { href: "/revisar-plan", label: "Revisar plan" },
  { href: "/onboarding", label: "Cargar plan" },
];

export async function AppNav() {
  const user = await getAuthUser();

  return (
    <header className="border-b border-primary/30 bg-primary">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="traza, inicio" className="flex h-8 items-center">
          <LogoTraza />
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {user ? (
            <>
              {LINKS_APP.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-primary-text hover:bg-surface/60"
                >
                  {link.label}
                </Link>
              ))}
              <form action={cerrarSesion}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-primary-text hover:bg-surface/60"
                >
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-primary-text hover:bg-surface/60"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="rounded-lg bg-surface px-3 py-1.5 font-medium text-surface-text hover:bg-surface-light"
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
