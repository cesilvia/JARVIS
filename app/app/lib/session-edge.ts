import { jwtVerify } from "jose";

export const SESSION_COOKIE = "jarvis-session";

export async function verifySessionEdge(token: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}
