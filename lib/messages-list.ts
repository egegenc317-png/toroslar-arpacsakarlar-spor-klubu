// @ts-nocheck
import { getLatestMessagesByConversationIds } from "@/lib/conversation-last-message";
import { prisma } from "@/lib/prisma";

const SYSTEM_MESSAGE_PREFIX = "__SYSTEM__|";
const FILE_MESSAGE_PREFIX = "__FILE__|";
const FILE_JSON_PREFIX = "__FILEJSON__";
const FILE_ONCE_CONSUMED_PREFIX = "__FILE_ONCE_CONSUMED__|";

export type ConversationListItem = {
  id: string;
  peer: string;
  title: string;
  preview: string;
  time: string;
  lastActivityAt?: string;
  deliveryStatus: "delivered" | "seen" | null;
  isGroup?: boolean;
  isPinned?: boolean;
  image?: string | null;
  hasMention?: boolean;
  isUnread?: boolean;
  memberCount?: number;
  lastSenderName?: string | null;
};

function isImageFile(name?: string | null, url?: string | null) {
  const candidate = `${name || ""} ${url || ""}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|$)/.test(candidate);
}

function formatFilePreview(body: string) {
  if (body.startsWith(FILE_ONCE_CONSUMED_PREFIX)) return "Tek bakmalık Fotoğraf";

  if (body.startsWith(FILE_JSON_PREFIX)) {
    try {
      const payload = JSON.parse(body.slice(FILE_JSON_PREFIX.length));
      if (payload?.viewOnce) return "Tek bakmalık Fotoğraf";
      return isImageFile(payload?.name, payload?.url) ? "Fotoğraf" : "Dosya";
    } catch {
      return "Dosya";
    }
  }

  if (body.startsWith(FILE_MESSAGE_PREFIX)) {
    const parts = body.slice(FILE_MESSAGE_PREFIX.length).split("|");
    return isImageFile(parts[0], parts[1]) ? "Fotoğraf" : "Dosya";
  }

  return body;
}

function formatPreview(body?: string | null) {
  if (!body) return "Sohbeti aç ve yazışmaya başla";
  if (body.startsWith(SYSTEM_MESSAGE_PREFIX)) return body.slice(SYSTEM_MESSAGE_PREFIX.length).trim();
  if (body.startsWith(FILE_JSON_PREFIX) || body.startsWith(FILE_MESSAGE_PREFIX) || body.startsWith(FILE_ONCE_CONSUMED_PREFIX)) {
    return formatFilePreview(body);
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
  if (participantId) return userMap.get(participantId) || "Bilinmeyen kullanıcı";
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

export async function getConversationListItems(userId: string) {
  const allConversations = await prisma.conversation.findMany({
    include: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const conversations = allConversations.filter((conversation) => isConversationAccessible(conversation, userId));
  const lastMap = await getLatestMessagesByConversationIds(conversations.map((conversation) => conversation.id));
  const relatedUserIds = Array.from(
    new Set(
      conversations.flatMap((conversation) => [
        conversation.buyerId,
        conversation.sellerId,
        ...(conversation.participantIds || [])
      ])
    )
  ).filter(Boolean);

  const users = (await prisma.user.findMany({
    where: { id: { in: relatedUserIds } }
  })) as Array<{ id: string; name: string; username?: string | null }>;

  const userMap = new Map(users.map((item) => [item.id, item.name]));
  const me = users.find((item) => item.id === userId) || null;
  const mentionToken = getMentionToken(me || {});

  return conversations
    .map((conversation) => {
      try {
        const isGroup = conversation.conversationType === "GROUP";
        const members = (conversation.participantIds || []).map((id) => userMap.get(id)).filter(Boolean) as string[];
        const buyerName = getSafeParticipantName(conversation.buyer, conversation.buyerId, userMap);
        const sellerName = getSafeParticipantName(conversation.seller, conversation.sellerId, userMap);
        const peer = isGroup
          ? conversation.groupName || conversation.contextTitle || "Grup Sohbeti"
          : conversation.buyerId === userId
            ? sellerName
            : buyerName;
        const title = isGroup ? `${members.length} üye` : conversation.listing?.title || conversation.contextTitle || "Direkt Sohbet";
        const last = lastMap.get(conversation.id);
        const preview = formatPreview(last?.body || "Sohbeti aç ve yazışmaya başla");
        const lastCreatedAt = last?.createdAt ? new Date(last.createdAt) : null;
        const peerSeenAt = isGroup ? null : conversation.buyerId === userId ? conversation.lastSeenBySellerAt : conversation.lastSeenByBuyerAt;
        const mySeenAt = isGroup
          ? (conversation.lastSeenByUser as Record<string, string> | null)?.[userId] || null
          : conversation.buyerId === userId
            ? conversation.lastSeenByBuyerAt
            : conversation.lastSeenBySellerAt;
        const isUnread = Boolean(
          last &&
          lastCreatedAt &&
          last.senderId !== userId &&
          (!mySeenAt || lastCreatedAt.getTime() > new Date(mySeenAt).getTime())
        );

        return {
          id: conversation.id,
          peer,
          title,
          preview,
          time: lastCreatedAt ? lastCreatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "",
          lastActivityAt: lastCreatedAt ? lastCreatedAt.toISOString() : new Date(conversation.createdAt).toISOString(),
          deliveryStatus:
            !isGroup && last && lastCreatedAt && last.senderId === userId
              ? peerSeenAt && new Date(peerSeenAt).getTime() >= lastCreatedAt.getTime()
                ? "seen"
                : "delivered"
              : null,
          isGroup,
          isPinned: Boolean(conversation.pinnedMessageId),
          image: conversation.groupImage || null,
          isUnread,
          memberCount: members.length || (isGroup ? 0 : 2),
          lastSenderName: last?.senderName || null,
          hasMention:
            Boolean(
              isGroup &&
              mentionToken &&
              last &&
              lastCreatedAt &&
              last.senderId !== userId &&
              (!mySeenAt || lastCreatedAt.getTime() > new Date(mySeenAt).getTime()) &&
              preview.includes(mentionToken)
            ),
          sortDate: lastCreatedAt ? lastCreatedAt.getTime() : new Date(conversation.createdAt).getTime()
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.sortDate - a.sortDate)
    .map((item) => {
      delete item.sortDate;
      return item;
    }) as ConversationListItem[];
}
