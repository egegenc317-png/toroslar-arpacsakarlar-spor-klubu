// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { isModeratorRole } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !isModeratorRole(session.user.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation) {
    return NextResponse.json({ error: "Sohbet bulunamadı" }, { status: 404 });
  }

  await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
  await prisma.conversation.delete({ where: { id: conversation.id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "ADMIN_DELETE_CONVERSATION",
    targetType: "CONVERSATION",
    targetId: conversation.id,
    meta: { conversationType: conversation.conversationType }
  });

  return NextResponse.redirect(new URL("/admin/chats", req.url));
}

