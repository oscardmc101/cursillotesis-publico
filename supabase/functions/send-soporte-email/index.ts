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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado: falta token de autenticación" }),
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
        JSON.stringify({ error: "No autorizado: token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { solicitudId } = await req.json();
    if (!solicitudId || typeof solicitudId !== "string" || !uuidRegex.test(solicitudId)) {
      return new Response(
        JSON.stringify({ error: "Solicitud inválida" }),
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
        telefono,
        tipo_solicitud,
        descripcion,
        imagen_bucket,
        imagen_path,
        imagen_nombre,
        imagen_tipo_mime,
        imagen_tamano_bytes,
        fecha_solicitud,
        cursillos:id_cursillo(nombre),
        usuarios:id_usuario(correo)
      `)
      .eq("id_solicitud", solicitudId)
      .single();

    if (solicitudError || !solicitud) {
      return new Response(
        JSON.stringify({ error: "Solicitud de soporte no encontrada" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (solicitud.id_usuario !== caller.id_usuario) {
      return new Response(
        JSON.stringify({ error: "No autorizado para notificar esta solicitud" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: adminRows, error: adminsError } = await supabaseAdmin
      .from("usuarios_cursillos")
      .select("id_usuario, usuarios:id_usuario(correo,nombres,apellidos), roles:id_rol(nombre_rol)")
      .eq("id_cursillo", solicitud.id_cursillo)
      .eq("estado", "ACTIVO");

    if (adminsError) throw adminsError;

    const adminUsersById = new Map<string, { idUsuario: string; email: string; name: string }>();
    for (const row of adminRows || []) {
      const typedRow = row as Record<string, unknown>;
      const rol = getRelationObject(typedRow.roles);
      if (String(rol?.nombre_rol ?? "").trim().toUpperCase() !== "ADMINISTRADOR") {
        continue;
      }

      const idUsuario = String(typedRow.id_usuario ?? "").trim();
      if (!idUsuario) continue;

      const usuario = getRelationObject(typedRow.usuarios);
      adminUsersById.set(idUsuario, {
        idUsuario,
        email: String(usuario?.correo ?? "").trim(),
        name: `${usuario?.nombres ?? ""} ${usuario?.apellidos ?? ""}`.trim(),
      });
    }

    const adminUsers = Array.from(adminUsersById.values());
    const notificationLink = `/soporte?solicitud=${solicitud.id_solicitud}`;
    let adminNotificationsCreated = 0;

    for (const admin of adminUsers) {
      const { data: existingNotification } = await supabaseAdmin
        .from("notificaciones")
        .select("id_notificacion")
        .eq("id_usuario", admin.idUsuario)
        .eq("id_cursillo", solicitud.id_cursillo)
        .eq("tipo", "SOPORTE_NUEVO")
        .eq("link", notificationLink)
        .maybeSingle();

      if (existingNotification) continue;

      const { error: notificationError } = await supabaseAdmin
        .from("notificaciones")
        .insert({
          id_usuario: admin.idUsuario,
          id_cursillo: solicitud.id_cursillo,
          tipo: "SOPORTE_NUEVO",
          titulo: "Nueva solicitud de soporte",
          mensaje: `${solicitud.nombre_usuario} envio una solicitud de ${getTipoLabel(solicitud.tipo_solicitud).toLowerCase()}.`,
          link: notificationLink,
        });

      if (notificationError) {
        console.error("Error creating support admin notification:", notificationError.message);
      } else {
        adminNotificationsCreated += 1;
      }
    }

    const recipients = adminUsers
      .map((admin) => ({
        email: admin.email,
        name: admin.name,
      }))
      .filter((recipient) => recipient.email.length > 0);

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    let emailWarning: string | null = null;

    if (adminUsers.length === 0) {
      emailWarning = "No hay administradores activos en el cursillo";
    } else if (recipients.length === 0) {
      emailWarning = "No hay administradores activos con correo configurado";
    } else if (!brevoApiKey) {
      emailWarning = "Servicio de correo no configurado";
    }

    let evidenceUrl: string | null = null;
    if (solicitud.imagen_bucket && solicitud.imagen_path) {
      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from(solicitud.imagen_bucket)
        .createSignedUrl(solicitud.imagen_path, 60 * 60 * 24 * 7);

      if (!signedError && signedData?.signedUrl) {
        evidenceUrl = signedData.signedUrl;
      }
    }

    const cursillo = getRelationObject(solicitud.cursillos);
    const reporter = getRelationObject(solicitud.usuarios);
    const tipoLabel = getTipoLabel(solicitud.tipo_solicitud);
    const fecha = new Date(solicitud.fecha_solicitud).toLocaleString("es-PY", {
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
    <h1 style="margin: 0 0 16px; color: #0f172a; font-size: 24px;">Nueva solicitud de ${escapeHtml(tipoLabel)}</h1>
    <p style="margin: 0 0 24px; color: #475569; font-size: 14px;">Esta solicitud fue enviada desde ${escapeHtml(cursillo?.nombre ?? "el cursillo")} el ${escapeHtml(fecha)}.</p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px;">
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px; width: 140px;">Usuario</td>
        <td style="padding: 10px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${escapeHtml(solicitud.nombre_usuario)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Correo</td>
        <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${escapeHtml(reporter?.correo ?? "No registrado")}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Teléfono</td>
        <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${escapeHtml(solicitud.telefono)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Tipo</td>
        <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${escapeHtml(tipoLabel)}</td>
      </tr>
    </table>

    <div style="border-left: 4px solid #14b8a6; padding: 14px 16px; background: #f8fafc; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
      <p style="margin: 0 0 8px; color: #334155; font-size: 13px; font-weight: 700;">Descripción</p>
      <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(solicitud.descripcion)}</p>
    </div>

    ${
      evidenceUrl
        ? `<p style="margin: 0 0 20px; font-size: 14px;"><a href="${escapeHtml(evidenceUrl)}" style="color: #0f766e; font-weight: 700;">Ver imagen adjunta</a> <span style="color: #64748b;">(enlace privado válido por 7 días)</span></p>`
        : `<p style="margin: 0 0 20px; color: #64748b; font-size: 14px;">No se adjuntó imagen.</p>`
    }

    <p style="margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center;">Este es un correo automático del sistema de Cursillo Prueba.</p>
  </div>
</body>
</html>`;

    let emailsSent = 0;
    if (brevoApiKey) {
      for (const recipient of recipients) {
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
            subject: `Nueva solicitud de soporte: ${tipoLabel}`,
            htmlContent,
          }),
        });

        if (!response.ok) {
          console.error("Error sending support email via Brevo:", await response.text());
          continue;
        }

        emailsSent += 1;
      }
    }

    if (recipients.length > 0 && brevoApiKey && emailsSent === 0) {
      emailWarning = "No se pudo enviar el correo a los administradores";
    }

    if (emailsSent > 0) {
      await supabaseAdmin
        .from("soporte_solicitudes")
        .update({
          email_notificado: true,
          fecha_email_notificado: new Date().toISOString(),
        })
        .eq("id_solicitud", solicitud.id_solicitud);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        adminNotificationsCreated,
        emailWarning,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error in send-soporte-email:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
