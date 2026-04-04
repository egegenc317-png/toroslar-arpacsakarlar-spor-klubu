// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getConversationMessagesSnapshot } from "@/lib/conversation-messages";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { messageCreateSchema } from "@/lib/validations";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const result = await getConversationMessagesSnapshot(params.id, session.user.id);
  return NextResponse.json(result.body, { status: result.status });
}

async function canAccess(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (conversation.conversationType === "GROUP") {
    if (!(conversation.participantIds || []).includes(userId)) return null;
    return conversation;
  }
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) return null;
  return conversation;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkişiz" }, { status: 401 });

  const conversation = await canAccess(params.id, session.user.id);
  if (!conversation) return NextResponse.json({ error: "Erisim yok" }, { status: 403 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0]?.trim() || "local";
  const rateLimit = await checkRateLimit(`message:${session.user.id}:${conversation.id}:${ip}`, {
    windowMs: 60 * 1000,
    maxAttempts: 40
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Çok hızlı mesaj gönderiyorsun. Lütfen kısa süre sonra tekrar dene." }, { status: 429 });
  }

  const json = await req.json();
  const parsed = messageCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const msg = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: session.user.id, body: parsed.data.body }
  });

  return NextResponse.json(
    {
      item: {
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        sender: {
          id: session.user.id,
          name: session.user.name || "Sen"
        }
      }
    },
    { status: 201 }
  );
}
