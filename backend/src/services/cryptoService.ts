import crypto from 'crypto';
import { config } from '../config';

export interface RemoteConnectionPayload {
  connection: {
    type: 'rdp' | 'vnc';
    settings: {
      hostname: string;
      port: number;
      security?: string;
      'ignore-cert'?: boolean;
      username?: string;
      password?: string;
      width?: number;
      height?: number;
      dpi?: number;
      'resize-method'?: string;
      workstationId?: number;
      hostnameTarget?: string;
    };
  };
  expires: number; // Unix timestamp ms
}

export class CryptoService {
  private static getKey(): Buffer {
    let key = config.cypherKey;
    if (key.length < 32) {
      key = key.padEnd(32, '0');
    } else if (key.length > 32) {
      key = key.substring(0, 32);
    }
    return Buffer.from(key, 'utf8');
  }

  /**
   * Mengenkripsi payload JSON koneksi menjadi token URL-safe Base64
   */
  public static encryptToken(payload: RemoteConnectionPayload): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const jsonStr = JSON.stringify(payload);
    let encrypted = cipher.update(jsonStr, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Gabungkan IV (16 byte) + Data Terenkripsi
    const combined = Buffer.concat([iv, encrypted]);

    // Format URL-safe Base64
    return combined
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Mendekripsi token URL-safe Base64 dan memvalidasi masa berlaku
   */
  public static decryptToken(tokenStr: string): RemoteConnectionPayload | null {
    try {
      // Kembalikan dari URL-safe base64 ke base64 standar
      let base64 = tokenStr.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      const combined = Buffer.from(base64, 'base64');
      if (combined.length < 17) {
        return null;
      }

      const iv = combined.subarray(0, 16);
      const encryptedData = combined.subarray(16);

      const key = this.getKey();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const payload: RemoteConnectionPayload = JSON.parse(decrypted.toString('utf8'));

      // Validasi masa berlaku (ephemeral token)
      if (payload.expires && Date.now() > payload.expires) {
        console.warn('[CryptoService] Token kedaluwarsa!');
        return null;
      }

      return payload;
    } catch (err) {
      console.error('[CryptoService] Galat saat mendekripsi token:', err);
      return null;
    }
  }
}
