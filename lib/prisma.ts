// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";

import { db } from "@/lib/prisma-client";

type ClosedHour = {
  day: number;
  mode: "FULL_DAY" | "RANGE";
  start?: string;
  end?: string;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeUser(user: any) {
  if (!user) return null;
  return {
    ...user,
    businessClosedHours: parseJson<ClosedHour[] | null>(user.businessClosedHours, null),
    seenBoardPostIds: parseJson<string[]>(user.seenBoardPostIds, [])
  };
}

function normalizeNeighborhood(neighborhood: any) {
  if (!neighborhood) return null;
  return neighborhood;
}

function normalizeListing(listing: any) {
  if (!listing) return null;
  return {
    ...listing,
    user: normalizeUser(listing.user),
    neighborhood: normalizeNeighborhood(listing.neighborhood)
  };
}

function normalizeConversation(conversation: any) {
  if (!conversation) return null;
  return {
    ...conversation,
    participantIds: parseJson<string[] | null>(conversation.participantIds, null),
    adminIds: parseJson<string[] | null>(conversation.adminIds, null),
    lastSeenByUser: parseJson<Record<string, string> | null>(conversation.lastSeenByUser, null),
    listing: normalizeListing(conversation.listing),
    buyer: normalizeUser(conversation.buyer),
    seller: normalizeUser(conversation.seller)
  };
}

function normalizeMessage(message: any) {
  if (!message) return null;
  return {
    ...message,
    sender: normalizeUser(message.sender)
  };
}

function normalizeBoardPost(post: any) {
  if (!post) return null;
  return {
    ...post,
    user: normalizeUser(post.user)
  };
}

function normalizeFlowPost(post: any) {
  if (!post) return null;
  return {
    ...post,
    photos: parseJson<string[]>(post.photos, []),
    user: normalizeUser(post.user),
    likes: post.likes || [],
    replies: (post.replies || []).map(normalizeFlowPost),
    reposts: (post.reposts || []).map(normalizeFlowPost),
    repostOfPost: normalizeFlowPost(post.repostOfPost)
  };
}

function normalizePoll(poll: any) {
  if (!poll) return null;
  return {
    ...poll,
    options: parseJson<string[]>(poll.options, []),
    user: normalizeUser(poll.user),
    votes: poll.votes || []
  };
}

function normalizeUserWeeklyUsage(item: any) {
  if (!item) return null;
  return item;
}

function normalizeSiteVisit(item: any) {
  if (!item) return null;
  return item;
}

function normalizeSitePageView(item: any) {
  if (!item) return null;
  return item;
}

function serializeUserData(data: any) {
  const next = { ...data };
  if ("businessClosedHours" in next) {
    next.businessClosedHours = next.businessClosedHours ? JSON.stringify(next.businessClosedHours) : null;
  }
  if ("seenBoardPostIds" in next) {
    next.seenBoardPostIds = JSON.stringify(next.seenBoardPostIds || []);
  }
  return next;
}

function serializeConversationData(data: any) {
  const next = { ...data };
  if ("participantIds" in next) next.participantIds = next.participantIds ? JSON.stringify(next.participantIds) : null;
  if ("adminIds" in next) next.adminIds = next.adminIds ? JSON.stringify(next.adminIds) : null;
  if ("lastSeenByUser" in next) next.lastSeenByUser = next.lastSeenByUser ? JSON.stringify(next.lastSeenByUser) : null;
  return next;
}

function serializePollData(data: any) {
  const next = { ...data };
  if ("options" in next && Array.isArray(next.options)) next.options = JSON.stringify(next.options);
  return next;
}

const attachListingIncludes = (include?: any) =>
  include ? { ...include, user: include.user ? true : include.user, neighborhood: include.neighborhood ? true : include.neighborhood } : undefined;

export const prisma = {
  user: {
    findUnique: async ({ where, include }: any) => {
      const user = await db.user.findFirst({
        where: where.id ? { id: where.id } : where.email ? { email: where.email } : where.username ? { username: where.username } : undefined,
        include: {
          neighborhood: Boolean(include?.neighborhood),
          listings: include?.listings ? { where: include.listings.where, orderBy: include.listings.orderBy, take: include.listings.take } : false
        }
      });
      if (!user) return null;
      return normalizeUser({
        ...user,
        neighborhood: normalizeNeighborhood(user?.neighborhood),
        listings: user?.listings?.map(normalizeListing) || []
      });
    },
    findMany: async ({ where, orderBy, include }: any = {}) => {
      const users = await db.user.findMany({
        where,
        orderBy,
        include: {
          neighborhood: Boolean(include?.neighborhood),
          listings: Boolean(include?.listings)
        }
      });
      return users.map((user) =>
        normalizeUser({
          ...user,
          neighborhood: normalizeNeighborhood(user.neighborhood),
          listings: user.listings?.map(normalizeListing) || []
        })
      );
    },
    create: async ({ data }: any) => normalizeUser(await db.user.create({ data: { id: data.id || randomUUID(), ...serializeUserData(data) } })),
    update: async ({ where, data }: any) => normalizeUser(await db.user.update({ where, data: serializeUserData(data) })),
    upsert: async ({ where, create, update }: any) => {
      if (where.id) {
        return normalizeUser(await db.user.upsert({ where: { id: where.id }, create: { id: create.id || randomUUID(), ...serializeUserData(create) }, update: serializeUserData(update || {}) }));
      }
      const orWhere = [{ email: where.email }, ...(where.username ? [{ username: where.username }] : [])] as any;
      const existing = await db.user.findFirst({
        where: {
          OR: orWhere
        }
      });
      if (existing) return normalizeUser(existing);
      return normalizeUser(await db.user.create({ data: { id: create.id || randomUUID(), ...serializeUserData(create) } }));
    }
  },
  userWeeklyUsage: {
    findMany: async ({ where }: any = {}) => (await db.userWeeklyUsage.findMany({ where })).map(normalizeUserWeeklyUsage),
    findFirst: async ({ where }: any) => normalizeUserWeeklyUsage(await db.userWeeklyUsage.findFirst({ where })),
    upsert: async ({ where, create, update }: any) => {
      const key = where.userId_weekKey;
      const now = new Date();
      return normalizeUserWeeklyUsage(
        await db.userWeeklyUsage.upsert({
          where: { userId_weekKey: key },
          create: { id: create.id || randomUUID(), createdAt: now, updatedAt: now, ...create },
          update: update?.seconds?.increment ? { seconds: { increment: update.seconds.increment }, updatedAt: now } : { ...update, updatedAt: now }
        })
      );
    }
  },
  siteVisit: {
    findMany: async ({ where, orderBy }: any = {}) => (await db.siteVisit.findMany({ where, orderBy })).map(normalizeSiteVisit),
    findFirst: async ({ where }: any) => normalizeSiteVisit(await db.siteVisit.findFirst({ where })),
    upsert: async ({ where, create, update }: any) =>
      normalizeSiteVisit(
        await db.siteVisit.upsert({
          where,
          create: { id: create.id || randomUUID(), updatedAt: new Date(), ...create },
          update: update?.pageCount?.increment
            ? { pageCount: { increment: update.pageCount.increment }, updatedAt: new Date(), userId: update.userId }
            : { ...update, updatedAt: new Date() }
        })
        ),
    count: async ({ where }: any = {}) => await db.siteVisit.count({ where })
  },
  sitePageView: {
    findMany: async ({ where, orderBy }: any = {}) => (await db.sitePageView.findMany({ where, orderBy })).map(normalizeSitePageView),
    findFirst: async ({ where }: any) => normalizeSitePageView(await db.sitePageView.findFirst({ where })),
    upsert: async ({ where, create, update }: any) =>
      normalizeSitePageView(
        await db.sitePageView.upsert({
          where,
          create: { id: create.id || randomUUID(), updatedAt: new Date(), ...create },
          update: update?.viewCount?.increment
            ? {
                viewCount: { increment: update.viewCount.increment },
                updatedAt: new Date(),
                userId: update.userId,
                neighborhoodId: update.neighborhoodId
              }
            : { ...update, updatedAt: new Date() }
        })
      ),
    count: async ({ where }: any = {}) => await db.sitePageView.count({ where })
  },
  userRating: {
    findMany: async ({ where }: any = {}) => await db.userRating.findMany({ where }),
    findFirst: async ({ where }: any) => await db.userRating.findFirst({ where }),
    create: async ({ data }: any) =>
      await db.userRating.create({ data: { id: data.id || randomUUID(), updatedAt: new Date(), ...data } }),
    update: async ({ where, data }: any) => await db.userRating.update({ where, data: { ...data, updatedAt: new Date() } })
  },
  neighborhood: {
    findMany: async ({ where, orderBy }: any = {}) => await db.neighborhood.findMany({ where, orderBy }),
    findUnique: async ({ where }: any) => await db.neighborhood.findFirst({ where: where.id ? { id: where.id } : { inviteCode: where.inviteCode } }),
    upsert: async ({ where, create, update }: any) =>
      await db.neighborhood.upsert({
        where: where.id ? { id: where.id } : { inviteCode: where.inviteCode },
        create: { id: create.id || randomUUID(), ...create },
        update: update || {}
      })
  },
  listing: {
      findMany: async ({ where, include, orderBy, take, skip }: any = {}) =>
        (await db.listing.findMany({ where, include: attachListingIncludes(include), orderBy, take, skip })).map(normalizeListing),
      findUnique: async ({ where, include }: any) =>
        normalizeListing(await db.listing.findUnique({ where, include: attachListingIncludes(include) })),
      count: async ({ where }: any = {}) => await db.listing.count({ where }),
      create: async ({ data }: any) =>
        normalizeListing(
        await db.listing.create({
          data: {
            id: data.id || randomUUID(),
            updatedAt: new Date(),
            ...data
          }
        })
      ),
    update: async ({ where, data }: any) =>
      normalizeListing(await db.listing.update({ where, data: { ...data, updatedAt: new Date() } })),
    delete: async ({ where }: any) => normalizeListing(await db.listing.delete({ where }))
  },
  conversation: {
    findMany: async ({ where, include, orderBy }: any = {}) =>
      (await db.conversation.findMany({
        where,
        include: {
          listing: Boolean(include?.listing),
          buyer: Boolean(include?.buyer),
          seller: Boolean(include?.seller)
        },
        orderBy
      })).map(normalizeConversation),
    findUnique: async ({ where, include }: any) => {
      if (where.id) {
        return normalizeConversation(
          await db.conversation.findUnique({
            where: { id: where.id },
            include: { listing: Boolean(include?.listing), buyer: Boolean(include?.buyer), seller: Boolean(include?.seller) }
          })
        );
      }

      return normalizeConversation(
        await db.conversation.findFirst({
          where: {
            listingId: where.listingId_buyerId_sellerId.listingId,
            buyerId: where.listingId_buyerId_sellerId.buyerId,
            sellerId: where.listingId_buyerId_sellerId.sellerId
          },
          include: { listing: Boolean(include?.listing), buyer: Boolean(include?.buyer), seller: Boolean(include?.seller) }
        })
      );
    },
    create: async ({ data }: any) => normalizeConversation(await db.conversation.create({ data: { id: data.id || randomUUID(), ...serializeConversationData(data) } })),
    update: async ({ where, data }: any) => normalizeConversation(await db.conversation.update({ where, data: serializeConversationData(data) })),
    delete: async ({ where }: any) => normalizeConversation(await db.conversation.delete({ where }))
  },
    message: {
      findMany: async ({ where, include, orderBy, take }: any = {}) =>
        (await db.message.findMany({ where, include: { sender: Boolean(include?.sender) }, orderBy, take })).map(normalizeMessage),
    findUnique: async ({ where }: any) => normalizeMessage(await db.message.findUnique({ where })),
    create: async ({ data }: any) => normalizeMessage(await db.message.create({ data: { id: data.id || randomUUID(), ...data } })),
    update: async ({ where, data }: any) => normalizeMessage(await db.message.update({ where, data })),
    delete: async ({ where }: any) => normalizeMessage(await db.message.delete({ where })),
    deleteMany: async ({ where }: any) => await db.message.deleteMany({ where })
  },
  report: {
    findMany: async ({ where, orderBy }: any = {}) => await db.report.findMany({ where, orderBy }),
    create: async ({ data }: any) => await db.report.create({ data: { id: data.id || randomUUID(), status: data.status || "OPEN", ...data } }),
    update: async ({ where, data }: any) => await db.report.update({ where, data }),
    count: async ({ where }: any) => await db.report.count({ where })
  },
    boardPost: {
      findMany: async ({ where, include, orderBy, take, skip }: any = {}) =>
        (await db.boardPost.findMany({ where, include: { user: Boolean(include?.user) }, orderBy, take, skip })).map(normalizeBoardPost),
      count: async ({ where }: any = {}) => await db.boardPost.count({ where }),
      create: async ({ data }: any) => normalizeBoardPost(await db.boardPost.create({ data: { id: data.id || randomUUID(), viewCount: 0, ...data } })),
    findUnique: async ({ where, include }: any) =>
      normalizeBoardPost(await db.boardPost.findUnique({ where, include: { user: Boolean(include?.user) } })),
    update: async ({ where, data }: any) => normalizeBoardPost(await db.boardPost.update({ where, data })),
    delete: async ({ where }: any) => normalizeBoardPost(await db.boardPost.delete({ where }))
  },
    flowPost: {
      findMany: async ({ where, include, orderBy, take, skip }: any = {}) =>
        (await db.flowPost.findMany({
          where,
          include: {
          user: Boolean(include?.user),
          likes: Boolean(include?.likes),
          replies: include?.replies ? { include: { user: true }, orderBy: { createdAt: "asc" } } : false,
          reposts: Boolean(include?.reposts),
          repostOfPost: include?.repostOfPost ? { include: { user: true } } : false
        },
          orderBy,
          take,
          skip
        })).map(normalizeFlowPost),
      count: async ({ where }: any = {}) => await db.flowPost.count({ where }),
      create: async ({ data }: any) =>
      normalizeFlowPost(await db.flowPost.create({ data: { id: data.id || randomUUID(), ...data, photos: JSON.stringify(data.photos || []) } })),
    findUnique: async ({ where, include }: any) =>
      normalizeFlowPost(await db.flowPost.findUnique({
        where,
        include: {
          user: Boolean(include?.user),
          likes: Boolean(include?.likes),
          replies: include?.replies ? { include: { user: true }, orderBy: { createdAt: "asc" } } : false,
          reposts: Boolean(include?.reposts),
          repostOfPost: include?.repostOfPost ? { include: { user: true } } : false
        }
      })),
    findFirst: async ({ where, include }: any) =>
      normalizeFlowPost(await db.flowPost.findFirst({
        where,
        include: {
          user: Boolean(include?.user),
          likes: Boolean(include?.likes),
          replies: include?.replies ? { include: { user: true }, orderBy: { createdAt: "asc" } } : false,
          reposts: Boolean(include?.reposts),
          repostOfPost: include?.repostOfPost ? { include: { user: true } } : false
        }
      })),
    delete: async ({ where }: any) => normalizeFlowPost(await db.flowPost.delete({ where }))
  },
  flowPostLike: {
    findFirst: async ({ where }: any) => await db.flowPostLike.findFirst({ where }),
    findMany: async ({ where }: any = {}) => await db.flowPostLike.findMany({ where }),
    create: async ({ data }: any) => await db.flowPostLike.create({ data: { id: data.id || randomUUID(), ...data } }),
    delete: async ({ where }: any) => await db.flowPostLike.delete({ where }),
    deleteMany: async ({ where }: any) => await db.flowPostLike.deleteMany({ where }),
    count: async ({ where }: any) => await db.flowPostLike.count({ where })
  },
  poll: {
    findMany: async ({ where, include, orderBy, take }: any = {}) =>
      (await db.poll.findMany({ where, include: { user: Boolean(include?.user), votes: Boolean(include?.votes) }, orderBy, take })).map(normalizePoll),
    findUnique: async ({ where, include }: any) =>
      normalizePoll(await db.poll.findUnique({ where, include: { user: Boolean(include?.user), votes: Boolean(include?.votes) } })),
    create: async ({ data }: any) => normalizePoll(await db.poll.create({ data: { id: data.id || randomUUID(), ...serializePollData(data) } })),
    update: async ({ where, data }: any) => normalizePoll(await db.poll.update({ where, data: serializePollData(data) }))
  },
  pollVote: {
    findFirst: async ({ where }: any) => await db.pollVote.findFirst({ where }),
    findMany: async ({ where }: any = {}) => await db.pollVote.findMany({ where }),
    create: async ({ data }: any) => await db.pollVote.create({ data: { id: data.id || randomUUID(), userIdIndex: data.userId, ...data } }),
    update: async ({ where, data }: any) => await db.pollVote.update({ where, data }),
    deleteMany: async ({ where }: any) => await db.pollVote.deleteMany({ where })
  }
} as const;

export { db };
