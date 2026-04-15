// @ts-nocheck
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Layers3, ShieldCheck, UsersRound } from "lucide-react";

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
    const subtitle = isGroup ? conversation.groupDescription || `${memberCount} katilimcili premium kanal` : title;

    return (
      <section className="overflow-hidden rounded-[34px] border border-amber-200/70 bg-[linear-gradient(135deg,#fff8ef_0%,#fff3e1_20%,#ffffff_58%,#fff8ef_100%)] shadow-[0_30px_90px_rgba(120,67,18,0.16)]">
        <header className="relative overflow-hidden border-b border-amber-100/80 bg-[linear-gradient(135deg,#fff0d8_0%,#ffe6c4_38%,#fff8ee_100%)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-orange-200/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-amber-200/20 blur-3xl" />

          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="mt-0.5 h-11 w-11 shrink-0 rounded-full bg-white/80 text-zinc-700 shadow-sm hover:bg-white"
              >
                <Link href="/messages" aria-label="Mesaj listesine dön">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>

              {isGroup ? (
                conversation.groupImage ? (
                  <Image
                    src={conversation.groupImage}
                    alt={peerName}
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-[24px] object-cover shadow-[0_16px_40px_rgba(120,67,18,0.14)]"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-white shadow-[0_18px_45px_rgba(234,120,36,0.22)]">
                    <UsersRound className="h-6 w-6" />
                  </div>
                )
              ) : (
                <Link
                  href={`/profile/${peerId}`}
                  aria-label={`${peerName} profiline git`}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-xl font-semibold text-white shadow-[0_18px_45px_rgba(234,120,36,0.22)]"
                >
                  {getInitials(peerName)}
                </Link>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    <Layers3 className="h-3.5 w-3.5 text-orange-500" />
                    {isGroup ? "Topluluk odasi" : "Direkt kanal"}
                  </span>
                  {canPin ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                      <ShieldCheck className="h-3.5 w-3.5 text-orange-500" />
                      Yonetici modu
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-3 truncate text-[2rem] font-black tracking-tight text-zinc-900">{peerName}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">{subtitle}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
                    {isGroup ? `${memberCount} katilimci` : "Odakli 1:1 sohbet"}
                  </span>
                  {conversation.listing?.title ? (
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
                      Baglam: {conversation.listing.title}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[340px]">
              <div className="rounded-[24px] border border-white/70 bg-white/82 px-4 py-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Kanal hissi</p>
                <p className="mt-2 text-lg font-bold tracking-tight text-zinc-900">
                  {isGroup ? "Koordinasyon akisi acik" : "Yuksek odakli konusma"}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Mesajlar, medya ve mention akislari tek bir premium alanda birlesiyor.
                </p>
              </div>
              {isGroup ? (
                <Button
                  asChild
                  variant="ghost"
                  className="h-auto min-h-[118px] justify-start rounded-[24px] border border-white/70 bg-white/82 px-4 py-4 text-left text-zinc-700 shadow-sm hover:bg-white"
                >
                  <Link href={`/messages/groups/${conversation.id}`} aria-label="Grup ayarları">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Yonetim</p>
                      <p className="mt-2 text-lg font-bold tracking-tight text-zinc-900">Grup ayarlari</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Uyeleri, davet baglantilarini ve topluluk kurallarini yonet.
                      </p>
                    </div>
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  className="h-auto min-h-[118px] justify-start rounded-[24px] border border-white/70 bg-white/82 px-4 py-4 text-left text-zinc-700 shadow-sm hover:bg-white"
                >
                  <Link href={`/profile/${peerId}`} aria-label="Profil detayı">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Baglanti</p>
                      <p className="mt-2 text-lg font-bold tracking-tight text-zinc-900">Profili ac</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Profil kartina gidip kullanici detaylarini ve diger baglamlarini gor.
                      </p>
                    </div>
                  </Link>
                </Button>
              )}
            </div>
          </div>
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
