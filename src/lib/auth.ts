import { SignJWT, jwtVerify } from 'jose';

// Secret key for JWT signing. Must be at least 32 characters in production.
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_environment';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  id: number;
  cid: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  hospital_code: string;
  [key: string]: any;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Default 1 day, can be configured
    .sign(encodedSecret);
}

export async function decrypt(session: string | undefined = '') {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, encodedSecret, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    // console.log('Failed to verify session');
    return null;
  }
}
