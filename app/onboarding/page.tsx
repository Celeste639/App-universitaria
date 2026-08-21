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
          Cargá tu plan de estudios y contanos cómo está armada tu semana. Claude
          va a leer el PDF o la imagen y extraer materias y correlativas.
        </p>
        <OnboardingForm />
      </main>
    </>
  );
}
