import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockMessageFindMany } = vi.hoisted(() => ({
  mockMessageFindMany: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    message: {
      findMany: mockMessageFindMany
    }
  }
}));

import { getLatestMessagesByConversationIds } from "@/lib/conversation-last-message";

describe("getLatestMessagesByConversationIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("her konusma icin en yeni mesaji dondurur", async () => {
    mockMessageFindMany.mockResolvedValue([
      {
        id: "m3",
        conversationId: "c2",
        senderId: "u3",
        body: "ikinci konusmanin en yenisi",
        createdAt: "2026-04-15T12:05:00.000Z",
        sender: { name: "Mert" }
      },
      {
        id: "m2",
        conversationId: "c1",
        senderId: "u2",
        body: "birinci konusmanin en yenisi",
        createdAt: "2026-04-15T12:00:00.000Z",
        sender: { name: "Ayse" }
      },
      {
        id: "m1",
        conversationId: "c1",
        senderId: "u1",
        body: "eski mesaj",
        createdAt: "2026-04-15T11:50:00.000Z",
        sender: { name: "Ali" }
      }
    ]);

    const result = await getLatestMessagesByConversationIds(["c1", "c2"]);

    expect(mockMessageFindMany).toHaveBeenCalledWith({
      where: { conversationId: { in: ["c1", "c2"] } },
      include: { sender: true },
      orderBy: [{ createdAt: "desc" }]
    });
    expect(result.size).toBe(2);
    expect(result.get("c1")).toMatchObject({
      id: "m2",
      conversationId: "c1",
      senderId: "u2",
      body: "birinci konusmanin en yenisi",
      senderName: "Ayse"
    });
    expect(result.get("c2")).toMatchObject({
      id: "m3",
      conversationId: "c2",
      senderId: "u3",
      body: "ikinci konusmanin en yenisi",
      senderName: "Mert"
    });
    expect(result.get("c1")?.createdAt).toBeInstanceOf(Date);
  });
});
