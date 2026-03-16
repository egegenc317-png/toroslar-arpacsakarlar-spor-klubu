// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { isModeratorRole } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
  const session = await auth();
  if (!session || !isModeratorRole(session.user.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const message = await prisma.message.findUnique({ where: { id: params.messageId } });
  if (!message || message.conversationId !== params.id) {
    return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 });
  }

  await prisma.message.delete({ where: { id: message.id } });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "ADMIN_DELETE_MESSAGE",
    targetType: "MESSAGE",
    targetId: message.id,
    meta: { conversationId: params.id }
  });

  return NextResponse.redirect(new URL(`/admin/chats/${params.id}`, req.url));
}

