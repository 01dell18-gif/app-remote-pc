import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditService {
  public static async log(
    userId: number,
    actionName: string,
    actionStatus: 'SUCCESS' | 'FAILED' | 'PENDING',
    workstationId?: number | null,
    metadata?: Record<string, any>
  ) {
    try {
      return await prisma.auditTrail.create({
        data: {
          userId,
          workstationId: workstationId || null,
          actionName,
          actionStatus,
          metadataJson: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (err) {
      console.error('[AuditService] Gagal mencatat audit log:', err);
    }
  }
}
