// Brevo transactional email (OTP). Server-side only — kabhi NEXT_PUBLIC mat banana.
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "29devs@proton.me";

export type OtpPurpose = "signup" | "reset";

export async function sendOtpEmail(to: string, code: string, purpose: OtpPurpose): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.error("[brevo] BREVO_API_KEY missing");
    return false;
  }
  const isSignup = purpose === "signup";
  const subject = isSignup ? "Chakki Mitra: Email Verification OTP" : "Chakki Mitra: Password Reset OTP";
  const title = isSignup ? "ईमेल वेरिफिकेशन" : "पासवर्ड रीसेट";
  const htmlContent = `
<div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #eee;border-radius:12px;padding:24px">
  <h2 style="color:#ea580c">🌾 Chakki Mitra — ${title}</h2>
  <p>Namaste! Aapka 6-digit OTP:</p>
  <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;background:#fff7ed;border:2px dashed #ea580c;border-radius:10px;padding:12px;margin:16px 0">${code}</div>
  <p>Ye OTP <b>10 minute</b> me expire ho jayega. Kisi se share na karein.</p>
  <p style="color:#888;font-size:12px">This OTP expires in 10 minutes. Do not share it with anyone.</p>
</div>`;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: "Chakki Mitra" },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });
    if (!res.ok) console.error("[brevo] send failed:", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[brevo] send error:", e);
    return false;
  }
}
