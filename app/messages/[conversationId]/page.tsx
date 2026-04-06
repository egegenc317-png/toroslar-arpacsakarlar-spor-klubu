// @ts-nocheck
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Settings, UsersRound } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ChatClient } from "./chat-client";

function getInitials(value?: string | null) {
  const safe = (value || "K").trim();
  return safe.slice(0, 1).toUpperCase() || "K";
}

export default async function ConversationPage({ params }: { params: { conversationId: string } }) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
      include: { listing: true }
    });

    const isGroup = conversation?.conversationType === "GROUP";
    const canAccess =
      conversation &&
      (isGroup
        ? (conversation.participantIds || []).includes(session.user.id)
        : conversation.buyerId === session.user.id || conversation.sellerId === session.user.id);

    if (!conversation || !canAccess) {
      redirect("/messages");
    }

    const title = conversation.listing?.title || conversation.contextTitle || "Direkt Sohbet";
    const peerId = isGroup ? "" : conversation.buyerId === session.user.id ? conversation.sellerId : conversation.buyerId;
    const peer = peerId ? await prisma.user.findUnique({ where: { id: peerId } }) : null;
    const peerName = isGroup ? conversation.groupName || "Grup Sohbeti" : peer?.name || "Kullanıcı";
    const memberCount = isGroup ? (conversation.participantIds || []).length : 2;
    const users = isGroup
      ? ((await prisma.user.findMany()) as Array<{ id: string; name: string; username?: string | null }>)
          .filter((user) => (conversation.participantIds || []).includes(user.id))
      : [];
    const canPin = Boolean(isGroup && (conversation.adminIds || []).includes(session.user.id));
    const pinnedRaw = conversation.pinnedMessageId
      ? await prisma.message.findUnique({ where: { id: conversation.pinnedMessageId } })
      : null;
    const pinnedSender = pinnedRaw ? await prisma.user.findUnique({ where: { id: pinnedRaw.senderId } }) : null;
    const subtitle = isGroup ? `${memberCount} katılımcı` : title;

    return (
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#efeae2] shadow-[0_24px_70px_rgba(30,41,59,0.14)]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/10 bg-[#f0f2f5] px-3 py-3">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full text-zinc-700 hover:bg-black/5">
            <Link href="/messages" aria-label="Mesaj listesine dön">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          {isGroup ? (
            conversation.groupImage ? (
              <Image src={conversation.groupImage} alt={peerName} width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                <UsersRound className="h-5 w-5" />
              </div>
            )
          ) : (
            <Link
              href={`/profile/${peerId}`}
              aria-label={`${peerName} profiline git`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-base font-semibold text-white"
            >
              {getInitials(peerName)}
            </Link>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-medium text-zinc-900">{peerName}</p>
            <p className="truncate text-[12px] text-zinc-500">{subtitle}</p>
          </div>

          {isGroup ? (
            <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full text-zinc-700 hover:bg-black/5">
              <Link href={`/messages/groups/${conversation.id}`} aria-label="Grup ayarları">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          ) : null}
        </header>

        <div className="p-0">
          <ChatClient
            conversationId={conversation.id}
            currentUserId={session.user.id}
            peerName={peerName}
            peerId={peerId}
            isGroup={isGroup}
            canPin={canPin}
            pinnedMessage={
              pinnedRaw
                ? {
                    id: pinnedRaw.id,
                    body: pinnedRaw.body,
                    senderName: pinnedSender?.name || "Bir kullanıcı",
                    createdAt: pinnedRaw.createdAt.toISOString()
                  }
                : null
            }
            mentionUsers={users.map((user) => ({ id: user.id, name: user.name, username: user.username || null }))}
          />
        </div>
      </section>
    );
  } catch {
    redirect("/messages");
  }
}
