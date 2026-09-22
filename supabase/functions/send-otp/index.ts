import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, purpose } = await req.json();

    if (!email || !purpose) {
      return new Response(
        JSON.stringify({ error: "email and purpose are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["signup", "password_reset", "email_change"].includes(purpose)) {
      return new Response(
        JSON.stringify({ error: "Invalid purpose" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoApiKey = Deno.env.get("BREVO_API_KEY")!;

    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY not configured in Edge Function secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Rate limit: max 3 OTPs per email per 10 minutes
    const { count } = await supabaseAdmin
      .from("email_otps")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: "Bahut requests. 10 minute baad try karo." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Hash OTP with Web Crypto API (Deno compatible)
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Store in email_otps table
    const { error: insertError } = await supabaseAdmin.from("email_otps").insert({
      email,
      code_hash: codeHash,
      purpose,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
      used: false,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "OTP store nahi ho paya" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up old expired OTPs
    Promise.resolve(
      supabaseAdmin
        .from("email_otps")
        .delete()
        .lt("expires_at", new Date().toISOString())
    ).catch(() => {});

    // Send email via Brevo API v3
    const purposeLabels: Record<string, string> = {
      signup: "Account Signup Verification",
      password_reset: "Password Reset",
      email_change: "Email Change Verification",
    };

    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🏭</div>
            <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Chakki Mitra</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <div style="background-color:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
              <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Aapka Verification Code</div>
              <div style="font-size:40px;font-weight:800;color:#16a34a;letter-spacing:6px;font-family:'Courier New',monospace;">${otp}</div>
              <div style="font-size:12px;color:#9ca3af;margin-top:10px;">Ye code 5 minute me expire ho jayega</div>
            </div>
            <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Namaste! 🙏</p>
            <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Aapne Chakki Mitra me <strong>${purposeLabels[purpose] || "verification"}</strong> ke liye OTP request ki hai. Upar diya gaya <strong>6-digit code</strong> app me daalein.</p>
            <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:20px;">Agar aapne ye request nahi ki hai to ye email ignore kar dein. Aapka account safe hai.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
            <div style="font-size:12px;color:#9ca3af;">Chakki Mitra — Flour Mill Billing Platform</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: "29devs@proton.me", name: "Chakki Mitra" },
        to: [{ email }],
        subject: `Chakki Mitra — Aapka OTP Code: ${otp}`,
        htmlContent: emailBody,
      }),
    });

    if (!brevoRes.ok) {
      const brevoErr = await brevoRes.text();
      console.error("Brevo error:", brevoRes.status, brevoErr);
      return new Response(
        JSON.stringify({ error: "Email nahi bhej paye. Dobara try karo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
