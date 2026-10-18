import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Secret key for JWT signing. Must be at least 32 characters in production.
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_environment';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  id: number;
  cid: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  position?: string;
  role: string;
  hospital_code: string;
  [key: string]: any;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Default 1 day
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
    return null;
  }
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    return decrypt(sessionToken);
  } catch {
    return null;
  }
}

/**
 * Short-lived JWT token for 2FA verification step during login (5 minutes)
 */
export async function encryptMfaToken(payload: SessionPayload) {
  return new SignJWT({ ...payload, isMfaPreAuth: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(encodedSecret);
}

/**
 * Determines whether cookies should have the Secure flag.
 * - If COOKIE_SECURE is explicitly 'true', returns true.
 * - If COOKIE_SECURE is explicitly 'false', returns false (allowing plain HTTP on hospital LAN).
 * - Otherwise defaults to true only in production.
 */
export function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export async function decryptMfaToken(token: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedSecret, {
      algorithms: ['HS256'],
    });
    if (!payload.isMfaPreAuth) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Universal Hospital Admin Detection Engine
 * Determines Administrator rights across any Thai hospital using HOSxP V3, V4 XE, PCU, or Local DB
 */
export function isUserAdmin(user: SessionPayload | null | undefined): boolean {
  if (!user) return false;

  // 1. Direct Role Check (Case-insensitive)
  const roleUpper = String(user.role || '').trim().toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRATOR' || roleUpper === 'SUPERADMIN') {
    return true;
  }

  // 2. Standard Hospital Administrative Usernames (Universal across hospitals)
  const usernameLower = String(user.username || '').trim().toLowerCase();
  const defaultAdminUsernames = [
    'admin', 'administrator', 'sa', 'bmsadmin', 'root', 'ict', 'it', 'hosxp', 'opoh'
  ];
  if (defaultAdminUsernames.includes(usernameLower)) {
    return true;
  }

  // 3. Custom Configured Admin Usernames via .env (For hospital-specific usernames like 'witsanu.ict', 'kml_admin')
  const envAdminUsers = (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (envAdminUsers.includes(usernameLower)) {
    return true;
  }

  // 4. HOSxP Group Name Check (Universal keywords for IT/Admin units)
  const groupName = String(user.groupname || '').toLowerCase();
  const adminGroupKeywords = [
    'admin', 'administrator', 'ผู้ดูแลระบบ', 'ศูนย์คอม', 'สารสนเทศ', 'ict', 'it', 'computer', 'ระบบสารสนเทศ'
  ];
  if (adminGroupKeywords.some((kw) => groupName.includes(kw))) {
    return true;
  }

  // 5. HOSxP Access Right Check
  const accessRight = String(user.accessright || '').toUpperCase();
  if (accessRight.includes('[ADMIN]') || accessRight.includes('ADMIN') || accessRight.includes('SUPERUSER')) {
    return true;
  }

  // 6. Hospital Position / Department Check (IT officers in hospital)
  const position = String(user.position || '').toLowerCase();
  const department = String(user.department || '').toLowerCase();
  const itPositionKeywords = [
    'นักวิชาการคอมพิวเตอร์', 'เจ้าพนักงานคอมพิวเตอร์', 'คอมพิวเตอร์', 'สารสนเทศ', 'เทคโนโลยีสารสนเทศ'
  ];
  if (itPositionKeywords.some((kw) => position.includes(kw) || department.includes(kw))) {
    return true;
  }

  return false;
}
