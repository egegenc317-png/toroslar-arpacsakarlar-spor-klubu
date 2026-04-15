"use client";

import { useEffect, useState } from "react";
import { Search, UserRoundPlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { StartConversationLink } from "@/components/start-conversation-link";

type UserItem = {
  id: string;
  name: string;
  username?: string | null;
};

function getInitial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "?";
}

export function MessagesUserSearch({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserItem[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setItems([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        const rows = Array.isArray(data.items) ? data.items : [];
        setItems(rows.filter((item: UserItem) => item.id !== currentUserId));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  return (
    <div className="space-y-3 rounded-[26px] border border-amber-200/70 bg-[linear-gradient(135deg,#fff7ee_0%,#ffffff_100%)] p-4 shadow-sm">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        <UserRoundPlus className="h-3.5 w-3.5" />
        Kişi Ara ve Mesaj Başlat
      </p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İsim veya Kullanıcı adı yaz..."
          className="h-12 rounded-2xl border-amber-200 bg-white pl-9 shadow-sm"
        />
      </div>
      {loading ? <p className="text-xs text-zinc-500">Aranıyor...</p> : null}
      {!loading && query.trim().length >= 2 && items.length === 0 ? (
        <p className="text-xs text-zinc-500">Eşleşen Kullanıcı bulunamadı.</p>
      ) : null}
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <StartConversationLink
              key={item.id}
              href={`/api/conversations/direct?userId=${encodeURIComponent(item.id)}&contextTitle=${encodeURIComponent(`${item.name} ile Sohbet`)}`}
              className="block rounded-[22px] border border-amber-100 bg-white px-3 py-3 text-sm text-zinc-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50/40"
              loadingLabel="Sohbet açılıyor..."
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-semibold text-white">
                  {getInitial(item.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{item.name}</p>
                  <p className="truncate text-xs text-zinc-600">@{item.username || "Kullanıcı"}</p>
                </div>
              </div>
            </StartConversationLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}
