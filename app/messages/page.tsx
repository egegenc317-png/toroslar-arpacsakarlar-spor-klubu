// @ts-nocheck
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getLatestMessagesByConversationIds } from "@/lib/conversation-last-message";
import { prisma } from "@/lib/prisma";
import { MessagesHub } from "@/components/messages-hub";

const SYSTEM_MESSAGE_PREFIX = "__SYSTEM__|";
const FILE_MESSAGE_PREFIX = "__FILE__|";
const FILE_JSON_PREFIX = "__FILEJSON__";
const FILE_ONCE_CONSUMED_PREFIX = "__FILE_ONCE_CONSUMED__|";
type DeliveryStatus = "seen" | "delivered" | null;

function isImageFile(name?: string | null, url?: string | null) {
  const candidate = `${name || ""} ${url || ""}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|$)/.test(candidate);
}

function formatFilePreview(body: string) {
  if (body.startsWith(FILE_ONCE_CONSUMED_PREFIX)) {
    return "Tek bakmalık Fotoğraf";
  }

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
    const name = parts[0];
    const url = parts[1];
    return isImageFile(name, url) ? "Fotoğraf" : "Dosya";
  }

  return body;
}

function formatPreview(body?: string | null) {
  if (!body) return "Sohbeti aç ve yazışmaya başla";
  if (body.startsWith(SYSTEM_MESSAGE_PREFIX)) {
    return body.slice(SYSTEM_MESSAGE_PREFIX.length).trim();
  }
  if (
    body.startsWith(FILE_JSON_PREFIX) ||
    body.startsWith(FILE_MESSAGE_PREFIX) ||
    body.startsWith(FILE_ONCE_CONSUMED_PREFIX)
  ) {
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

export default async function MessagesPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  try {
    const allConversations = await prisma.conversation.findMany({
      include: {
        listing: { select: { id: true, title: true } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    const conversations = allConversations.filter((conversation) => isConversationAccessible(conversation, session.user.id));

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
    const me = users.find((item) => item.id === session.user.id) || null;
    const mentionToken = getMentionToken(me || {});
    const conversationItems = conversations
      .map((c) => {
        try {
          const isGroup = c.conversationType === "GROUP";
          const members = (c.participantIds || []).map((id) => userMap.get(id)).filter(Boolean) as string[];
          const buyerName = getSafeParticipantName(c.buyer, c.buyerId, userMap);
          const sellerName = getSafeParticipantName(c.seller, c.sellerId, userMap);
          const peer = isGroup
            ? c.groupName || c.contextTitle || "Grup Sohbeti"
            : c.buyerId === session.user.id
              ? sellerName
              : buyerName;
          const title = isGroup ? `${members.length} üye` : c.listing?.title || c.contextTitle || "Direkt Sohbet";
          const last = lastMap.get(c.id);
          const preview = last?.body || "Sohbeti ac ve yazismaya basla";
          const lastCreatedAt = last?.createdAt ? new Date(last.createdAt) : null;
          const time = lastCreatedAt
            ? lastCreatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
            : "";
          const peerSeenAt = isGroup ? null : c.buyerId === session.user.id ? c.lastSeenBySellerAt : c.lastSeenByBuyerAt;
          const deliveryStatus: DeliveryStatus =
            !isGroup && last && lastCreatedAt && last.senderId === session.user.id
              ? peerSeenAt && new Date(peerSeenAt).getTime() >= lastCreatedAt.getTime()
                ? "seen"
                : "delivered"
              : null;
          const mySeenAt = isGroup ? (c.lastSeenByUser as Record<string, string> | null)?.[session.user.id] || null : null;
          const hasMention =
            Boolean(
              isGroup &&
              mentionToken &&
              last &&
              lastCreatedAt &&
              last.senderId !== session.user.id &&
              (!mySeenAt || lastCreatedAt.getTime() > new Date(mySeenAt).getTime()) &&
              formatPreview(last.body).includes(mentionToken)
            );

          return {
            id: c.id,
            peer,
            title,
            preview: formatPreview(preview),
            time,
            deliveryStatus,
            isGroup,
            image: c.groupImage || null,
            hasMention,
            sortDate: lastCreatedAt ? lastCreatedAt.getTime() : new Date(c.createdAt).getTime()
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
      });

    return <MessagesHub currentUserId={session.user.id} conversations={conversationItems} />;
  } catch (error) {
    console.error("messages page failed", error);
    return <MessagesHub currentUserId={session.user.id} conversations={[]} />;
  }
}

