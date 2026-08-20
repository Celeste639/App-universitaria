# Copiloto de carrera

App web (Next.js 14) para que un estudiante suba su plan de estudios, reciba un ranking de materias estratégicas, un calendario semanal y resúmenes de clases con IA.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Anthropic Claude (`claude-sonnet-4-6`)
- `react-big-calendar`

## Setup

1. Copiá `.env.example` a `.env.local` y completá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
2. En el SQL Editor de Supabase, ejecutá [`supabase/schema.sql`](supabase/schema.sql).
3. Instalá dependencias y levantá el servidor:

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Páginas

- `/onboarding` — carga del plan + datos personales
- `/dashboard` — ranking y calendario semanal
- `/materias/[id]` — sesiones de estudio y pomodoro
- `/historial` — avance de carrera

Las Server Actions en `app/actions/` todavía son stubs: el LLM y la persistencia se conectan pantalla por pantalla.
