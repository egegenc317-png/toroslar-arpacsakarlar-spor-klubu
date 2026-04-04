// @ts-nocheck
import { auth } from "@/lib/auth";
import { getShellSummaryForUser } from "@/lib/shell-summary";

export const runtime = "nodejs";

function toSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let summaryInterval: NodeJS.Timeout | null = null;
  let keepAliveInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const pushSummary = async () => {
        try {
          const summary = await getShellSummaryForUser(session.user.id);
          controller.enqueue(encoder.encode(toSse("summary", summary)));
        } catch {
          controller.enqueue(encoder.encode(toSse("summary", { unreadCount: 0 })));
        }
      };

      await pushSummary();
      summaryInterval = setInterval(() => {
        if (!closed) void pushSummary();
      }, 4000);
      keepAliveInterval = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);
    },
    cancel() {
      closed = true;
      if (summaryInterval) clearInterval(summaryInterval);
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
