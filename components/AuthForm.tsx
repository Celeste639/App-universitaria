"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorMessage } from "@/components/ErrorMessage";
import { iniciarSesion, registrarUsuario } from "@/app/actions/auth";

type AuthFormProps = {
  modo: "login" | "registro";
  next?: string;
};

export function AuthForm({ modo, next = "/dashboard" }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const esRegistro = modo === "registro";

  async function onSubmit(formData: FormData) {
    setError(null);
    setAviso(null);
    setEnviando(true);
    formData.set("next", next);

    try {
      const resultado = esRegistro
        ? await registrarUsuario(formData)
        : await iniciarSesion(formData);

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      if ("confirmarEmail" in resultado.data && resultado.data.confirmarEmail) {
        setAviso(
          "Te mandamos un email de confirmación. Si no llega, en Supabase desactivá Confirm email en Authentication → Providers.",
        );
        return;
      }

      router.push(resultado.data.next);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
      className="space-y-4"
    >
      <label className="block text-sm font-medium text-clever-ink">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-clever-sand bg-clever-cream px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-clever-ink">
        Contraseña
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={esRegistro ? "new-password" : "current-password"}
          className="mt-1 w-full rounded-lg border border-clever-sand bg-clever-cream px-3 py-2 text-sm"
        />
      </label>

      {error && <ErrorMessage title="No se pudo continuar" message={error} />}
      {aviso && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {aviso}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-clever-skyDeep px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4d92b3] disabled:bg-clever-skyMid"
      >
        {enviando ? "Esperá…" : esRegistro ? "Crear cuenta" : "Iniciar sesión"}
      </button>

      <p className="text-center text-sm text-clever-muted">
        {esRegistro ? (
          <>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-clever-skyDeep hover:underline">
              Iniciá sesión
            </Link>
          </>
        ) : (
          <>
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="font-medium text-clever-skyDeep hover:underline">
              Registrate
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
