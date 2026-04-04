// @ts-nocheck
import { auth } from "@/lib/auth";
import { getConversationMessagesSnapshot } from "@/lib/conversation-messages";

export const runtime = "nodejs";

function toSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

type SnapshotBody = {
  items: Array<{
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
    sender?: { id: string; name: string };
  }>;
  peerLastSeenAt: string | null;
};

function buildSignature(snapshot: SnapshotBody) {
  return JSON.stringify({
    peerLastSeenAt: snapshot.peerLastSeenAt || null,
    items: snapshot.items.map((item) => ({
      id: item.id,
      body: item.body,
      senderId: item.senderId,
      createdAt: item.createdAt
    }))
  });
}

function buildDelta(previous: SnapshotBody | null, next: SnapshotBody) {
  if (!previous) {
    return { mode: "reset", items: next.items, peerLastSeenAt: next.peerLastSeenAt };
  }

  if (previous.items.length > next.items.length) {
    return { mode: "reset", items: next.items, peerLastSeenAt: next.peerLastSeenAt };
  }

  for (let index = 0; index < previous.items.length; index += 1) {
    if (previous.items[index]?.id !== next.items[index]?.id) {
      return { mode: "reset", items: next.items, peerLastSeenAt: next.peerLastSeenAt };
    }
  }

  const changedItems = next.items.filter((item, index) => {
    const previousItem = previous.items[index];
    if (!previousItem) return true;
    return (
      previousItem.id !== item.id ||
      previousItem.body !== item.body ||
      previousItem.senderId !== item.senderId ||
      previousItem.createdAt !== item.createdAt ||
      previousItem.sender?.name !== item.sender?.name
    );
  });

  if (!changedItems.length && previous.peerLastSeenAt === next.peerLastSeenAt) {
    return null;
  }

  return {
    mode: "patch",
    items: changedItems,
    peerLastSeenAt: next.peerLastSeenAt
  };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let messagesInterval: NodeJS.Timeout | null = null;
  let keepAliveInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let previousSnapshot: SnapshotBody | null = null;
      let previousSignature = "";

      const pushMessages = async () => {
        try {
          const result = await getConversationMessagesSnapshot(params.id, session.user.id);
          if (result.status === 200) {
            const snapshot = result.body as SnapshotBody;
            const nextSignature = buildSignature(snapshot);
            if (nextSignature === previousSignature) return;

            const payload = buildDelta(previousSnapshot, snapshot);
            previousSnapshot = snapshot;
            previousSignature = nextSignature;

            if (payload) {
              controller.enqueue(encoder.encode(toSse("messages", payload)));
            }
            return;
          }
          controller.enqueue(encoder.encode(toSse("error", result.body)));
        } catch {
          controller.enqueue(encoder.encode(toSse("error", { error: "Mesaj akışı güncellenemedi." })));
        }
      };

      await pushMessages();
      messagesInterval = setInterval(() => {
        if (!closed) void pushMessages();
      }, 6000);
      keepAliveInterval = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);
    },
    cancel() {
      closed = true;
      if (messagesInterval) clearInterval(messagesInterval);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
