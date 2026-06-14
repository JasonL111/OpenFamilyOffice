import type { Request } from "express";
import { prisma } from "../db.js";

// Fire-and-forget audit logging. Call from any state-changing handler.
export async function audit(
  req: Request,
  action: string,
  target?: { type?: string; id?: string },
  metadata?: Record<string, unknown>,
) {
  const s = req.session;
  if (!s) return;
  try {
    await prisma.auditLog.create({
      data: {
        householdId: s.householdId,
        userId: s.sub,
        action,
        targetType: target?.type,
        targetId: target?.id,
        ip: req.ip,
        metadata: metadata as object | undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log", err);
  }
}
