import { NextResponse } from "next/server";
import { streamResumenClase } from "@/lib/resumir-clase";
import { cargarPlanYAvance } from "@/lib/datos";
import { MAX_ARCHIVOS_MATERIA, nombreArchivoSeguro } from "@/lib/documentos";
import { mensajeErrorSupabase } from "@/lib/errores-supabase";
import { getAuthUser } from "@/lib/auth";
import { minutosSegunMetodo, parsePreferencias } from "@/lib/preferencias";
import { esFormatoSesion, esMetodoTimer, esNivelDetalle } from "@/lib/preferencias";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidarRutasApp } from "@/lib/revalidar";
import { guardarPreferenciasUsuario } from "@/app/actions/preferencias";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: "Tenés que iniciar sesión para guardar la sesión." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const materiaId = String(formData.get("materia_id") ?? "").trim();
  const notas = String(formData.get("notas") ?? "");
  const formatoRaw = String(formData.get("formato") ?? "bullets");
  const detalleRaw = String(formData.get("detalle") ?? "rapido");
  const timerRaw = String(formData.get("metodo_timer") ?? "pomodoro");
  const formato = esFormatoSesion(formatoRaw) ? formatoRaw : "bullets";
  const detalle = esNivelDetalle(detalleRaw) ? detalleRaw : "rapido";
  const metodoTimer = esMetodoTimer(timerRaw) ? timerRaw : "pomodoro";
  const minutos = minutosSegunMetodo(
    metodoTimer,
    Number(formData.get("minutos_foco")),
    Number(formData.get("minutos_descanso")),
  );

  const archivos = formData
    .getAll("archivos")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (!materiaId) {
    return NextResponse.json({ error: "Falta la materia de esta sesión." }, { status: 400 });
  }
  if (archivos.length > MAX_ARCHIVOS_MATERIA) {
    return NextResponse.json(
      { error: `Podés subir hasta ${MAX_ARCHIVOS_MATERIA} archivos.` },
      { status: 400 },
    );
  }

  const { plan, perfil } = await cargarPlanYAvance(user.id);
  const materia = plan?.materias.find((item) => item.id === materiaId);
  if (!materia) {
    return NextResponse.json({ error: "Esa materia no está en tu plan." }, { status: 400 });
  }

  const payload = await Promise.all(
    archivos.map(async (archivo) => ({
      name: archivo.name,
      type: archivo.type,
      size: archivo.size,
      bytes: Buffer.from(await archivo.arrayBuffer()),
    })),
  );

  const encoder = new TextEncoder();
  let resumenFinal = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const resultado = await streamResumenClase(
        {
          materiaNombre: materia.nombre,
          notas,
          archivos: payload,
          formato,
          detalle,
        },
        (evento) => {
          if (evento.tipo === "delta") {
            resumenFinal += evento.texto;
            send("delta", { texto: evento.texto });
          }
          if (evento.tipo === "parcial") {
            resumenFinal += evento.texto;
            send("parcial", { texto: evento.texto });
          }
        },
      );

      if (!resultado.ok) {
        send("error", { error: resultado.error });
        controller.close();
        return;
      }

      const supabase = createSupabaseServerClient();
      const lote = Date.now();
      await Promise.all(
        payload.map((archivo) =>
          supabase.storage
            .from("contenido-clases")
            .upload(
              `${user.id}/${nombreArchivoSeguro(materiaId)}/${lote}-${nombreArchivoSeguro(archivo.name)}`,
              archivo.bytes,
              {
                contentType: archivo.type || "application/octet-stream",
                upsert: true,
              },
            ),
        ),
      );

      const origen = [
        notas.trim() ? notas.trim().slice(0, 4000) : "",
        payload.length > 0 ? `Archivos: ${payload.map((archivo) => archivo.name).join(", ")}` : "",
      ]
        .filter((parte) => parte.length > 0)
        .join("\n\n");

      const { error } = await supabase.from("sesiones_estudio").insert({
        user_id: user.id,
        materia_id: materiaId,
        contenido_original: origen || null,
        resumen_ia: resultado.data,
        formato,
        nivel_detalle: detalle,
        metodo_timer: metodoTimer,
        minutos_foco: minutos.foco,
        minutos_descanso: minutos.descanso,
      });

      if (error) {
        send("error", {
          error: mensajeErrorSupabase(
            error,
            "El resumen se armó, pero no pude guardarlo. Ejecutá supabase/schema.sql.",
          ),
        });
        controller.close();
        return;
      }

      const prefs = parsePreferencias(perfil?.preferencias);
      await guardarPreferenciasUsuario({
        ...prefs,
        formato_sesion: formato,
        nivel_detalle: detalle,
        metodo_timer: metodoTimer,
        minutos_foco: minutos.foco,
        minutos_descanso: minutos.descanso,
      });

      revalidarRutasApp(materiaId);
      send("done", { resumen: resultado.data });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
