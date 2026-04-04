// @ts-nocheck
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle, Settings, Sparkles, UsersRound } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    const nowLabel = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const subtitle = isGroup ? conversation.groupDescription || `${memberCount} kişilik grup` : title;

    return (
      <Card className="overflow-visible border-amber-200/80 bg-[linear-gradient(180deg,#fff7eb_0%,#fff3e5_18%,#ffffff_100%)] shadow-[0_24px_70px_rgba(153,93,37,0.18)]">
      <CardHeader className="relative overflow-hidden border-b border-amber-200/80 bg-[linear-gradient(115deg,#ffedcf_0%,#ffc978_38%,#ffb56a_74%,#ffddb5_100%)] px-3 py-3 md:px-4 md:py-4">
        <div className="pointer-events-none absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "radial-gradient(#9a5b25 0.8px, transparent 0.8px)", backgroundSize: "12px 12px" }} />
        <div className="pointer-events-none absolute -right-10 top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-orange-300/20 blur-2xl" />

        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button asChild variant="outline" size="icon" className="mt-1 h-10 w-10 shrink-0 rounded-2xl border-white/70 bg-white/90 text-amber-700 shadow-sm hover:bg-white">
              <Link href="/messages" aria-label="Mesaj listesine dön">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            {isGroup ? (
              conversation.groupImage ? (
                <Image src={conversation.groupImage} alt={peerName} width={64} height={64} className="h-14 w-14 shrink-0 rounded-[18px] object-cover shadow-[0_10px_24px_rgba(120,67,18,0.18)] sm:h-16 sm:w-16 sm:rounded-[22px]" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-white shadow-[0_12px_28px_rgba(234,88,12,0.24)] sm:h-16 sm:w-16 sm:rounded-[22px]">
                  <UsersRound className="h-7 w-7" />
                </div>
              )
            ) : (
              <Link
                href={`/profile/${peerId}`}
                aria-label={`${peerName} profiline git`}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-lg font-bold text-white shadow-[0_12px_28px_rgba(234,88,12,0.24)] sm:h-16 sm:w-16 sm:rounded-[22px]"
              >
                {getInitials(peerName)}
              </Link>
            )}

            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-800">
                <Sparkles className="h-3.5 w-3.5" />
                {isGroup ? "Grup Sohbeti" : "Sohbet"}
              </p>
              <CardTitle className="mt-2 truncate text-xl font-black tracking-tight text-zinc-900 sm:mt-3 sm:text-2xl lg:text-[2rem]">{peerName}</CardTitle>
              <p className="mt-1 max-w-2xl truncate text-sm text-zinc-700">{subtitle}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[11px] font-semibold text-zinc-700">
                  <MessageCircle className="h-3.5 w-3.5 text-orange-500" />
                  Aktif {nowLabel}
                </span>
                {isGroup ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[11px] font-semibold text-zinc-700">
                    <UsersRound className="h-3.5 w-3.5 text-orange-500" />
                    {memberCount} üye
                  </span>
                ) : null}
                {canPin ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[11px] font-semibold text-zinc-700">
                    Sabit mesaj yetkisi açık
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-1 gap-2 self-stretch sm:grid-cols-2 lg:min-w-[260px]">
            <div className="rounded-[22px] border border-white/70 bg-white/78 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Durum</p>
              <p className="mt-1 text-sm font-bold text-zinc-900">{isGroup ? "Topluluk aktif" : "Sohbet açık"}</p>
            </div>
            <div className="rounded-[22px] border border-white/70 bg-white/78 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Ayarlar</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-zinc-900">{isGroup ? "Grup paneli" : "Profil görünümü"}</p>
                {isGroup ? (
                  <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-amber-200 bg-white/95 text-amber-700 shadow-sm hover:bg-white">
                    <Link href={`/messages/groups/${conversation.id}`} aria-label="Grup ayarları">
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-amber-200 bg-white/95 text-amber-700 shadow-sm hover:bg-white">
                    <Link href={`/profile/${peerId}`} aria-label="Profil detayı">
                      <UsersRound className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-3">
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
      </CardContent>
      </Card>
    );
  } catch {
    redirect("/messages");
  }
}

