import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-super-secret-key-change-in-prod-32bytes!';

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Crea un token seguro firmado con HMAC-SHA256
 */
export function createToken(userId: string, email: string, expiresInHours = 72): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    userId,
    email,
    iat: now,
    exp: now + expiresInHours * 3600,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verifica y descifra el token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Expirado
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Comparación de strings en tiempo constante para evitar ataques de temporización
 */
export function safeCompareStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'));
}

