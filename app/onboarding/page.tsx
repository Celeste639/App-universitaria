import { AppNav } from "@/components/AppNav";
import { OnboardingForm } from "@/components/OnboardingForm";
import { requireAuthUser } from "@/lib/auth";

export const maxDuration = 60;

export default async function OnboardingPage() {
  await requireAuthUser();

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Cargar tu plan</h1>
        <p className="mt-2 text-sm text-surface-text">
          Subí el plan de estudios. Si tenés el PDF de correlativas o el
          cronograma, sumalos — o toda la carpeta. Si ya habías cargado un plan y
          el ranking se ve mal, volvé a subir los mismos archivos: se reemplaza
          lo anterior.
        </p>
        <OnboardingForm />
      </main>
    </>
  );
}
