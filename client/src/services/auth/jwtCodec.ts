import type { JWT, JWTDecodeParams, JWTEncodeParams } from "next-auth/jwt";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const DEFAULT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();

function toSecretKey(secret: string | Buffer): Uint8Array {
  const value = typeof secret === "string" ? secret : secret.toString("utf-8");
  return encoder.encode(value);
}

export async function encodeSharedJwt({
  token,
  secret,
  maxAge,
}: JWTEncodeParams): Promise<string> {
  if (!token) return "";

  const now = Math.floor(Date.now() / 1000);
  const payload = { ...(token as JWT) } as JWTPayload;
  const exp = now + (maxAge ?? DEFAULT_MAX_AGE_SECONDS);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(toSecretKey(secret));
}

export async function decodeSharedJwt({
  token,
  secret,
}: JWTDecodeParams): Promise<JWT | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, toSecretKey(secret), {
      algorithms: ["HS256"],
    });
    return payload as unknown as JWT;
  } catch {
    return null;
  }
}

