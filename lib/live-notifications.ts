/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { getLatestMessagesByConversationIds } from "@/lib/conversation-last-message";
import { prisma } from "@/lib/prisma";

const SYSTEM_MESSAGE_PREFIX = "__SYSTEM__|";

function stripSpecialMessage(body: string) {
  if (body.startsWith(SYSTEM_MESSAGE_PREFIX)) {
    return body.slice(SYSTEM_MESSAGE_PREFIX.length).trim();
  }
  return body;
}

function getMentionToken(me: { username?: string | null; name?: string | null }) {
  if (me.username) return `@${me.username}`;
  if (me.name) return `@${me.name.replace(/\s+/g, "").toLowerCase()}`;
  return null;
}

function getSafeParticipantName(
  participant: { name?: string | null } | null | undefined,
  participantId: string | null | undefined,
  userMap: Map<string, string>
) {
  if (participant?.name) return participant.name;
  if (participantId) {
    const mapped = userMap.get(participantId);
    if (mapped) return mapped;
  }
  return "Bilinmeyen kullanıcı";
}

function isConversationAccessible(
  conversation: {
    conversationType?: string | null;
    participantIds?: string[] | null;
    buyerId?: string | null;
    sellerId?: string | null;
  },
  userId: string
) {
  if (conversation.conversationType === "GROUP") {
    return (conversation.participantIds || []).includes(userId);
  }

  return conversation.buyerId === userId || conversation.sellerId === userId;
}

export async function getLiveNotificationsForUser(userId: string) {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) {
    return { status: 404, body: { error: "Kullanıcı bulunamadı" } };
  }

  const [allConversations, boardPosts] = await Promise.all([
    prisma.conversation.findMany({
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    me.neighborhoodId
      ? prisma.boardPost.findMany({
          where: { neighborhoodId: me.neighborhoodId },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20
        })
      : Promise.resolve([])
  ]);
  const conversations = allConversations.filter((conversation) => isConversationAccessible(conversation, userId));
  const relatedUserIds = Array.from(
    new Set(
      conversations.flatMap((conversation) => [
        conversation.buyerId,
        conversation.sellerId,
        ...(conversation.participantIds || [])
      ])
    )
  ).filter(Boolean);
  const relatedUsers = relatedUserIds.length
    ? ((await prisma.user.findMany({ where: { id: { in: relatedUserIds } } })) as Array<{ id: string; name: string }>)
    : [];
  const userMap = new Map(relatedUsers.map((item) => [item.id, item.name]));

  const mentionToken = getMentionToken(me);
  const latestMessageMap = await getLatestMessagesByConversationIds(conversations.map((conversation: any) => conversation.id));
  const messageAlertsRaw = conversations.map((conversation: any) => {
    try {
      const last = latestMessageMap.get(conversation.id);
      if (!last) return null;

      const mySeenAt =
        conversation.conversationType === "GROUP"
          ? (conversation.lastSeenByUser as Record<string, string> | null)?.[userId] || null
          : conversation.buyerId === userId
            ? conversation.lastSeenByBuyerAt
            : conversation.lastSeenBySellerAt;

      const isUnread =
        last.senderId !== userId &&
        (!mySeenAt || new Date(last.createdAt).getTime() > new Date(mySeenAt).getTime());
      if (!isUnread) return null;

      const buyerName = getSafeParticipantName(conversation.buyer, conversation.buyerId, userMap);
      const sellerName = getSafeParticipantName(conversation.seller, conversation.sellerId, userMap);
      const peer =
        conversation.conversationType === "GROUP"
          ? conversation.groupName || conversation.contextTitle || "Grup Sohbeti"
          : conversation.buyerId === userId
            ? sellerName
            : buyerName;

      return {
        id: conversation.id,
        peer,
        body: stripSpecialMessage(last.body),
        createdAt: last.createdAt,
        isGroup: conversation.conversationType === "GROUP",
        senderName: last.senderName || "Bir kullanıcı",
        isMention: Boolean(
          conversation.conversationType === "GROUP" &&
          mentionToken &&
          stripSpecialMessage(last.body).includes(mentionToken)
        )
      };
    } catch {
      return null;
    }
  });

  const lastSeen = me.lastBoardSeenAt ? new Date(me.lastBoardSeenAt).getTime() : 0;
  const boardAlerts = boardPosts
    .filter((post: any) => post.userId !== userId && new Date(post.createdAt).getTime() > lastSeen)
    .map((post: any) => ({
      id: post.id,
      title: post.title,
      userName: post.user.name
    }));

  return {
    status: 200,
    body: {
      messageAlerts: messageAlertsRaw.filter(Boolean),
      boardAlerts
    }
  };
}
