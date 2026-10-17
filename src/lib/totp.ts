import crypto from 'crypto';
import QRCode from 'qrcode';

// Base32 Alphabet RFC 4648
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 secret for Google Authenticator (default 20 bytes -> 32 characters)
 */
export function generateTotpSecret(bytes = 20): string {
  const randomBytes = crypto.randomBytes(bytes);
  let bits = '';
  for (let i = 0; i < randomBytes.length; i++) {
    bits += randomBytes[i].toString(2).padStart(8, '0');
  }

  let secret = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    const index = parseInt(chunk, 2);
    secret += BASE32_ALPHABET[index];
  }

  return secret;
}

/**
 * Decode Base32 string into Buffer
 */
function base32ToBuffer(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const byte = bits.substring(i, i + 8);
    bytes.push(parseInt(byte, 2));
  }

  return Buffer.from(bytes);
}

/**
 * Generate OTP Token for a specific counter / time step
 */
function generateTokenForCounter(secretBuffer: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  // Write counter as 64-bit big-endian integer
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP code from Google Authenticator
 * @param token 6-digit user input
 * @param secret Base32 secret string
 * @param window Allowed time-step drift (default 1 = +/- 30 seconds)
 */
export function verifyTotpToken(token: string, secret: string, window = 1): boolean {
  if (!token || !secret) return false;
  const cleanToken = token.trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  try {
    const secretBuffer = base32ToBuffer(secret);
    const currentCounter = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const generated = generateTokenForCounter(secretBuffer, currentCounter + i);
      if (generated === cleanToken) {
        return true;
      }
    }
  } catch (err) {
    console.error('TOTP verification error:', err);
    return false;
  }

  return false;
}

/**
 * Format standard otpauth:// URL for Google Authenticator
 */
export function getTotpUri(issuer: string, account: string, secret: string): string {
  const cleanIssuer = issuer.replace(/[:\/]/g, '_');
  const cleanAccount = account.replace(/[:\/]/g, '_');
  return `otpauth://totp/${encodeURIComponent(cleanIssuer)}:${encodeURIComponent(cleanAccount)}?secret=${secret}&issuer=${encodeURIComponent(cleanIssuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate QR code data URL (PNG format)
 */
export async function generateTotpQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    width: 240,
    margin: 1.5,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
