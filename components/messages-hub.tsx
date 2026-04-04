"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCheck, MessageCircleMore, Pin, Plus, Search, Sparkles, UsersRound } from "lucide-react";

import { MessagesUserSearch } from "@/components/messages-user-search";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ConversationListItem = {
  id: string;
  peer: string;
  title: string;
  preview: string;
  time: string;
  lastActivityAt?: string;
  deliveryStatus: "delivered" | "seen" | null;
  isGroup?: boolean;
  isPinned?: boolean;
  image?: string | null;
  hasMention?: boolean;
};

function getConversationGroupLabel(value?: string) {
  if (!value) return "Daha Eski";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Daha Eski";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return "Bugün";
  if (target.getTime() === yesterday.getTime()) return "Dün";

  return date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

export function MessagesHub({
  currentUserId,
  conversations
}: {
  currentUserId: string;
  conversations: ConversationListItem[];
}) {
  const [liveConversations, setLiveConversations] = useState(conversations);

  useEffect(() => {
    let cancelled = false;

    const refreshConversations = () => {
      void fetch("/api/conversations", { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return null;
          const data = await res.json().catch(() => null);
          return Array.isArray(data?.items) ? data.items : null;
        })
        .then((items) => {
          if (cancelled || !items) return;
          setLiveConversations(items);
        })
        .catch(() => {});
    };

    refreshConversations();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshConversations();
    };
    const onPageShow = () => {
      refreshConversations();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshConversations();
    }, 8000);

    window.addEventListener("focus", refreshConversations);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("mahalle:refresh-conversations", refreshConversations as EventListener);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshConversations);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("mahalle:refresh-conversations", refreshConversations as EventListener);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const pinnedConversations = useMemo(
    () => liveConversations.filter((conversation) => conversation.isPinned),
    [liveConversations]
  );
  const regularConversations = useMemo(
    () => liveConversations.filter((conversation) => !conversation.isPinned),
    [liveConversations]
  );

  const groupedConversations = regularConversations.reduce(
    (groups, conversation) => {
      const label = getConversationGroupLabel(conversation.lastActivityAt);
      const existing = groups.find((group) => group.label === label);
      if (existing) {
        existing.items.push(conversation);
      } else {
        groups.push({ label, items: [conversation] });
      }
      return groups;
    },
    [] as Array<{ label: string; items: ConversationListItem[] }>
  );

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-amber-200 bg-[linear-gradient(135deg,#fff4df_0%,#ffe6bd_36%,#fff8ec_66%,#ffffff_100%)] shadow-[0_24px_70px_rgba(153,93,37,0.18)] sm:rounded-[30px]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(#c48f59 0.8px, transparent 0.8px)", backgroundSize: "12px 12px" }} />
      <div className="relative border-b border-amber-100 bg-gradient-to-r from-[#ffedd1] via-[#ffe3be] to-[#fff2de] px-3 py-2.5 sm:px-4 sm:py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-400/30 sm:h-11 sm:w-11">
            <MessageCircleMore className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg">Mesajlar</p>
            <p className="text-[11px] text-zinc-600 sm:text-xs">Aratın veya yeni sohbet başlatın</p>
          </div>
          <Link
            href="/messages/groups/new"
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-200 bg-white/90 px-3 text-[11px] font-semibold text-amber-700 shadow-sm transition hover:bg-white sm:h-10 sm:gap-2 sm:text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Grup Kur
          </Link>
        </div>
      </div>

      <Tabs defaultValue="chats" className="relative p-2 sm:p-3">
        <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl border border-amber-200 bg-white/95 p-1 shadow-sm sm:h-11">
          <TabsTrigger value="chats" className="rounded-lg text-xs font-semibold text-zinc-600 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircleMore className="h-4 w-4" /> Tumu
            </span>
          </TabsTrigger>
          <TabsTrigger value="people" className="rounded-lg text-xs font-semibold text-zinc-600 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Search className="h-4 w-4" /> Yeni Sohbet
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="mt-3 space-y-2">
          {liveConversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-white/95 px-4 py-7 text-center shadow-sm">
              <Sparkles className="mx-auto h-5 w-5 text-amber-600" />
              <p className="mt-2 text-sm text-zinc-500">Henüz konuşma yok.</p>
            </div>
          ) : null}

          {pinnedConversations.length > 0 ? (
            <div className="space-y-2">
              <div className="sticky top-[5.25rem] z-10 rounded-full border border-amber-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800 backdrop-blur">
                <span className="inline-flex items-center gap-1.5">
                  <Pin className="h-3.5 w-3.5" />
                  Sabitlenmis Sohbetler
                </span>
              </div>
              <div className="grid gap-2">
                {pinnedConversations.map((c) => (
                <Link key={c.id} href={`/messages/${c.id}`} className="block rounded-[16px] border border-amber-300 bg-[linear-gradient(135deg,#fff8ee_0%,#fff1d8_100%)] px-2.5 py-2 transition hover:bg-amber-50/40 sm:rounded-xl sm:px-3 sm:py-2.5">
                  <div className="flex items-center gap-2.5">
                    {c.image ? (
                      <Image src={c.image} alt={c.peer} width={44} height={44} className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-semibold text-white sm:h-10 sm:w-10">
                        {c.isGroup ? <UsersRound className="h-4.5 w-4.5" /> : c.peer.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-900 sm:text-[15px]">{c.peer}</p>
                          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                            sabit
                          </span>
                          {c.hasMention ? (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                              @sen
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-zinc-500">{c.time}</span>
                      </div>
                      <p className="truncate text-[11px] text-zinc-500 sm:text-xs">{c.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-zinc-700 sm:text-[13px]">
                        {c.deliveryStatus ? (
                          <CheckCheck className={`h-3.5 w-3.5 shrink-0 ${c.deliveryStatus === "seen" ? "text-orange-700" : "text-zinc-400"}`} />
                        ) : null}
                        <span className="truncate">{c.preview}</span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              </div>
            </div>
          ) : null}

          {groupedConversations.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="sticky top-[5.25rem] z-10 rounded-full border border-amber-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800 backdrop-blur">
                {group.label}
              </div>
              {group.items.map((c) => (
                <Link key={c.id} href={`/messages/${c.id}`} className="block rounded-[18px] border border-amber-200 bg-white/95 px-2.5 py-2.5 transition hover:bg-amber-50/40 sm:rounded-xl sm:px-3 sm:py-3">
                  <div className="flex items-start gap-2.5">
                    {c.image ? (
                      <Image src={c.image} alt={c.peer} width={44} height={44} className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-11 sm:w-11" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-semibold text-white sm:h-11 sm:w-11">
                        {c.isGroup ? <UsersRound className="h-5 w-5" /> : c.peer.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-900 sm:text-[15px]">{c.peer}</p>
                          {c.hasMention ? (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                              @sen
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-zinc-500">{c.time}</span>
                      </div>
                      <p className="truncate text-[11px] text-zinc-500 sm:text-xs">{c.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-zinc-700 sm:mt-1 sm:text-sm">
                        {c.deliveryStatus ? (
                          <CheckCheck className={`h-3.5 w-3.5 shrink-0 ${c.deliveryStatus === "seen" ? "text-orange-700" : "text-zinc-400"}`} />
                        ) : null}
                        <span className="truncate">{c.preview}</span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="people" className="mt-3 space-y-3">
          <MessagesUserSearch currentUserId={currentUserId} />
          <div className="rounded-2xl border border-amber-200 bg-white/95 px-3 py-2 text-[11px] text-zinc-500 sm:text-xs">
            <p className="inline-flex items-center gap-1.5">
              <UsersRound className="h-3.5 w-3.5 text-amber-600" />
              İsim yazarak kişi seç, direkt sohbet duvarina geç.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
