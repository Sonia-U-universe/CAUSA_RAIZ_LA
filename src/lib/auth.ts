import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
export const configured = () =>
  Boolean(
    process.env.DATABASE_URL &&
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.ALLOWED_EMAIL,
  );
export function authServer() {
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
}
export async function currentUser() {
  if (!configured()) return null;
  const { data } = await authServer().getSession();
  const user = data?.user;
  if (
    user &&
    (!user.emailVerified ||
      user.email.toLowerCase() !==
        process.env.ALLOWED_EMAIL!.trim().toLowerCase())
  )
    throw Error("ACCESS_DENIED");
  return user &&
    user.emailVerified &&
    user.email.toLowerCase() === process.env.ALLOWED_EMAIL!.trim().toLowerCase()
    ? user
    : null;
}
