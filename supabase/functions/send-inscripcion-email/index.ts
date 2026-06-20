import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface SendInscripcionEmailRequest {
    id_usuario: string;
    id_curso: string;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // ========== AUTH: Validar JWT ==========
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
        // ========== FIN AUTH ==========

        const { id_usuario, id_curso }: SendInscripcionEmailRequest = await req.json();

        if (!id_usuario || !id_curso) {
            return new Response(
                JSON.stringify({ error: "id_usuario e id_curso son requeridos" }),
                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        if (!brevoApiKey) {
            console.error("BREVO_API_KEY not configured");
            return new Response(
                JSON.stringify({ error: "Servicio de correo no configurado" }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Create Supabase admin client
        const supabaseAdmin = createClient(
            supabaseUrl,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { persistSession: false } }
        );

        // Fetch user details
        const { data: usuario, error: userError } = await supabaseAdmin
            .from('usuarios')
            .select('nombres, apellidos, correo')
            .eq('id_usuario', id_usuario)
            .single();

        if (userError || !usuario || !usuario.correo) {
            console.error("Error fetching user or missing email:", userError);
            return new Response(
                JSON.stringify({ error: "Usuario no encontrado o sin correo" }),
                { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Fetch course details
        const { data: curso, error: courseError } = await supabaseAdmin
            .from('cursos')
            .select('titulo')
            .eq('id_curso', id_curso)
            .single();

        if (courseError || !curso) {
            console.error("Error fetching course:", courseError);
            return new Response(
                JSON.stringify({ error: "Curso no encontrado" }),
                { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #1e4d6b, #10b981); padding: 30px; border-radius: 12px;">
            <h1 style="color: white; margin: 0; font-size: 26px;">¡Inscripción Exitosa! 🎉</h1>
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="color: #1e4d6b; margin-top: 0;">Hola, ${usuario.nombres || ''}!</h2>
          <p style="color: #64748b; margin-bottom: 20px;">
            Te has inscrito correctamente al curso: <strong>${curso.titulo}</strong>.
          </p>
          
          <div style="background: #e0f2fe; border: 1px solid #7dd3fc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #0369a1;">
              <strong>📘 Estado:</strong> Listo para aprender
            </p>
          </div>
          
          <p style="color: #64748b;">
            Ya puedes acceder a todos los contenidos, lecciones y evaluaciones del curso directamente desde tu panel de estudiante.
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">
          <p>Este es un correo automático del sistema de Cursillo Prueba.</p>
          <p>Por favor, no responda a este mensaje.</p>
        </div>
      </body>
      </html>
    `;

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
                to: [{ email: usuario.correo, name: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() }],
                subject: `¡Inscripción exitosa! - ${curso.titulo}`,
                htmlContent: htmlContent,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Error sending email via Brevo:", errorData);
            throw new Error(`Failed to send email: ${errorData}`);
        }

        const emailResponse = await response.json();
        console.log("Enrollment email sent successfully via Brevo:", emailResponse);

        return new Response(JSON.stringify({ success: true, data: emailResponse }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    } catch (error: any) {
        console.error("Error in send-inscripcion-email function:", error);
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
