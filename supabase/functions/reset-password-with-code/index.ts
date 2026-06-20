import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 3;

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { email, code, newPassword } = await req.json();

        if (!email || !code || !newPassword) {
            return new Response(
                JSON.stringify({ error: "email, code y newPassword son requeridos" }),
                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        if (newPassword.length < 6) {
            return new Response(
                JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { persistSession: false } }
        );

        // Buscar el código más reciente válido para este email
        const { data: record, error: fetchError } = await supabaseAdmin
            .from("password_reset_codes")
            .select("id, code, expires_at, attempts, used")
            .eq("email", email.toLowerCase())
            .eq("used", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError) {
            console.error("Error fetching code:", fetchError);
            return new Response(
                JSON.stringify({ error: "Error al verificar el código" }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // No existe un código activo
        if (!record) {
            return new Response(
                JSON.stringify({ error: "No hay un código activo para este correo. Solicita uno nuevo." }),
                { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Código expirado
        if (new Date(record.expires_at) < new Date()) {
            await supabaseAdmin
                .from("password_reset_codes")
                .update({ used: true })
                .eq("id", record.id);

            return new Response(
                JSON.stringify({ error: "El código ha expirado. Solicita uno nuevo.", expired: true }),
                { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Ya se agotaron los intentos
        if (record.attempts >= MAX_ATTEMPTS) {
            await supabaseAdmin
                .from("password_reset_codes")
                .update({ used: true })
                .eq("id", record.id);

            return new Response(
                JSON.stringify({ error: "Has superado el número máximo de intentos. Solicita un nuevo código.", tooManyAttempts: true }),
                { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Incrementar intentos
        const newAttempts = record.attempts + 1;
        await supabaseAdmin
            .from("password_reset_codes")
            .update({ attempts: newAttempts })
            .eq("id", record.id);

        // Verificar el código
        if (record.code !== String(code).trim()) {
            const remaining = MAX_ATTEMPTS - newAttempts;

            if (remaining <= 0) {
                // Marcar como usado (bloqueado)
                await supabaseAdmin
                    .from("password_reset_codes")
                    .update({ used: true })
                    .eq("id", record.id);

                return new Response(
                    JSON.stringify({ error: "Código incorrecto. Has agotado todos los intentos. Solicita un nuevo código.", tooManyAttempts: true }),
                    { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
                );
            }

            return new Response(
                JSON.stringify({ error: `Código incorrecto. Te quedan ${remaining} intento${remaining === 1 ? "" : "s"}.`, remainingAttempts: remaining }),
                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Código correcto — buscar usuario en auth y actualizar contraseña
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
            return new Response(
                JSON.stringify({ error: "Error al localizar el usuario" }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const authUser = authUsers.users.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (!authUser) {
            return new Response(
                JSON.stringify({ error: "Usuario no encontrado" }),
                { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            { password: newPassword }
        );

        if (updateError) {
            console.error("Error updating password:", updateError);
            return new Response(
                JSON.stringify({ error: "Error al actualizar la contraseña. Intenta de nuevo." }),
                { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        // Marcar código como usado
        await supabaseAdmin
            .from("password_reset_codes")
            .update({ used: true })
            .eq("id", record.id);

        console.log(`Password updated successfully for ${email}`);
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        console.error("Error in reset-password-with-code:", message);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
};

serve(handler);
