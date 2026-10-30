import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { GuacTunnel } from './websocket/guacTunnel';
import { HeartbeatService } from './services/heartbeatService';

// Import Routes
import authRoutes from './routes/authRoutes';
import labRoutes from './routes/labRoutes';
import workstationRoutes from './routes/workstationRoutes';
import powerRoutes from './routes/powerRoutes';
import classroomRoutes from './routes/classroomRoutes';
import remoteRoutes from './routes/remoteRoutes';
import auditRoutes from './routes/auditRoutes';
import executionRoutes from './routes/executionRoutes';

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rute Pemeriksaan Kesehatan Server
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'FYJ Channel Remote Backend',
    timestamp: new Date().toISOString(),
    guacdTarget: `${config.guacd.host}:${config.guacd.port}`,
    nodeVersion: process.version,
  });
});

// Pendaftaran Endpoint REST API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/labs', labRoutes);
app.use('/api/v1/workstations', workstationRoutes);
app.use('/api/v1/power', powerRoutes);
app.use('/api/v1/classroom', classroomRoutes);
app.use('/api/v1/remote', remoteRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/execution', executionRoutes);

// Buat Server HTTP dan pasang WebSocket Gateway
const server = http.createServer(app);
new GuacTunnel(server);

server.listen(config.port, () => {
  console.log('='.repeat(65));
  console.log(`  FYJ Channel Remote - Gateway & Application Server Aktif`);
  console.log(`  URL Layanan REST API : http://localhost:${config.port}/api/v1`);
  console.log(`  WebSocket Gateway     : ws://localhost:${config.port}/api/v1/tunnel/remote`);
  console.log(`  Target Apache guacd   : ${config.guacd.host}:${config.guacd.port}`);
  console.log('='.repeat(65));

  // Jalankan pemantauan heartbeat latar belakang
  HeartbeatService.start();
});

process.on('SIGINT', () => {
  HeartbeatService.stop();
  server.close(() => {
    console.log('[Server] Server dimatikan secara tertib.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  HeartbeatService.stop();
  server.close(() => {
    process.exit(0);
  });
});
