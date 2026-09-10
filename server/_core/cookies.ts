import type { Request } from "express";
import type { CookieOptions } from "express";

/**
 * Build the options object for the session cookie.
 * Uses __Host- prefix rules when the origin is HTTPS.
 */
export function getSessionCookieOptions(req: Request): CookieOptions {
  const isSecure = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? "none" : "lax",
    path: "/",
  };
}
