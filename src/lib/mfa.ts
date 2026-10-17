import crypto from 'crypto';
import localDb from '@/lib/db/local';
import hosxpDb from '@/lib/db/hosxp';
import { generateTotpSecret, getTotpUri, generateTotpQrCode, verifyTotpToken } from './totp';

export interface UserMfaRecord {
  id?: number;
  username: string;
  secret: string;
  is_enabled: boolean | number;
  recovery_codes?: string | null;
  created_at?: string;
  updated_at?: string;
  enabled_at?: string | null;
}

export interface MfaUserItem {
  id: number;
  username: string;
  is_enabled: boolean;
  enabled_at: string | null;
  created_at: string;
  has_recovery_codes: boolean;
  recovery_codes_count: number;
  full_name?: string;
  position?: string;
  department?: string;
  auth_source?: string;
}

let tableInitialized = false;

/**
 * Generate 8 human-readable recovery codes formatted as XXXX-XXXX
 */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/**
 * Hash a single recovery code with SHA-256 for secure storage
 */
export function hashRecoveryCode(code: string): string {
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Ensure user_mfa table exists in local DB and has all required columns
 */
export async function ensureMfaTable() {
  if (tableInitialized) return;
  try {
    await localDb.query(`
      CREATE TABLE IF NOT EXISTS user_mfa (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        secret VARCHAR(100) NOT NULL,
        is_enabled TINYINT(1) DEFAULT 0,
        recovery_codes TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        enabled_at DATETIME NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Dynamically check and add recovery_codes column if table was created in an older migration
    try {
      const [cols]: any = await localDb.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'user_mfa' 
          AND COLUMN_NAME = 'recovery_codes'
      `);
      if (!cols || cols.length === 0) {
        await localDb.query(`ALTER TABLE user_mfa ADD COLUMN recovery_codes TEXT NULL AFTER secret`);
      }
    } catch {
      // Column check/alter failure ignored gracefully
    }

    tableInitialized = true;
  } catch (err) {
    console.error('Failed to initialize user_mfa table:', err);
  }
}

/**
 * Get MFA status for a given user
 */
export async function getUserMfaStatus(username: string): Promise<{
  isEnabled: boolean;
  hasSecret: boolean;
  enabledAt?: string | null;
  hasRecoveryCodes: boolean;
}> {
  await ensureMfaTable();
  try {
    const [rows]: any = await localDb.query(
      'SELECT is_enabled, secret, enabled_at, recovery_codes FROM user_mfa WHERE username = ? LIMIT 1',
      [username.trim()]
    );

    if (rows && rows.length > 0) {
      const record = rows[0];
      let hasCodes = false;
      if (record.recovery_codes) {
        try {
          const parsed = JSON.parse(record.recovery_codes);
          hasCodes = Array.isArray(parsed) && parsed.length > 0;
        } catch {}
      }
      return {
        isEnabled: Boolean(record.is_enabled === 1 || record.is_enabled === true),
        hasSecret: Boolean(record.secret),
        enabledAt: record.enabled_at ? new Date(record.enabled_at).toISOString() : null,
        hasRecoveryCodes: hasCodes,
      };
    }
  } catch (err) {
    console.error('Error fetching user MFA status:', err);
  }

  return { isEnabled: false, hasSecret: false, enabledAt: null, hasRecoveryCodes: false };
}

/**
 * Generate a new setup secret, QR code, and backup recovery codes for a user
 */
export async function prepareUserMfaSetup(
  username: string,
  hospitalName?: string
): Promise<{
  secret: string;
  qrCodeUrl: string;
  otpauthUrl: string;
  recoveryCodes: string[];
}> {
  await ensureMfaTable();
  const secret = generateTotpSecret(20);
  const cleanUsername = username.trim();
  const issuer = `OPOH-${hospitalName || process.env.NEXT_PUBLIC_HOSPITAL_NAME || 'KALASIN'}`;
  const otpauthUrl = getTotpUri(issuer, cleanUsername, secret);
  const qrCodeUrl = await generateTotpQrCode(otpauthUrl);
  const recoveryCodes = generateRecoveryCodes(8);
  const hashedRecoveryCodes = recoveryCodes.map(c => hashRecoveryCode(c));

  // Upsert unconfirmed secret and hashed recovery codes into user_mfa
  await localDb.query(
    `INSERT INTO user_mfa (username, secret, is_enabled, recovery_codes)
     VALUES (?, ?, 0, ?)
     ON DUPLICATE KEY UPDATE 
       secret = VALUES(secret), 
       is_enabled = 0,
       recovery_codes = VALUES(recovery_codes)`,
    [cleanUsername, secret, JSON.stringify(hashedRecoveryCodes)]
  );

  return { secret, qrCodeUrl, otpauthUrl, recoveryCodes };
}

/**
 * Confirm and activate MFA with 6-digit code
 */
export async function confirmAndEnableMfa(
  username: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  await ensureMfaTable();
  const cleanUsername = username.trim();

  try {
    const [rows]: any = await localDb.query(
      'SELECT secret FROM user_mfa WHERE username = ? LIMIT 1',
      [cleanUsername]
    );

    if (!rows || rows.length === 0 || !rows[0].secret) {
      return { success: false, message: 'ไม่พบข้อมูลการตั้งค่า MFA กรุณาเริ่มต้นใหม่อีกครั้ง' };
    }

    const secret = rows[0].secret;
    const isValid = verifyTotpToken(token, secret, 1);

    if (!isValid) {
      return { success: false, message: 'รหัสยืนยัน 6 หลักไม่ถูกต้อง หรือหมดเวลา กรุณาลองใหม่อีกครั้ง' };
    }

    await localDb.query(
      'UPDATE user_mfa SET is_enabled = 1, enabled_at = NOW() WHERE username = ?',
      [cleanUsername]
    );

    return { success: true, message: 'เปิดใช้งานการยืนยันตัวตน 2 ขั้นตอน (Google Authenticator) สำเร็จ' };
  } catch (err: any) {
    console.error('Confirm MFA error:', err);
    return { success: false, message: 'เกิดข้อผิดพลาดในการยืนยันรหัส MFA' };
  }
}

/**
 * Disable MFA for a user (Self-service when logged in)
 */
export async function disableUserMfa(
  username: string
): Promise<{ success: boolean; message: string }> {
  await ensureMfaTable();
  const cleanUsername = username.trim();

  try {
    await localDb.query(
      'UPDATE user_mfa SET is_enabled = 0, secret = "", recovery_codes = NULL, enabled_at = NULL WHERE username = ?',
      [cleanUsername]
    );

    return { success: true, message: 'ปิดการใช้งานการยืนยันตัวตน 2 ขั้นตอนเรียบร้อยแล้ว' };
  } catch (err: any) {
    console.error('Disable MFA error:', err);
    return { success: false, message: 'เกิดข้อผิดพลาดในการปิด MFA' };
  }
}

/**
 * Verify user MFA during login
 */
export async function verifyUserMfaForLogin(
  username: string,
  token: string
): Promise<boolean> {
  await ensureMfaTable();
  const cleanUsername = username.trim();

  try {
    const [rows]: any = await localDb.query(
      'SELECT secret, is_enabled FROM user_mfa WHERE username = ? LIMIT 1',
      [cleanUsername]
    );

    if (!rows || rows.length === 0) return false;
    const record = rows[0];
    if (record.is_enabled !== 1) return false;

    return verifyTotpToken(token, record.secret, 1);
  } catch (err) {
    console.error('Login MFA verification error:', err);
    return false;
  }
}

/**
 * Verify and consume a recovery code for emergency login and MFA reset
 */
export async function verifyAndConsumeRecoveryCode(
  username: string,
  inputCode: string
): Promise<{ success: boolean; message: string }> {
  await ensureMfaTable();
  const cleanUsername = username.trim();
  const hashedInput = hashRecoveryCode(inputCode);

  try {
    const [rows]: any = await localDb.query(
      'SELECT is_enabled, recovery_codes FROM user_mfa WHERE username = ? LIMIT 1',
      [cleanUsername]
    );

    if (!rows || rows.length === 0) {
      return { success: false, message: 'ไม่พบข้อมูลการเปิด MFA ของผู้ใช้งานนี้' };
    }

    const record = rows[0];
    if (record.is_enabled !== 1) {
      return { success: false, message: 'บัญชีนี้ไม่ได้เปิดใช้งาน MFA' };
    }

    let codes: string[] = [];
    if (record.recovery_codes) {
      try {
        codes = JSON.parse(record.recovery_codes);
      } catch {
        codes = [];
      }
    }

    const codeIndex = codes.indexOf(hashedInput);
    if (codeIndex === -1) {
      return { success: false, message: 'รหัสกู้คืนไม่ถูกต้อง หรือถูกใช้งานไปแล้ว' };
    }

    // Automatically reset MFA so user can login without barrier and re-setup their authenticator app
    await localDb.query(
      'UPDATE user_mfa SET is_enabled = 0, secret = "", recovery_codes = NULL, enabled_at = NULL WHERE username = ?',
      [cleanUsername]
    );

    return {
      success: true,
      message: 'ยืนยันด้วยรหัสกู้คืนสำเร็จ ระบบได้รีเซ็ต MFA ให้คุณเข้าใช้งานได้ทันที กรุณาไปที่เมนูเพื่อตั้งค่า Authenticator ใหม่',
    };
  } catch (err: any) {
    console.error('Verify recovery code error:', err);
    return { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสกู้คืน' };
  }
}

/**
 * Get all users registered with MFA enriched with user info from HOSxP and Local DB
 */
export async function getAllMfaUsers(): Promise<MfaUserItem[]> {
  await ensureMfaTable();
  try {
    const [rows]: any = await localDb.query(`
      SELECT id, username, is_enabled, enabled_at, created_at, recovery_codes 
      FROM user_mfa 
      ORDER BY is_enabled DESC, enabled_at DESC, created_at DESC
    `);

    if (!rows || rows.length === 0) return [];

    const enrichedList: MfaUserItem[] = [];

    for (const r of rows) {
      let fullName = r.username;
      let position = 'ผู้ใช้งานระบบ';
      let department = '-';
      let authSource = 'Local DB';

      // 1. Try querying HOSxP for opduser / officer / doctor
      try {
        const [hosRows]: any = await hosxpDb.query(`
          SELECT 
            u.loginname,
            u.name AS opduser_name,
            u.entryposition,
            u.department,
            o.officer_name,
            o.officer_fname,
            o.officer_lname,
            d.name AS doctor_name
          FROM opduser u
          LEFT JOIN officer o ON o.officer_login_name = u.loginname
          LEFT JOIN doctor d ON d.code = u.doctorcode
          WHERE u.loginname = ?
          LIMIT 1
        `, [r.username]);

        if (hosRows && hosRows.length > 0) {
          const h = hosRows[0];
          fullName = h.doctor_name || h.officer_name || h.opduser_name || r.username;
          position = h.entryposition || (h.doctor_name ? 'แพทย์' : 'เจ้าหน้าที่');
          department = h.department || '-';
          authSource = 'HOSxP';
        }
      } catch {
        // HOSxP not reachable or error, ignore
      }

      // 2. If not found in HOSxP, try local users table
      if (fullName === r.username) {
        try {
          const [lRows]: any = await localDb.query(
            'SELECT first_name, last_name, role FROM users WHERE username = ? LIMIT 1',
            [r.username]
          );
          if (lRows && lRows.length > 0) {
            const l = lRows[0];
            fullName = `${l.first_name || ''} ${l.last_name || ''}`.trim() || r.username;
            position = l.role === 'ADMIN' ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้ใช้งาน';
          }
        } catch {
          // ignore
        }
      }

      let recoveryCodesCount = 0;
      if (r.recovery_codes) {
        try {
          const parsed = JSON.parse(r.recovery_codes);
          if (Array.isArray(parsed)) recoveryCodesCount = parsed.length;
        } catch {}
      }

      enrichedList.push({
        id: r.id,
        username: r.username,
        is_enabled: Boolean(r.is_enabled === 1 || r.is_enabled === true),
        enabled_at: r.enabled_at ? new Date(r.enabled_at).toISOString() : null,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        has_recovery_codes: recoveryCodesCount > 0,
        recovery_codes_count: recoveryCodesCount,
        full_name: fullName,
        position,
        department,
        auth_source: authSource,
      });
    }

    return enrichedList;
  } catch (err) {
    console.error('Error fetching all MFA users:', err);
    return [];
  }
}

/**
 * Reset MFA for a specific user (Admin Action)
 */
export async function adminResetUserMfa(
  targetUsername: string,
  adminUsername: string
): Promise<{ success: boolean; message: string }> {
  await ensureMfaTable();
  const cleanUsername = targetUsername.trim();

  try {
    const [rows]: any = await localDb.query(
      'SELECT is_enabled FROM user_mfa WHERE username = ? LIMIT 1',
      [cleanUsername]
    );

    if (!rows || rows.length === 0) {
      return { success: false, message: `ไม่พบข้อมูล MFA ของผู้ใช้งาน "${cleanUsername}"` };
    }

    // Completely clear MFA setup
    await localDb.query(
      'UPDATE user_mfa SET is_enabled = 0, secret = "", recovery_codes = NULL, enabled_at = NULL WHERE username = ?',
      [cleanUsername]
    );

    console.log(`[AUDIT] Admin "${adminUsername}" reset MFA for user "${cleanUsername}" at ${new Date().toISOString()}`);

    return {
      success: true,
      message: `รีเซ็ต MFA ของผู้ใช้งาน "${cleanUsername}" เรียบร้อยแล้ว ผู้ใช้งานสามารถเข้าสู่ระบบด้วยรหัสผ่านปกติได้ทันที`,
    };
  } catch (err: any) {
    console.error('Admin reset MFA error:', err);
    return { success: false, message: 'เกิดข้อผิดพลาดในการรีเซ็ต MFA' };
  }
}
