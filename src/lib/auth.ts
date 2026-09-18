import { cookies } from "next/headers";

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export function setSessionCookie(userId: number, name: string) {
  return JSON.stringify({ userId, name });
}
