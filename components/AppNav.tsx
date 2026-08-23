import Link from "next/link";
import { cerrarSesion } from "@/app/actions/auth";
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
    <header className="border-b border-clever-sand bg-clever-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-clever-ink">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-clever-skyDeep" />
          Clever
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {user ? (
            <>
              {LINKS_APP.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-clever-muted hover:bg-clever-sky hover:text-clever-ink"
                >
                  {link.label}
                </Link>
              ))}
              <form action={cerrarSesion}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-clever-muted hover:bg-clever-sky hover:text-clever-ink"
                >
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-clever-muted hover:bg-clever-sky hover:text-clever-ink"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="rounded-lg bg-clever-skyDeep px-3 py-1.5 font-medium text-white hover:bg-[#4d92b3]"
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
