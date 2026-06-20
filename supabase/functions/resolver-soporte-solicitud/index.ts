import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getRelationObject = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
};

const getTipoLabel = (tipo: string) => (tipo === "ERROR" ? "Error" : "Mejora");

const getResolutionMessage = (tipo: string) =>
  tipo === "MEJORA"
    ? "Ya se aplico la mejora que solicitaste en la plataforma."
    : "Ya se soluciono el error que reportaste en la plataforma.";

const sendResolutionEmail = async (
  brevoApiKey: string,
  recipient: { email: string; name: string },
  solicitud: Record<string, unknown>,
  cursilloName: string,
) => {
  const tipoLabel = getTipoLabel(String(solicitud.tipo_solicitud ?? ""));
  const message = getResolutionMessage(String(solicitud.tipo_solicitud ?? ""));
  const fecha = new Date().toLocaleString("es-PY", {
    timeZone: "America/Asuncion",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #f1f5f9; color: #0f172a;">
  <div style="background: #ffffff; border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(15,23,42,0.12);">
    <p style="margin: 0 0 8px; color: #0f766e; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;">Soporte de plataforma</p>
    <h1 style="margin: 0 0 16px; color: #0f172a; font-size: 24px;">Solicitud de soporte resuelta</h1>
    <p style="margin: 0 0 20px; color: #475569; font-size: 15px; line-height: 1.6;">${escapeHtml(message)}</p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px;">
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px; width: 140px;">Cursillo</td>
        <td style="padding: 10px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${escapeHtml(cursilloName)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Tipo</td>
        <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${escapeHtml(tipoLabel)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Fecha</td>
        <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${escapeHtml(fecha)}</td>
      </tr>
    </table>

    <div style="border-left: 4px solid #14b8a6; padding: 14px 16px; background: #f8fafc; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
      <p style="margin: 0 0 8px; color: #334155; font-size: 13px; font-weight: 700;">Solicitud original</p>
      <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(solicitud.descripcion)}</p>
    </div>

    <p style="margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center;">Este es un correo automatico del sistema de Cursillo Prueba.</p>
  </div>
</body>
</html>`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Cursillo Prueba", email: "notificaciones@estudiemoshoy.com" },
      to: [{ email: recipient.email, name: recipient.name }],
      subject: `Solicitud de soporte resuelta: ${tipoLabel}`,
      htmlContent,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado: falta token de autenticacion" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "No autorizado: token invalido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { solicitudId } = await req.json();
    if (!solicitudId || typeof solicitudId !== "string" || !uuidRegex.test(solicitudId)) {
      return new Response(
        JSON.stringify({ error: "Solicitud invalida" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: caller, error: callerError } = await supabaseAdmin
      .from("usuarios")
      .select("id_usuario")
      .eq("id_auth", user.id)
      .single();

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Usuario no encontrado en el sistema" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: solicitud, error: solicitudError } = await supabaseAdmin
      .from("soporte_solicitudes")
      .select(`
        id_solicitud,
        id_cursillo,
        id_usuario,
        nombre_usuario,
        tipo_solicitud,
        descripcion,
        estado,
        fecha_resolucion,
        resolucion_notificada,
        resolucion_email_notificado,
        cursillos:id_cursillo(nombre),
        usuarios:id_usuario(correo,nombres,apellidos)
      `)
      .eq("id_solicitud", solicitudId)
      .single();

    if (solicitudError || !solicitud) {
      return new Response(
        JSON.stringify({ error: "Solicitud de soporte no encontrada" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from("usuarios_cursillos")
      .select("roles:id_rol(nombre_rol)")
      .eq("id_cursillo", solicitud.id_cursillo)
      .eq("id_usuario", caller.id_usuario)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    const role = getRelationObject(roleRow?.roles);
    const isAdmin = String(role?.nombre_rol ?? "").trim().toUpperCase() === "ADMINISTRADOR";

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "No autorizado para resolver solicitudes de soporte" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const now = new Date().toISOString();
    const cursillo = getRelationObject(solicitud.cursillos);
    const reporter = getRelationObject(solicitud.usuarios);
    const reporterEmail = String(reporter?.correo ?? "").trim();
    const reporterName = `${reporter?.nombres ?? solicitud.nombre_usuario ?? ""} ${reporter?.apellidos ?? ""}`.trim();
    const notificationMessage = getResolutionMessage(String(solicitud.tipo_solicitud ?? ""));

    const shouldCreateWebNotification = !solicitud.resolucion_notificada;
    const shouldSendEmail = !solicitud.resolucion_email_notificado && reporterEmail.length > 0;

    if (shouldCreateWebNotification) {
      const { error: notificationError } = await supabaseAdmin
        .from("notificaciones")
        .insert({
          id_usuario: solicitud.id_usuario,
          id_cursillo: solicitud.id_cursillo,
          tipo: "SOPORTE_RESUELTO",
          titulo: "Solicitud de soporte resuelta",
          mensaje: notificationMessage,
          link: "/soporte",
        });

      if (notificationError) {
        throw notificationError;
      }
    }

    let emailSent = false;
    let emailWarning: string | null = null;

    if (shouldSendEmail) {
      const brevoApiKey = Deno.env.get("BREVO_API_KEY");
      if (!brevoApiKey) {
        emailWarning = "Servicio de correo no configurado";
      } else {
        try {
          await sendResolutionEmail(
            brevoApiKey,
            { email: reporterEmail, name: reporterName || solicitud.nombre_usuario },
            solicitud as Record<string, unknown>,
            String(cursillo?.nombre ?? "el cursillo"),
          );
          emailSent = true;
        } catch (error) {
          emailWarning = error instanceof Error ? error.message : "No se pudo enviar el correo";
          console.error("Error sending support resolution email:", emailWarning);
        }
      }
    } else if (!reporterEmail) {
      emailWarning = "El usuario no tiene correo configurado";
    }

    const updatePayload: Record<string, unknown> = {
      estado: "RESUELTO",
      fecha_resolucion: solicitud.fecha_resolucion ?? now,
      id_admin_resolutor: caller.id_usuario,
    };

    if (shouldCreateWebNotification) {
      updatePayload.resolucion_notificada = true;
      updatePayload.fecha_resolucion_notificada = now;
    }

    if (emailSent) {
      updatePayload.resolucion_email_notificado = true;
      updatePayload.fecha_resolucion_email_notificado = now;
    }

    const { data: updatedSolicitud, error: updateError } = await supabaseAdmin
      .from("soporte_solicitudes")
      .update(updatePayload)
      .eq("id_solicitud", solicitud.id_solicitud)
      .select(`
        id_solicitud,
        estado,
        fecha_resolucion,
        resolucion_notificada,
        fecha_resolucion_notificada,
        resolucion_email_notificado,
        fecha_resolucion_email_notificado
      `)
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        solicitud: updatedSolicitud,
        webNotificationSent: shouldCreateWebNotification,
        emailSent,
        emailWarning,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error in resolver-soporte-solicitud:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
