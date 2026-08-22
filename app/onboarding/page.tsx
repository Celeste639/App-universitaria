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
        <h1 className="text-2xl font-semibold tracking-tight">Onboarding</h1>
        <p className="mt-2 text-sm text-slate-600">
          Cargá el plan de estudios. Si tenés correlativas o el cronograma semanal,
          sumalos — o subí una carpeta completa. Con el plan solo también podés
          seguir.
        </p>
        <OnboardingForm />
      </main>
    </>
  );
}
