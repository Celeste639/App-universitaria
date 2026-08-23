# traza

App web (Next.js 14) para que un estudiante suba su plan de estudios, reciba un ranking de materias estratégicas, un calendario semanal y resúmenes de clases con IA.

Los usuarios públicos (evaluadores incluidos) solo se registran y suben el plan. No corren SQL.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Anthropic Claude (`claude-sonnet-4-6`)
- `react-big-calendar`

## Setup (dueño del proyecto)

1. Copiá `.env.example` a `.env.local` y completá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
2. En el SQL Editor de Supabase: `supabase/schema.sql` (proyecto nuevo) y `supabase/migracion-historial.sql` si el proyecto ya existía. En Auth, desactivá Confirm email para que cualquiera se registre sin mailbox.
3. Instalá dependencias y levantá el servidor:

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Páginas

- `/onboarding` — carga del plan + datos personales
- `/revisar-plan` — correlativas editables y avance (cursando / aprobada)
- `/dashboard` — ranking y calendario semanal
- `/materias/[id]` — sesiones de estudio, resúmenes con IA y pomodoro
- `/historial` — avance de carrera
