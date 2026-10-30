/**
 * FYJ Channel Remote - Mock Agent & Resident Command Listener (Node.js version)
 * Mendengarkan paket Wake-on-LAN (UDP port 7 dan 9), probe TCP heartbeat,
 * serta instruksi pembukaan dan penutupan aplikasi jarak jauh.
 */

const dgram = require('dgram');
const net = require('net');
const http = require('http');
const { exec } = require('child_process');

function createWolListener(port) {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  socket.on('error', (err) => {
    console.error(`[Mock Agent] Galat socket UDP ${port}:`, err.message);
    socket.close();
  });

  socket.on('message', (msg, rinfo) => {
    // Magic packet: 6 bytes of 0xFF followed by 16 repetitions of the target MAC
    if (msg.length >= 102 && msg.subarray(0, 6).every((b) => b === 0xff)) {
      const macParts = [];
      for (let i = 6; i < 12; i++) {
        macParts.push(msg[i].toString(16).padStart(2, '0'));
      }
      const mac = macParts.join(':').toUpperCase();
      console.log(
        `\x1b[32m[Mock Agent] Magic Packet diterima dari ${rinfo.address}:${rinfo.port} untuk MAC: ${mac}! Status -> BERHASIL BANGUN.\x1b[0m`
      );
    }
  });

  socket.on('listening', () => {
    const address = socket.address();
    console.log(`[Mock Agent] Mendengarkan paket Wake-on-LAN pada port UDP ${address.port}...`);
  });

  socket.bind(port);
  return socket;
}

function createTcpHeartbeat(port) {
  const server = net.createServer((socket) => {
    socket.end(); // Langsung tutup koneksi setelah menerima probe
  });

  server.on('error', () => {});

  server.listen(port, () => {
    console.log(`[Mock Agent] TCP Heartbeat responder aktif pada port ${port}.`);
  });
}

function createCommandServer(port = 5902) {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (req.url === '/launch') {
            console.log(`\x1b[36m[Mock Agent] Eksekusi Aplikasi: "${data.appPath}" dengan argumen: "${data.args || ''}"\x1b[0m`);
            exec(`start "" "${data.appPath}" ${data.args || ''}`, { windowsHide: true }, (err) => {
              if (err) console.error('[Mock Agent] Galat launch:', err.message);
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Aplikasi dijalankan' }));
          } else if (req.url === '/terminate') {
            console.log(`\x1b[31m[Mock Agent] Hentikan Proses Aplikasi: "${data.processName}"\x1b[0m`);
            exec(`taskkill /F /IM "${data.processName}" /T`, { windowsHide: true }, (err) => {
              if (err) console.error('[Mock Agent] Galat terminate:', err.message);
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Proses dihentikan' }));
          } else if (req.url === '/restrictions' || req.url === '/api/restrictions') {
            const { type, target, action } = data;
            console.log(`\x1b[35m[Mock Agent] Pembatasan ${type}: "${target}" -> ${action}\x1b[0m`);
            if (action === 'BLOCK') {
              if (type === 'APP') {
                exec(`taskkill /F /IM "${target}" /T`, { windowsHide: true }, () => {});
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Pembatasan ${target} ${action}` }));
          }
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ agent: 'FYJ Channel Resident Agent', status: 'ONLINE' }));
    }
  });

  server.listen(port, () => {
    console.log(`[Mock Agent] Remote Command Listener aktif pada HTTP port ${port} (Buka & Tutup Aplikasi).`);
  });
}

console.log('='.repeat(65));
console.log('  FYJ Channel Remote - Mock Agent & Command Runner (Node.js)');
console.log('='.repeat(65));

createWolListener(9);
createWolListener(7);
createTcpHeartbeat(5901);
createCommandServer(5902);
