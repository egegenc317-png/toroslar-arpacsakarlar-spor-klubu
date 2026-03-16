// @ts-nocheck
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isModeratorRole } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getLatestMessagesByConversationIds } from "@/lib/conversation-last-message";

function previewMessage(body?: string | null) {
  if (!body) return "Mesaj yok";
  if (body.startsWith("__FILEJSON__") || body.startsWith("__FILE__|") || body.startsWith("__FILE_ONCE_CONSUMED__|")) {
    return "Fotoğraf / dosya";
  }
  if (body.startsWith("__SYSTEM__|")) {
    return body.replace("__SYSTEM__|", "").trim();
  }
  return body;
}

export default async function AdminChatsPage() {
  const session = await auth();
  if (!session || !isModeratorRole(session.user.role)) redirect("/");

  const conversations = await prisma.conversation.findMany({
    include: {
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      listing: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const lastMap = await getLatestMessagesByConversationIds(conversations.map((item) => item.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sohbet Moderasyonu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {conversations.length === 0 ? <p className="text-sm text-muted-foreground">Sohbet bulunmuyor.</p> : null}
        {conversations.map((conversation) => {
          const last = lastMap.get(conversation.id);
          const title =
            conversation.conversationType === "GROUP"
              ? conversation.groupName || "Grup Sohbeti"
              : `${conversation.buyer?.name || "?"} - ${conversation.seller?.name || "?"}`;

          return (
            <div key={conversation.id} className="rounded-lg border p-3 text-sm">
              <p className="font-semibold text-zinc-900">{title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {conversation.conversationType} {conversation.listing?.title ? `• ${conversation.listing.title}` : ""}
              </p>
              <p className="mt-2 line-clamp-2 text-zinc-700">{previewMessage(last?.body)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/chats/${conversation.id}`}>İncele</Link>
                </Button>
                <form action={`/api/admin/conversations/${conversation.id}/delete`} method="post">
                  <Button type="submit" size="sm" variant="outline">Sohbeti Sil</Button>
                </form>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

