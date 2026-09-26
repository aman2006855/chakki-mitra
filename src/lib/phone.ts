// Ek hi phone number ko har jagah EK hi tarike se pehchano.
// "+91 98765-43210", "09876543210", "9876543210" → teeno SAME khata.
// Client (naya khata banate waqt) aur server (duplicate check) dono yahi use karte hain.
export function normalizePhone(raw?: string | null): string {
  let d = (raw || "").replace(/\D/g, "");
  while (d.length > 10 && d.startsWith("0")) {
    d = d.replace(/^0+/, "");
  }
  if (d.length === 12 && d.startsWith("91")) {
    d = d.slice(2);
  }
  return d;
}
