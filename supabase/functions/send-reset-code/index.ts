import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { email } = await req.json();

        if (!email || typeof email !== "string") {
            return new Response(
                JSON.stringify({ error: "Email requerido" }),
                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        if (!brevoApiKey) {
            return new Response(
                JSON.stringify({ error: "Servicio de correo no configurado" }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { persistSession: false } }
        );

        // Verificar que el email existe en auth.users
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) {
            console.error("Error listing users:", authError);
            // Por seguridad, devolvemos 200 aunque falle
            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        const userExists = authUsers.users.some(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (!userExists) {
            // Por seguridad NO revelamos si el email existe o no
            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        // Invalidar códigos anteriores no usados para este email
        await supabaseAdmin
            .from("password_reset_codes")
            .update({ used: true })
            .eq("email", email.toLowerCase())
            .eq("used", false);

        // Generar código OTP de 5 dígitos
        const code = String(Math.floor(10000 + Math.random() * 90000));

        // Insertar nuevo código (expira en 15 minutos)
        const { error: insertError } = await supabaseAdmin
            .from("password_reset_codes")
            .insert({
                email: email.toLowerCase(),
                code,
                expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                attempts: 0,
                used: false,
            });

        if (insertError) {
            console.error("Error inserting OTP code:", insertError);
            return new Response(
                JSON.stringify({ error: "Error al generar el código" }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Enviar email con el código via Brevo
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f1f5f9;">

  <div style="text-align: center; margin-bottom: 24px;">
    <div style="background: linear-gradient(135deg, #1e4d6b 0%, #10b981 100%); padding: 32px 24px; border-radius: 14px;">
      <p style="color: rgba(255,255,255,0.8); margin: 0 0 8px 0; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">Cursillo Prueba</p>
      <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">🔐 Recuperar Contraseña</h1>
    </div>
  </div>

  <div style="background: #ffffff; padding: 30px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">Hola 👋</h2>
    <p style="color: #475569; font-size: 15px; margin-bottom: 24px;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Cursillo Prueba</strong>.
      Usa el siguiente código de verificación para continuar:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <div style="display: inline-block; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px solid #10b981; border-radius: 12px; padding: 20px 40px;">
        <p style="margin: 0 0 4px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Tu código de verificación</p>
        <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #1e4d6b;">${code}</span>
      </div>
    </div>

    <div style="background: #fefce8; border: 1px solid #fde047; padding: 14px 16px; border-radius: 8px; margin-top: 20px;">
      <p style="margin: 0; color: #713f12; font-size: 13px;">
        ⏰ <strong>Este código expirará en 15 minutos</strong> y solo puede usarse una vez.
        Máximo 3 intentos permitidos.
      </p>
    </div>

    <div style="background: #f8fafc; border-left: 3px solid #94a3b8; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 16px;">
      <p style="margin: 0; color: #64748b; font-size: 13px;">
        🔒 <strong>¿No fuiste tú?</strong> Ignora este correo. Tu contraseña no cambiará si no usas este código.
      </p>
    </div>
  </div>

  <div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 0 20px;">
    <p style="margin: 4px 0;">Este es un correo automático de <strong>Cursillo Prueba</strong>.</p>
    <p style="margin: 4px 0;">Por favor, no responda a este mensaje.</p>
  </div>

</body>
</html>`;

        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": brevoApiKey,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                sender: { name: "Cursillo Prueba", email: "notificaciones@estudiemoshoy.com" },
                to: [{ email: email.toLowerCase() }],
                subject: `Tu código de recuperación: ${code} — Cursillo Prueba`,
                htmlContent,
            }),
        });

        if (!brevoResponse.ok) {
            const err = await brevoResponse.text();
            console.error("Brevo error:", err);
            return new Response(
                JSON.stringify({ error: "Error al enviar el correo" }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        console.log(`OTP code sent to ${email}`);
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        console.error("Error in send-reset-code:", message);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
};

serve(handler);
