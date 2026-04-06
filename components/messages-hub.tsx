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

function getAvatarLabel(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

function getSearchHint(count: number) {
  if (count === 0) return "Sohbet bulunmuyor";
  if (count === 1) return "1 sohbet";
  return `${count} sohbet`;
}

function ConversationRow({ conversation, pinned = false }: { conversation: ConversationListItem; pinned?: boolean }) {
  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={`flex items-center gap-3 px-3 py-3 transition hover:bg-black/[0.03] ${pinned ? "bg-black/[0.02]" : "bg-white"}`}
    >
      {conversation.image ? (
        <Image
          src={conversation.image}
          alt={conversation.peer}
          width={52}
          height={52}
          className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-base font-semibold text-white">
          {conversation.isGroup ? <UsersRound className="h-5 w-5" /> : getAvatarLabel(conversation.peer)}
        </div>
      )}

      <div className="min-w-0 flex-1 border-b border-black/10 pb-3 last:border-b-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[16px] font-medium text-zinc-900">{conversation.peer}</p>
              {conversation.isPinned ? (
                <span className="inline-flex h-5 items-center rounded-full bg-black/5 px-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                  <Pin className="mr-1 h-3 w-3" />
                  Sabit
                </span>
              ) : null}
              {conversation.hasMention ? (
                <span className="inline-flex h-5 items-center rounded-full bg-orange-500/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                  @sen
                </span>
              ) : null}
            </div>
            <p className="truncate text-[12px] text-zinc-500">{conversation.title}</p>
          </div>
          <span className="shrink-0 pt-0.5 text-[11px] text-zinc-500">{conversation.time}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          {conversation.deliveryStatus ? (
            <CheckCheck className={`h-4 w-4 shrink-0 ${conversation.deliveryStatus === "seen" ? "text-orange-700" : "text-zinc-400"}`} />
          ) : null}
          <p className="truncate text-[13px] text-zinc-600">{conversation.preview}</p>
        </div>
      </div>
    </Link>
  );
}

export function MessagesHub({
  currentUserId,
  conversations
}: {
  currentUserId: string;
  conversations: ConversationListItem[];
}) {
  const [liveConversations, setLiveConversations] = useState(conversations);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    let eventSource: EventSource | null = null;

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

    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        eventSource = new EventSource("/api/notifications/stream");
        eventSource.addEventListener("notifications", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            if (cancelled) return;
            if (Array.isArray(data?.messageAlerts)) {
              refreshConversations();
            }
          } catch {
            // polling fallback devam eder
          }
        });
        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
        };
      } catch {
        // SSE desteklenmiyorsa interval fallback yeterli
      }
    }

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
      eventSource?.close();
      window.removeEventListener("focus", refreshConversations);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("mahalle:refresh-conversations", refreshConversations as EventListener);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredConversations = useMemo(
    () =>
      liveConversations.filter((conversation) => {
        if (!normalizedQuery) return true;
        return [conversation.peer, conversation.preview, conversation.title].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        );
      }),
    [liveConversations, normalizedQuery]
  );

  const pinnedConversations = useMemo(
    () => filteredConversations.filter((conversation) => conversation.isPinned),
    [filteredConversations]
  );
  const regularConversations = useMemo(
    () => filteredConversations.filter((conversation) => !conversation.isPinned),
    [filteredConversations]
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
    <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#efeae2] shadow-[0_24px_70px_rgba(30,41,59,0.14)]">
      <div className="border-b border-black/10 bg-[#f0f2f5] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <MessageCircleMore className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-zinc-900">Mesajlar</p>
            <p className="text-xs text-zinc-500">{getSearchHint(filteredConversations.length)}</p>
          </div>
          <Link
            href="/messages/groups/new"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4" />
            Grup
          </Link>
        </div>

        <div className="mt-3 rounded-2xl bg-white px-3 py-2 shadow-sm">
          <label className="flex items-center gap-2 text-zinc-500">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sohbetlerde ara"
              className="h-7 w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>
      </div>

      <Tabs defaultValue="chats" className="bg-white">
        <div className="border-b border-black/10 bg-[#f0f2f5] px-4 py-2">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-full bg-white p-1 shadow-sm">
            <TabsTrigger value="chats" className="rounded-full text-sm font-medium text-zinc-600 data-[state=active]:bg-[#efeae2] data-[state=active]:text-zinc-900">
              Tüm sohbetler
            </TabsTrigger>
            <TabsTrigger value="people" className="rounded-full text-sm font-medium text-zinc-600 data-[state=active]:bg-[#efeae2] data-[state=active]:text-zinc-900">
              Yeni sohbet
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chats" className="m-0 bg-white">
          {filteredConversations.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-zinc-400" />
              <p className="mt-2 text-sm text-zinc-500">Aramaya uyan sohbet bulunamadı.</p>
            </div>
          ) : null}

          {pinnedConversations.length > 0 ? (
            <div className="border-b border-black/10 bg-[#f8f9fb] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Sabitlenmiş sohbetler
            </div>
          ) : null}
          {pinnedConversations.map((conversation) => (
            <ConversationRow key={conversation.id} conversation={conversation} pinned />
          ))}

          {groupedConversations.map((group) => (
            <div key={group.label}>
              <div className="border-b border-t border-black/10 bg-[#f8f9fb] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {group.label}
              </div>
              {group.items.map((conversation) => (
                <ConversationRow key={conversation.id} conversation={conversation} />
              ))}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="people" className="m-0 bg-[#f7f8fa] p-4">
          <MessagesUserSearch currentUserId={currentUserId} />
          <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm">
            İsimle arayıp doğrudan yeni konuşma başlatabilirsin.
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
