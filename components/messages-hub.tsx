"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCheck,
  Flame,
  Pin,
  Plus,
  Search,
  Sparkles,
  Star,
  UsersRound
} from "lucide-react";

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
  isUnread?: boolean;
  memberCount?: number;
  lastSenderName?: string | null;
};

type FilterKey = "all" | "unread" | "groups" | "mentions" | "pinned";

function getConversationGroupLabel(value?: string) {
  if (!value) return "Daha Eski";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Daha Eski";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return "Bugun";
  if (target.getTime() === yesterday.getTime()) return "Dun";

  return date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

function getAvatarLabel(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

function getPreviewLine(conversation: ConversationListItem) {
  if (conversation.isGroup && conversation.lastSenderName && !conversation.deliveryStatus) {
    return `${conversation.lastSenderName}: ${conversation.preview}`;
  }
  return conversation.preview;
}

function StatCard({
  label,
  value,
  hint,
  active = false
}: {
  label: string;
  value: string;
  hint: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border px-4 py-4 shadow-sm transition ${
        active
          ? "border-orange-300 bg-[linear-gradient(135deg,#fff4e2_0%,#fff0db_45%,#ffffff_100%)] shadow-[0_18px_50px_rgba(234,120,36,0.16)]"
          : "border-white/60 bg-white/78 backdrop-blur"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function ConversationRow({ conversation }: { conversation: ConversationListItem }) {
  const previewLine = getPreviewLine(conversation);

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={`group block rounded-[24px] border px-3 py-3 transition ${
        conversation.isUnread
          ? "border-orange-200 bg-[linear-gradient(135deg,#fff8ef_0%,#fff0da_42%,#ffffff_100%)] shadow-[0_18px_48px_rgba(234,120,36,0.10)]"
          : "border-white/70 bg-white/86 shadow-sm hover:border-amber-100 hover:bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {conversation.image ? (
            <Image
              src={conversation.image}
              alt={conversation.peer}
              width={56}
              height={56}
              className="h-14 w-14 rounded-[20px] object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-lg font-semibold text-white shadow-[0_14px_35px_rgba(234,120,36,0.22)]">
              {conversation.isGroup ? <UsersRound className="h-5 w-5" /> : getAvatarLabel(conversation.peer)}
            </div>
          )}
          {conversation.isUnread ? (
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-orange-500" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-[16px] font-semibold tracking-tight text-zinc-900">{conversation.peer}</p>
                {conversation.isPinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                    <Pin className="h-3 w-3" />
                    Sabit
                  </span>
                ) : null}
                {conversation.hasMention ? (
                  <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                    @sen
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-[12px] text-zinc-500">{conversation.title}</p>
                {conversation.isGroup && conversation.memberCount ? (
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                    {conversation.memberCount} kisi
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className={`text-[11px] ${conversation.isUnread ? "font-semibold text-orange-700" : "text-zinc-500"}`}>{conversation.time}</span>
              {conversation.isUnread ? (
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Yeni
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {conversation.deliveryStatus ? (
              <CheckCheck
                className={`h-4 w-4 shrink-0 ${
                  conversation.deliveryStatus === "seen" ? "text-orange-700" : "text-zinc-400"
                }`}
              />
            ) : null}
            <p className="truncate text-[13px] leading-6 text-zinc-600">{previewLine}</p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
            <span className="truncate">{conversation.lastActivityAt ? getConversationGroupLabel(conversation.lastActivityAt) : "Bugun"}</span>
            <span className="opacity-0 transition group-hover:opacity-100">Ac</span>
          </div>
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
  const [filter, setFilter] = useState<FilterKey>("all");

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
  const filteredByQuery = useMemo(
    () =>
      liveConversations.filter((conversation) => {
        if (!normalizedQuery) return true;
        return [conversation.peer, conversation.preview, conversation.title, conversation.lastSenderName || ""].some(
          (value) => value.toLowerCase().includes(normalizedQuery)
        );
      }),
    [liveConversations, normalizedQuery]
  );

  const summary = useMemo(
    () => ({
      total: liveConversations.length,
      unread: liveConversations.filter((conversation) => conversation.isUnread).length,
      groups: liveConversations.filter((conversation) => conversation.isGroup).length,
      mentions: liveConversations.filter((conversation) => conversation.hasMention).length,
      pinned: liveConversations.filter((conversation) => conversation.isPinned).length
    }),
    [liveConversations]
  );

  const filteredConversations = useMemo(() => {
    switch (filter) {
      case "unread":
        return filteredByQuery.filter((conversation) => conversation.isUnread);
      case "groups":
        return filteredByQuery.filter((conversation) => conversation.isGroup);
      case "mentions":
        return filteredByQuery.filter((conversation) => conversation.hasMention);
      case "pinned":
        return filteredByQuery.filter((conversation) => conversation.isPinned);
      default:
        return filteredByQuery;
    }
  }, [filter, filteredByQuery]);

  const groupedConversations = useMemo(
    () =>
      filteredConversations.reduce(
        (groups, conversation) => {
          const label = conversation.isPinned ? "Sabitlenmis" : getConversationGroupLabel(conversation.lastActivityAt);
          const existing = groups.find((group) => group.label === label);
          if (existing) {
            existing.items.push(conversation);
          } else {
            groups.push({ label, items: [conversation] });
          }
          return groups;
        },
        [] as Array<{ label: string; items: ConversationListItem[] }>
      ),
    [filteredConversations]
  );

  const spotlightConversation =
    filteredConversations.find((conversation) => conversation.hasMention) ||
    filteredConversations.find((conversation) => conversation.isUnread) ||
    filteredConversations[0] ||
    null;

  const filterChips: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "all", label: "Tum Akis", count: summary.total },
    { key: "unread", label: "Yeni", count: summary.unread },
    { key: "groups", label: "Gruplar", count: summary.groups },
    { key: "mentions", label: "Etiketler", count: summary.mentions },
    { key: "pinned", label: "Sabitler", count: summary.pinned }
  ];

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-amber-200/70 bg-[linear-gradient(135deg,#fff8ef_0%,#fff2dd_18%,#ffffff_52%,#fff8ef_100%)] shadow-[0_30px_90px_rgba(120,67,18,0.16)]">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-orange-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl" />

      <Tabs defaultValue="inbox" className="relative">
        <div className="border-b border-amber-100/80 bg-[linear-gradient(135deg,#fff0d8_0%,#ffe9c9_38%,#fff7ea_100%)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Conversation OS
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-900 sm:text-[2.4rem]">
                Mahallenin en canlı konuşmaları tek yerde.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-[15px]">
                Daha akıllı keşif, daha net önceliklendirme ve daha rafine mesaj vitrinleriyle sohbet deneyimini üst seviyeye taşıdık.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TabsList className="grid h-11 grid-cols-2 rounded-full bg-white/90 p-1 shadow-sm">
                <TabsTrigger
                  value="inbox"
                  className="rounded-full px-4 text-sm font-semibold text-zinc-600 data-[state=active]:bg-zinc-900 data-[state=active]:text-white"
                >
                  Gelen kutusu
                </TabsTrigger>
                <TabsTrigger
                  value="discover"
                  className="rounded-full px-4 text-sm font-semibold text-zinc-600 data-[state=active]:bg-zinc-900 data-[state=active]:text-white"
                >
                  Yeni sohbet
                </TabsTrigger>
              </TabsList>
              <Link
                href="/messages/groups/new"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
                Grup kur
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Toplam" value={String(summary.total)} hint="Tarihsel olarak tum sohbetler" active />
            <StatCard label="Yeni" value={String(summary.unread)} hint="Okunmamis hareket bekleyen alanlar" />
            <StatCard label="Gruplar" value={String(summary.groups)} hint="Topluluk ve ekip kanallari" />
            <StatCard label="Etiket" value={String(summary.mentions)} hint="Dogrudan dikkat gerektiren mesajlar" />
          </div>
        </div>

        <TabsContent value="inbox" className="m-0">
          <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-white/70 bg-white/82 p-3 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <label className="flex min-h-[52px] flex-1 items-center gap-3 rounded-[22px] border border-amber-100 bg-[#fffaf4] px-4 text-zinc-500">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Sohbet, mesaj, kisi veya baslik ara"
                      className="h-11 w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filterChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => setFilter(chip.key)}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                          filter === chip.key
                            ? "bg-zinc-900 text-white shadow-sm"
                            : "bg-[#fff7ec] text-zinc-600 hover:bg-[#fff0db]"
                        }`}
                      >
                        <span>{chip.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                            filter === chip.key ? "bg-white/15 text-white" : "bg-black/5 text-zinc-600"
                          }`}
                        >
                          {chip.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredConversations.length === 0 ? (
                <div className="rounded-[30px] border border-dashed border-amber-200 bg-white/86 px-6 py-12 text-center shadow-sm">
                  <Sparkles className="mx-auto h-5 w-5 text-zinc-400" />
                  <p className="mt-3 text-lg font-semibold text-zinc-800">Bu filtrede sohbet bulunamadi.</p>
                  <p className="mt-1 text-sm text-zinc-500">Filtreyi degistir veya arama terimini sadeleştir.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedConversations.map((group) => (
                    <div key={group.label} className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                          {group.label}
                        </p>
                        <span className="text-[11px] text-zinc-400">{group.items.length} sohbet</span>
                      </div>
                      <div className="space-y-3">
                        {group.items.map((conversation) => (
                          <ConversationRow key={conversation.id} conversation={conversation} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,#fff5e6_0%,#fff2dd_50%,#ffffff_100%)] p-5 shadow-sm">
                <div className="flex items-center gap-2 text-zinc-900">
                  <Star className="h-4.5 w-4.5 text-orange-500" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Spotlight</p>
                </div>
                {spotlightConversation ? (
                  <div className="mt-4 rounded-[24px] border border-amber-200/70 bg-white/88 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      {spotlightConversation.image ? (
                        <Image
                          src={spotlightConversation.image}
                          alt={spotlightConversation.peer}
                          width={52}
                          height={52}
                          className="h-[52px] w-[52px] rounded-[18px] object-cover"
                        />
                      ) : (
                        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                          {spotlightConversation.isGroup ? <UsersRound className="h-5 w-5" /> : getAvatarLabel(spotlightConversation.peer)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold tracking-tight text-zinc-900">
                          {spotlightConversation.peer}
                        </p>
                        <p className="truncate text-sm text-zinc-500">{spotlightConversation.title}</p>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-600">
                      {getPreviewLine(spotlightConversation)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {spotlightConversation.isUnread ? (
                        <span className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                          Yeni hareket
                        </span>
                      ) : null}
                      {spotlightConversation.hasMention ? (
                        <span className="rounded-full bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                          Etiketlendi
                        </span>
                      ) : null}
                      {spotlightConversation.isPinned ? (
                        <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
                          Sabit
                        </span>
                      ) : null}
                    </div>
                    <Link
                      href={`/messages/${spotlightConversation.id}`}
                      className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Sohbeti ac
                    </Link>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">Henüz spotlight icin veri yok.</p>
                )}
              </div>

              <div className="rounded-[30px] border border-white/70 bg-white/82 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-zinc-900">
                  <Flame className="h-4.5 w-4.5 text-orange-500" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Oncelik paneli</p>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[22px] bg-[#fff8ef] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Hemen bak</p>
                    <p className="mt-1 text-sm text-zinc-700">
                      {summary.unread > 0
                        ? `${summary.unread} sohbet yeni cevap bekliyor.`
                        : "Tum sohbetler okunmus gorunuyor."}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-[#fff8ef] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Topluluk nabzi</p>
                    <p className="mt-1 text-sm text-zinc-700">
                      {summary.groups > 0
                        ? `${summary.groups} grup odasi aktif. Grup sohbetleri ekip koordinasyonu icin hazir.`
                        : "Henuz aktif grup yok."}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-[#fff8ef] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Kesfet</p>
                    <p className="mt-1 text-sm text-zinc-700">
                      Kişi aramasına geçip yeni bir kanal başlatabilir ya da yeni grup akışı kurabilirsin.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="discover" className="m-0">
          <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="rounded-[30px] border border-white/70 bg-white/84 p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Yeni bir kanal baslat</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Kisi arayarak direkt sohbet acabilir, mevcut ilgi alanina gore yeni bir mahalle grubu kurgulayabilirsin.
              </p>
              <div className="mt-5">
                <MessagesUserSearch currentUserId={currentUserId} />
              </div>
            </div>

            <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,#fff6ea_0%,#ffffff_100%)] p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Hizli notlar</p>
              <div className="mt-4 space-y-3 text-sm text-zinc-600">
                <div className="rounded-[22px] bg-white/88 px-4 py-3 shadow-sm">
                  Direkt sohbetlerde en son hareket eden kanal otomatik olarak yukari tasinir.
                </div>
                <div className="rounded-[22px] bg-white/88 px-4 py-3 shadow-sm">
                  Grup mention akisi ayri filtrede toplanir; yogun gunlerde dikkat dagilmaz.
                </div>
                <div className="rounded-[22px] bg-white/88 px-4 py-3 shadow-sm">
                  Sohbet vitrinindeki spotlight karti, acil aksiyon gereken kanali one cikarir.
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
