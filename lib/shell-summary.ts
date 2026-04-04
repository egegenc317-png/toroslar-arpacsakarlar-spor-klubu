/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { getLatestMessagesByConversationIds } from "@/lib/conversation-last-message";
import { prisma } from "@/lib/prisma";

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

export async function getShellSummaryForUser(userId: string) {
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    let unreadMessageCount = 0;
    let unreadBoardCount = 0;

    const allConversations = await prisma.conversation.findMany();
    const myConversations = allConversations.filter((conversation: any) => isConversationAccessible(conversation, userId));

    const latestMessageMap = await getLatestMessagesByConversationIds(myConversations.map((conversation: any) => conversation.id));

    unreadMessageCount = myConversations.reduce((sum: number, conversation: any) => {
      try {
        const last = latestMessageMap.get(conversation.id);
        if (!last) return sum;
        const mySeenAt =
          conversation.conversationType === "GROUP"
            ? (conversation.lastSeenByUser as Record<string, string> | null)?.[userId] || null
            : conversation.buyerId === userId
              ? conversation.lastSeenByBuyerAt
              : conversation.lastSeenBySellerAt;
        const unread = last.senderId !== userId && (!mySeenAt || new Date(last.createdAt).getTime() > new Date(mySeenAt).getTime());
        return sum + (unread ? 1 : 0);
      } catch {
        return sum;
      }
    }, 0);

    if (dbUser?.neighborhoodId) {
      const newBoardPosts = await prisma.boardPost.findMany({
        where: { neighborhoodId: dbUser.neighborhoodId },
        orderBy: { createdAt: "desc" },
        take: 20
      });
      const seenIds = new Set(dbUser.seenBoardPostIds || []);
      unreadBoardCount = newBoardPosts.filter((post: any) => post.userId !== userId && !seenIds.has(post.id)).length;
    }

    return { unreadCount: unreadMessageCount + unreadBoardCount };
  } catch {
    return { unreadCount: 0 };
  }
}
