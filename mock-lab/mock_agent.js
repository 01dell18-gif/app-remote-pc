/**
 * FYJ Channel Remote - Mock Agent Simulator (Node.js version)
 * Mendengarkan paket Wake-on-LAN (UDP port 7 dan 9) serta probe TCP heartbeat.
 */

const dgram = require('dgram');
const net = require('net');

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

  server.on('error', (err) => {
    // Ignore if port in use
  });

  server.listen(port, () => {
    console.log(`[Mock Agent] TCP Heartbeat responder aktif pada port ${port}.`);
  });
}

console.log('='.repeat(60));
console.log('  FYJ Channel Remote - Mock Agent Simulator (Node.js)');
console.log('='.repeat(60));

createWolListener(9);
createWolListener(7);
createTcpHeartbeat(5901);
