// @ts-nocheck
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isModeratorRole } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function displayMessage(body?: string | null) {
  if (!body) return "Mesaj yok";
  if (body.startsWith("__FILEJSON__") || body.startsWith("__FILE__|") || body.startsWith("__FILE_ONCE_CONSUMED__|")) {
    return "Fotoğraf / dosya gönderildi";
  }
  if (body.startsWith("__SYSTEM__|")) {
    return body.replace("__SYSTEM__|", "").trim();
  }
  return body;
}

export default async function AdminChatDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !isModeratorRole(session.user.role)) redirect("/");

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      listing: { select: { id: true, title: true } }
    }
  });

  if (!conversation) redirect("/admin/chats");

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sohbet İncelemesi</CardTitle>
        <p className="text-sm text-zinc-500">
          {conversation.conversationType === "GROUP"
            ? conversation.groupName || "Grup Sohbeti"
            : `${conversation.buyer?.name || "?"} - ${conversation.seller?.name || "?"}`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.map((message) => (
          <div key={message.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-zinc-900">{message.sender?.name || "Bilinmeyen kullanıcı"}</p>
              <span className="text-xs text-zinc-500">
                {new Date(message.createdAt).toLocaleString("tr-TR")}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-zinc-700">{displayMessage(message.body)}</p>
            <form action={`/api/admin/conversations/${conversation.id}/messages/${message.id}/delete`} method="post" className="mt-3">
              <Button type="submit" size="sm" variant="outline">Mesajı Sil</Button>
            </form>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
