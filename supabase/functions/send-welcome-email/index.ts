import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CURSILLO_ID = "04cbfec5-497a-480d-ba4d-1a08c982edb7";

interface WelcomeEmailRequest {
  email: string;
  nombres: string;
  tipo: 'bienvenida' | 'aprobado' | 'rechazado';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTH: Validar JWT + rol para aprobado/rechazado ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado: falta token de autenticación" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    const { email, nombres, tipo }: WelcomeEmailRequest = await req.json();

    // Para emails de aprobado/rechazado, verificar que el caller sea DOCENTE o ADMIN
    if (tipo === 'aprobado' || tipo === 'rechazado') {
      const supabaseAdmin = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const { data: callerUser } = await supabaseAdmin
        .from("usuarios")
        .select("id_usuario")
        .eq("id_auth", user.id)
        .single();

      if (callerUser) {
        const { data: rolData } = await supabaseAdmin
          .from("usuarios_cursillos")
          .select("roles:id_rol(nombre_rol)")
          .eq("id_usuario", callerUser.id_usuario)
          .eq("id_cursillo", CURSILLO_ID)
          .eq("estado", "ACTIVO")
          .single();

        const rolNombre = (rolData as any)?.roles?.nombre_rol;
        if (rolNombre !== "ADMINISTRADOR" && rolNombre !== "DOCENTE") {
          return new Response(
            JSON.stringify({ error: "No autorizado: solo docentes y administradores pueden enviar este tipo de emails" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Usuario no encontrado en el sistema" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }
    // ========== FIN AUTH ==========

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      console.error("BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject: string;
    let htmlContent: string;

    if (tipo === 'bienvenida') {
      subject = "¡Bienvenido/a a Cursillo Prueba!";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #1e4d6b, #2d7392); padding: 30px; border-radius: 12px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">¡Bienvenido/a ${nombres || ''}!</h1>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #1e4d6b; margin-top: 0;">Gracias por registrarte</h2>
            <p style="color: #64748b; margin-bottom: 20px;">
              Tu solicitud de registro ha sido recibida exitosamente. Nuestro equipo docente revisará 
              tu solicitud y en breve recibirás la confirmación de aprobación.
            </p>
            
            <div style="background: #fef3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⏳ Estado:</strong> Pendiente de aprobación
              </p>
            </div>
            
            <p style="color: #64748b;">
              Una vez aprobada tu cuenta, podrás:
            </p>
            <ul style="color: #64748b; padding-left: 20px;">
              <li>Inscribirte en los cursos disponibles</li>
              <li>Acceder a los contenidos y materiales</li>
              <li>Realizar evaluaciones y tareas</li>
              <li>Participar en los foros de discusión</li>
            </ul>
          </div>
          
          <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">
            <p>Este es un correo automático del sistema de Cursillo Prueba.</p>
            <p>Por favor, no responda a este mensaje.</p>
          </div>
        </body>
        </html>
      `;
    } else if (tipo === 'aprobado') {
      subject = "¡Tu cuenta ha sido aprobada! - Cursillo Prueba";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">¡Cuenta Aprobada!</h1>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #059669; margin-top: 0;">¡Felicidades ${nombres || ''}!</h2>
            <p style="color: #64748b; margin-bottom: 20px;">
              Tu cuenta ha sido aprobada exitosamente. Ya puedes acceder a todas las funcionalidades 
              de la plataforma.
            </p>
            
            <div style="background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #047857;">
                <strong>✅ Estado:</strong> Cuenta activa
              </p>
            </div>
            
            <p style="color: #64748b;">
              Ahora puedes:
            </p>
            <ul style="color: #64748b; padding-left: 20px;">
              <li>Inscribirte en los cursos de tu interés</li>
              <li>Acceder a todos los contenidos y materiales</li>
              <li>Realizar evaluaciones y tareas</li>
              <li>Ver anuncios y notificaciones</li>
            </ul>
          </div>
          
          <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">
            <p>Este es un correo automático del sistema de Cursillo Prueba.</p>
            <p>Por favor, no responda a este mensaje.</p>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = "Actualización sobre tu solicitud - Cursillo Prueba";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 30px; border-radius: 12px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Solicitud No Aprobada</h1>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin-top: 0;">Estimado/a ${nombres || ''}</h2>
            <p style="color: #64748b; margin-bottom: 20px;">
              Lamentamos informarte que tu solicitud de registro no ha sido aprobada.
            </p>
            
            <p style="color: #64748b;">
              Si crees que esto es un error o tienes alguna consulta, por favor comunícate 
              con el equipo docente.
            </p>
          </div>
          
          <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">
            <p>Este es un correo automático del sistema de Cursillo Prueba.</p>
            <p>Por favor, no responda a este mensaje.</p>
          </div>
        </body>
        </html>
      `;
    }

    // Send email using Brevo Transactional Email API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Cursillo Prueba", email: "notificaciones@estudiemoshoy.com" },
        to: [{ email: email, name: nombres || '' }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Error sending email via Brevo:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResponse = await response.json();
    console.log("Welcome email sent successfully via Brevo:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
