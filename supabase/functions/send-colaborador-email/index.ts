import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ColaboradorEmailRequest {
  email: string;
  nombres: string;
  cursoTitulo: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { email, nombres, cursoTitulo }: ColaboradorEmailRequest = await req.json();

    if (!email || !cursoTitulo) {
      return new Response(
        JSON.stringify({ error: "Email y cursoTitulo son requeridos" }),
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

    const subject = `Asignación como Docente Ayudante: ${cursoTitulo}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #1e4d6b, #2d7392); padding: 30px; border-radius: 12px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">¡Hola ${nombres || 'Docente'}!</h1>
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="color: #1e4d6b; margin-top: 0;">Has sido asignado/a como Docente Ayudante</h2>
          <p style="color: #64748b; margin-bottom: 20px;">
            Te informamos que has sido añadido/a como docente colaborador/a en el curso:
          </p>
          
          <div style="background: #e0f2fe; border: 1px solid #7dd3fc; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #0369a1; font-weight: bold; font-size: 18px;">
              ${cursoTitulo}
            </p>
          </div>
          
          <p style="color: #64748b;">
            A partir de ahora, tienes permisos para:
          </p>
          <ul style="color: #64748b; padding-left: 20px;">
            <li>Editar el contenido de los módulos y lecciones.</li>
            <li>Gestionar tareas, evaluaciones y recursos del curso.</li>
            <li>Calificar las entregas de los estudiantes.</li>
          </ul>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="http://192.168.100.20:8080/dashboard/admin/cursos" style="display: inline-block; background-color: #1e4d6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Ir a mis cursos
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">
          <p>Este es un correo automático del sistema de Cursillo Prueba.</p>
          <p>Por favor, no responda a este mensaje.</p>
        </div>
      </body>
      </html>
    `;

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
    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-colaborador-email function:", error);
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
