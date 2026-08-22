import { AppNav } from "@/components/AppNav";
import { AuthForm } from "@/components/AuthForm";

type LoginPageProps = {
  searchParams: { next?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-clever-muted">
          Entrá para cargar tu plan y ver el ranking de materias.
        </p>
        <div className="mt-8 rounded-xl border border-clever-sand bg-clever-cream p-5 shadow-sm">
          <AuthForm modo="login" next={searchParams.next} />
        </div>
      </main>
    </>
  );
}
