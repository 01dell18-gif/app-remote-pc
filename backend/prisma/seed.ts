import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Membersihkan data lama...');
  await prisma.auditTrail.deleteMany();
  await prisma.workstation.deleteMany();
  await prisma.laboratory.deleteMany();
  await prisma.user.deleteMany();

  console.log('[Seed] Membuat pengguna awal...');
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const instructorPassword = await bcrypt.hash('instructor123', salt);
  const assistantPassword = await bcrypt.hash('assistant123', salt);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      fullName: 'Super Administrator FYJ',
      passwordHash: adminPassword,
      role: 'SUPERADMIN',
    },
  });

  const instructor = await prisma.user.create({
    data: {
      username: 'instructor',
      fullName: 'Dr. FYJ Dosen Lab',
      passwordHash: instructorPassword,
      role: 'INSTRUCTOR',
    },
  });

  await prisma.user.create({
    data: {
      username: 'assistant',
      fullName: 'Asisten Laboratorium FYJ',
      passwordHash: assistantPassword,
      role: 'LAB_ASSISTANT',
    },
  });

  console.log('[Seed] Membuat data laboratorium...');
  const lab1 = await prisma.laboratory.create({
    data: {
      labName: 'Lab Rekayasa Jaringan & Komputer 01',
      subnetBroadcast: '192.168.1.255',
      totalCapacity: 24,
    },
  });

  const lab2 = await prisma.laboratory.create({
    data: {
      labName: 'Lab Multimedia & Komputasi Visual 02',
      subnetBroadcast: '192.168.2.255',
      totalCapacity: 20,
    },
  });

  console.log('[Seed] Membuat 12 unit workstation di Lab 01...');
  const workstationsData = [
    // Baris 1
    { hostname: 'PC-LAB-01', ip: '192.168.1.101', mac: '00:1A:2B:3C:4D:01', row: 1, col: 1, os: 'WINDOWS', mode: 'RDP_SHADOW', status: 'ONLINE' },
    { hostname: 'PC-LAB-02', ip: '192.168.1.102', mac: '00:1A:2B:3C:4D:02', row: 1, col: 2, os: 'WINDOWS', mode: 'RDP_SHADOW', status: 'ONLINE' },
    { hostname: 'PC-LAB-03', ip: '192.168.1.103', mac: '00:1A:2B:3C:4D:03', row: 1, col: 3, os: 'WINDOWS', mode: 'RDP_FULL', status: 'IN_SESSION' },
    { hostname: 'PC-LAB-04', ip: '192.168.1.104', mac: '00:1A:2B:3C:4D:04', row: 1, col: 4, os: 'LINUX', mode: 'VNC', status: 'OFFLINE' },
    // Baris 2
    { hostname: 'PC-LAB-05', ip: '192.168.1.105', mac: '00:1A:2B:3C:4D:05', row: 2, col: 1, os: 'WINDOWS', mode: 'RDP_SHADOW', status: 'ONLINE' },
    { hostname: 'PC-LAB-06', ip: '192.168.1.106', mac: '00:1A:2B:3C:4D:06', row: 2, col: 2, os: 'WINDOWS', mode: 'RDP_SHADOW', status: 'ONLINE' },
    { hostname: 'PC-LAB-07', ip: '192.168.1.107', mac: '00:1A:2B:3C:4D:07', row: 2, col: 3, os: 'WINDOWS', mode: 'RDP_FULL', status: 'OFFLINE' },
    { hostname: 'PC-LAB-08', ip: '192.168.1.108', mac: '00:1A:2B:3C:4D:08', row: 2, col: 4, os: 'WINDOWS', mode: 'RDP_SHADOW', status: 'ONLINE' },
    // Baris 3
    { hostname: 'PC-LAB-09', ip: '192.168.1.109', mac: '00:1A:2B:3C:4D:09', row: 3, col: 1, os: 'WINDOWS', mode: 'RDP_SHADOW', status: 'ONLINE' },
    { hostname: 'PC-LAB-10', ip: '192.168.1.110', mac: '00:1A:2B:3C:4D:10', row: 3, col: 2, os: 'LINUX', mode: 'VNC', status: 'ONLINE' },
    { hostname: 'PC-LAB-11', ip: '192.168.1.111', mac: '00:1A:2B:3C:4D:11', row: 3, col: 3, os: 'WINDOWS', mode: 'MOCK_AGENT', status: 'ONLINE' },
    { hostname: 'PC-LAB-12', ip: '192.168.1.112', mac: '00:1A:2B:3C:4D:12', row: 3, col: 4, os: 'WINDOWS', mode: 'RDP_SHADOW', status: 'OFFLINE' },
  ];

  for (const item of workstationsData) {
    const ws = await prisma.workstation.create({
      data: {
        labId: lab1.id,
        hostname: item.hostname,
        ipAddress: item.ip,
        macAddress: item.mac,
        gridRow: item.row,
        gridColumn: item.col,
        osFamily: item.os,
        connectionMode: item.mode as any,
        powerStatus: item.status as any,
        lastHeartbeat: item.status === 'OFFLINE' ? null : new Date(),
      },
    });

    if (item.hostname === 'PC-LAB-01') {
      await prisma.auditTrail.create({
        data: {
          userId: admin.id,
          workstationId: ws.id,
          actionName: 'INITIAL_REGISTRATION',
          actionStatus: 'SUCCESS',
          metadataJson: JSON.stringify({ ip: item.ip, mac: item.mac }),
        },
      });
    }
  }

  console.log('[Seed] Data berhasil ditanam!');
  console.log('Akun Tersedia:');
  console.log(' - Admin: admin / admin123 (SUPERADMIN)');
  console.log(' - Instructor: instructor / instructor123 (INSTRUCTOR)');
  console.log(' - Assistant: assistant / assistant123 (LAB_ASSISTANT)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
