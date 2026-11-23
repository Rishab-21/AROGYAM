import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function accountEmail(phone: string) {
  return `phone-${phone.replace(/\D/g, '')}@account.arogyam.invalid`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const body = await req.json() as { phone?: unknown; password?: unknown };
    const phone = typeof body.phone === "string" ? body.phone : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return jsonResponse({ error: "Enter a valid phone number." }, 400);
    if (password.length < 8 || password.length > 128) return jsonResponse({ error: "Use a password from 8 to 128 characters." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    const secretKey = secretKeys
      ? (JSON.parse(secretKeys) as Record<string, string>).default
      : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !secretKey) return jsonResponse({ error: "Phone account creation is not configured on the server." }, 503);

    const admin = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await admin.auth.admin.createUser({
      email: accountEmail(phone),
      password,
      email_confirm: true,
      user_metadata: { phone_number: phone, login_type: "phone_id" },
    });
    if (error) {
      if (/already|registered|duplicate/i.test(error.message)) {
        return jsonResponse({ ok: false, error: "An account with this phone number already exists." });
      }
      console.error("Phone account creation failed", error.message);
      return jsonResponse({ error: "Could not create the account. Please try again." }, 400);
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Phone account request failed", error instanceof Error ? error.message : "unknown error");
    return jsonResponse({ error: "Could not create the account. Please try again." }, 400);
  }
});
