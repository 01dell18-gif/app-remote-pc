import dgram from 'dgram';
import { config } from '../config';

export interface WolResult {
  mac: string;
  ip: string;
  success: boolean;
  message: string;
}

export class WolService {
  /**
   * Membersihkan string MAC address dan memvalidasi formatnya
   */
  public static cleanMac(mac: string): string {
    const cleaned = mac.replace(/[^0-9a-fA-F]/g, '');
    if (cleaned.length !== 12) {
      throw new Error(`Format MAC Address '${mac}' tidak valid. Harus 12 karakter heksadesimal.`);
    }
    return cleaned;
  }

  /**
   * Membuat buffer Magic Packet 102 byte:
   * 6 byte 0xFF + 16 kali pengulangan 6 byte MAC address
   */
  public static createMagicPacket(mac: string): Buffer {
    const clean = this.cleanMac(mac);
    const macBytes = Buffer.from(clean, 'hex');

    // Alokasikan buffer tepat 102 byte
    const packet = Buffer.alloc(102);

    // 6 byte pertama diisi 0xFF
    for (let i = 0; i < 6; i++) {
      packet[i] = 0xff;
    }

    // 16 kali pengulangan MAC address target
    for (let i = 0; i < 16; i++) {
      macBytes.copy(packet, 6 + i * 6);
    }

    return packet;
  }

  /**
   * Menghitung alamat broadcast subnet /24 dari sebuah IP address
   */
  public static calculateBroadcast(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.255`;
    }
    return '255.255.255.255';
  }

  /**
   * Mengirim Magic Packet UDP broadcast ke subnet atau IP target
   */
  public static sendPacket(
    mac: string,
    broadcastIp: string = config.wol.defaultBroadcastIp,
    port: number = config.wol.port
  ): Promise<WolResult> {
    return new Promise((resolve) => {
      try {
        const packet = this.createMagicPacket(mac);
        const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        client.on('error', (err) => {
          client.close();
          resolve({
            mac,
            ip: broadcastIp,
            success: false,
            message: `Gagal mengirim paket: ${err.message}`,
          });
        });

        // Pastikan broadcast diizinkan
        client.bind(() => {
          client.setBroadcast(true);

          client.send(packet, 0, packet.length, port, broadcastIp, (err) => {
            client.close();
            if (err) {
              resolve({
                mac,
                ip: broadcastIp,
                success: false,
                message: `Galat saat mengirim ke ${broadcastIp}:${port} - ${err.message}`,
              });
            } else {
              // Kirim juga ke port 7 untuk redundansi tinggi
              if (port === 9) {
                this.sendPacketDirect(mac, broadcastIp, 7).catch(() => {});
              }
              // Kirim juga ke general broadcast 255.255.255.255
              if (broadcastIp !== '255.255.255.255') {
                this.sendPacketDirect(mac, '255.255.255.255', 9).catch(() => {});
              }

              resolve({
                mac,
                ip: broadcastIp,
                success: true,
                message: `Magic Packet berhasil dipancarkan ke ${broadcastIp}:${port}`,
              });
            }
          });
        });
      } catch (err: any) {
        resolve({
          mac,
          ip: broadcastIp,
          success: false,
          message: err.message,
        });
      }
    });
  }

  private static sendPacketDirect(mac: string, ip: string, port: number): Promise<void> {
    return new Promise((resolve) => {
      try {
        const packet = this.createMagicPacket(mac);
        const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        client.bind(() => {
          client.setBroadcast(true);
          client.send(packet, 0, packet.length, port, ip, () => {
            client.close();
            resolve();
          });
        });
      } catch {
        resolve();
      }
    });
  }
}
