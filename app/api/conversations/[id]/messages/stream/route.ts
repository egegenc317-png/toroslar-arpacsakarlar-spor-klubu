// @ts-nocheck
import { auth } from "@/lib/auth";
import { getConversationMessagesSnapshot } from "@/lib/conversation-messages";

export const runtime = "nodejs";

function toSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
      const pushMessages = async () => {
        try {
          const result = await getConversationMessagesSnapshot(params.id, session.user.id);
          if (result.status === 200) {
            controller.enqueue(encoder.encode(toSse("messages", result.body)));
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
