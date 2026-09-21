// Resend transactional email (OTP). Server-side only — kabhi NEXT_PUBLIC mat banana.
// NOTE: dusre users ko mail bhejne ke liye Resend me domain verify hona chahiye
// (Domains → Verify). Bina verified domain ke mail reject ho jayega.
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || "29devs@proton.me";

export type OtpPurpose = "signup" | "reset";

export async function sendOtpEmail(to: string, code: string, purpose: OtpPurpose): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("[resend] RESEND_API_KEY missing");
    return false;
  }
  const isSignup = purpose === "signup";
  const subject = isSignup ? "Chakki Mitra: Email Verification OTP" : "Chakki Mitra: Password Reset OTP";
  const title = isSignup ? "ईमेल वेरिफिकेशन" : "पासवर्ड रीसेट";
  const html = `
<div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #eee;border-radius:12px;padding:24px">
  <h2 style="color:#ea580c">🌾 Chakki Mitra — ${title}</h2>
  <p>Namaste! Aapka 6-digit OTP:</p>
  <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;background:#fff7ed;border:2px dashed #ea580c;border-radius:10px;padding:12px;margin:16px 0">${code}</div>
  <p>Ye OTP <b>10 minute</b> me expire ho jayega. Kisi se share na karein.</p>
  <p style="color:#888;font-size:12px">This OTP expires in 10 minutes. Do not share it with anyone.</p>
</div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Chakki Mitra <${SENDER_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("[resend] send failed:", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[resend] send error:", e);
    return false;
  }
}
