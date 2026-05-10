// @ts-nocheck
import { prisma } from "@/lib/prisma";

type LatestMessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: Date | string;
  senderName?: string | null;
};

export async function getLatestMessagesByConversationIds(conversationIds: string[]) {
  if (!conversationIds.length) return new Map<string, LatestMessageRow>();

  const rows = (await prisma.message.findMany({
    where: {
      conversationId: {
        in: conversationIds
      }
    },
    include: {
      sender: true
    },
    orderBy: [{ createdAt: "desc" }]
  })) as Array<
    LatestMessageRow & {
      sender?: {
        name?: string | null;
      } | null;
    }
  >;

  const latestByConversation = new Map<string, LatestMessageRow>();

  for (const row of rows) {
    if (latestByConversation.has(row.conversationId)) continue;

    latestByConversation.set(row.conversationId, {
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      body: row.body,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      senderName: row.sender?.name || row.senderName || null
    });

    if (latestByConversation.size === conversationIds.length) {
      break;
    }
  }

  return latestByConversation;
}
