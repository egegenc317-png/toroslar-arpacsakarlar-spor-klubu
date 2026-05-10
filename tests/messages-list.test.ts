import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockConversationFindMany, mockUserFindMany, mockGetLatestMessages } = vi.hoisted(() => ({
  mockConversationFindMany: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockGetLatestMessages: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findMany: mockConversationFindMany
    },
    user: {
      findMany: mockUserFindMany
    }
  }
}));

vi.mock("@/lib/conversation-last-message", () => ({
  getLatestMessagesByConversationIds: mockGetLatestMessages
}));

import { getConversationListItems } from "@/lib/messages-list";

describe("getConversationListItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("alici icin direkt sohbeti gorunur ve okunmamis olarak listeler", async () => {
    mockConversationFindMany.mockResolvedValue([
      {
        id: "c1",
        conversationType: "DIRECT",
        buyerId: "sender",
        sellerId: "recipient",
        buyer: { id: "sender", name: "Gonderen Kullanici" },
        seller: { id: "recipient", name: "Alici Kullanici" },
        listing: null,
        contextTitle: "Direkt Sohbet",
        participantIds: null,
        pinnedMessageId: null,
        groupImage: null,
        createdAt: new Date("2026-04-15T11:55:00.000Z"),
        lastSeenByBuyerAt: new Date("2026-04-15T11:50:00.000Z"),
        lastSeenBySellerAt: null
      }
    ]);
    mockUserFindMany.mockResolvedValue([
      { id: "sender", name: "Gonderen Kullanici", username: "gonderen" },
      { id: "recipient", name: "Alici Kullanici", username: "alici" }
    ]);
    mockGetLatestMessages.mockResolvedValue(
      new Map([
        [
          "c1",
          {
            id: "m1",
            conversationId: "c1",
            senderId: "sender",
            body: "Merhaba",
            createdAt: new Date("2026-04-15T12:00:00.000Z"),
            senderName: "Gonderen Kullanici"
          }
        ]
      ])
    );

    const items = await getConversationListItems("recipient");

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "c1",
      peer: "Gonderen Kullanici",
      preview: "Merhaba",
      isUnread: true,
      deliveryStatus: null,
      lastSenderName: "Gonderen Kullanici"
    });
  });
});
