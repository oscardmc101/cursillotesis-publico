import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendAnuncioEmailRequest {
  titulo: string;
  contenido: string;
  id_curso: string | null;
  nombre_curso?: string;
}

const CURSILLO_ID = "04cbfec5-497a-480d-ba4d-1a08c982edb7";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTH: Validar JWT y rol ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado: falta token de autenticación" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Cliente con contexto del usuario que invoca
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "No autorizado: token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verificar rol: solo DOCENTE o ADMINISTRADOR pueden enviar anuncios
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userRole } = await supabaseAdmin
      .from("usuarios")
      .select("id_usuario")
      .eq("id_auth", user.id)
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Usuario no encontrado en el sistema" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: rolData } = await supabaseAdmin
      .from("usuarios_cursillos")
      .select("roles:id_rol(nombre_rol)")
      .eq("id_usuario", userRole.id_usuario)
      .eq("id_cursillo", CURSILLO_ID)
      .eq("estado", "ACTIVO")
      .single();

    const rolNombre = (rolData as any)?.roles?.nombre_rol;
    if (rolNombre !== "ADMINISTRADOR" && rolNombre !== "DOCENTE") {
      return new Response(
        JSON.stringify({ error: "No autorizado: solo docentes y administradores pueden enviar anuncios" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    // ========== FIN AUTH ==========

    const { titulo, contenido, id_curso, nombre_curso }: SendAnuncioEmailRequest = await req.json();

    console.log("Sending announcement email:", { titulo, id_curso, nombre_curso, invoked_by: user.id });

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY not configured");
    }

    let recipients: Array<{ email: string; name: string }> = [];

    if (id_curso) {
      // Get users enrolled in the specific course
      const { data: inscripciones, error: inscError } = await supabaseAdmin
        .from("inscripciones")
        .select("id_usuario")
        .eq("id_curso", id_curso);

      if (inscError) throw inscError;

      if (inscripciones && inscripciones.length > 0) {
        const userIds = inscripciones.map((i: any) => i.id_usuario);
        const { data: usuarios, error: usersError } = await supabaseAdmin
          .from("usuarios")
          .select("correo, nombres, apellidos")
          .in("id_usuario", userIds)
          .not("correo", "is", null);

        if (usersError) throw usersError;

        recipients = (usuarios || [])
          .filter((u: any) => u.correo)
          .map((u: any) => ({
            email: u.correo,
            name: `${u.nombres || ''} ${u.apellidos || ''}`.trim(),
          }));
      }
    } else {
      // Global announcement: get all active users in the cursillo
      const { data: usuariosCursillo, error: ucError } = await supabaseAdmin
        .from("usuarios_cursillos")
        .select("id_usuario")
        .eq("id_cursillo", CURSILLO_ID)
        .eq("estado", "ACTIVO");

      if (ucError) throw ucError;

      if (usuariosCursillo && usuariosCursillo.length > 0) {
        const userIds = usuariosCursillo.map((uc: any) => uc.id_usuario);
        const { data: usuarios, error: usersError } = await supabaseAdmin
          .from("usuarios")
          .select("correo, nombres, apellidos")
          .in("id_usuario", userIds)
          .not("correo", "is", null);

        if (usersError) throw usersError;

        recipients = (usuarios || [])
          .filter((u: any) => u.correo)
          .map((u: any) => ({
            email: u.correo,
            name: `${u.nombres || ''} ${u.apellidos || ''}`.trim(),
          }));
      }
    }

    console.log(`Found ${recipients.length} recipients`);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, message: "No recipients found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const alcanceText = id_curso && nombre_curso
      ? `Curso: ${nombre_curso}`
      : "Anuncio Global";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f5;">
        <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #18181b; margin: 0; font-size: 24px;">📢 Nuevo Anuncio</h1>
            <p style="color: #71717a; margin: 8px 0 0 0; font-size: 14px;">${alcanceText}</p>
          </div>
          
          <div style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 24px 0;">
            <h2 style="color: #18181b; margin: 0 0 12px 0; font-size: 20px;">${titulo}</h2>
            <p style="color: #3f3f46; margin: 0; line-height: 1.6; white-space: pre-wrap;">${contenido}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
          
          <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
            Este es un mensaje automático del sistema de Cursillo Prueba.
          </p>
        </div>
      </body>
      </html>
    `;

    // Brevo allows up to 50 recipients per request
    const batchSize = 50;
    let totalSent = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "Cursillo Prueba", email: "notificaciones@estudiemoshoy.com" },
          to: batch,
          subject: `📢 ${titulo}`,
          htmlContent: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Error sending email batch via Brevo:", errorData);
      } else {
        totalSent += batch.length;
      }
    }

    console.log(`Successfully sent ${totalSent} emails via Brevo`);

    return new Response(
      JSON.stringify({ success: true, emailsSent: totalSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-anuncio-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
