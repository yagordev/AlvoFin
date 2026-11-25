import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./prisma";

export const SESSION_COOKIE_NAME = "alvofin_session";

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "alvofin-super-secret-jwt-key-change-in-production-2026";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(
  payload: SessionPayload,
  rememberMe = true,
): Promise<string> {
  const expirationTime = rememberMe ? "30d" : "24h";
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        userId: payload.userId,
        name: payload.name,
        email: payload.email,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSessionCookie(
  payload: SessionPayload,
  rememberMe = true,
) {
  const token = await signSessionToken(payload, rememberMe);
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Garante que o usuário está autenticado e existe no banco de dados.
 * Caso contrário, redireciona para /login (RNF002 / RNF003 / RN033).
 */
export async function requireAuthUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      redirect("/login");
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
    };
  } catch {
    // Caso o banco esteja temporariamente indisponível, retorna a sessão assinada
    return session;
  }
}
