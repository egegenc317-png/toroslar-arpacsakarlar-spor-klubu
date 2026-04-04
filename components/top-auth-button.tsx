"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

type MessageAlert = {
  id: string;
  peer: string;
  body: string;
  createdAt: string;
  isGroup?: boolean;
};

export function TopAuthButton({
  isLoggedIn,
  userId,
  userImage,
  unreadCount = 0,
  notificationHref = "/notifications",
  compact = false
}: {
  isLoggedIn: boolean;
  userId?: string;
  userImage?: string | null;
  unreadCount?: number;
  notificationHref?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadCount);
  const [toastAlert, setToastAlert] = useState<MessageAlert | null>(null);
  const storageKey = "mahalle:shell-unread-count";
  const lastUnreadCountRef = useRef(unreadCount);
  const lastMessageNotificationKeyRef = useRef("");

  useEffect(() => {
    setLiveUnreadCount(unreadCount);
    lastUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (!isLoggedIn) return;

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => "default");
    }

    let cancelled = false;
    let intervalId: number | null = null;
    let eventSource: EventSource | null = null;
    let notificationsEventSource: EventSource | null = null;
    let toastTimer: number | null = null;

    const showMessageNotification = (messageAlert: MessageAlert) => {
      const notificationKey = `${messageAlert.id}:${messageAlert.createdAt}`;
      if (lastMessageNotificationKeyRef.current === notificationKey) return;
      lastMessageNotificationKeyRef.current = notificationKey;

      setToastAlert(messageAlert);
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        setToastAlert((current) => (current && `${current.id}:${current.createdAt}` === notificationKey ? null : current));
      }, 5000);

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const title = messageAlert.isGroup
          ? `${messageAlert.peer} grubunda yeni mesaj`
          : `${messageAlert.peer} sana mesaj gönderdi`;
        const notification = new Notification(title, {
          body: messageAlert.body || "Yeni mesajın var.",
          tag: notificationKey
        });
        notification.onclick = () => {
          window.focus();
          window.location.href = `/messages/${messageAlert.id}`;
        };
      }
    };

    const maybeRefreshConversationsAndNotify = async (nextUnreadCount: number) => {
      const previousUnreadCount = lastUnreadCountRef.current;
      lastUnreadCountRef.current = nextUnreadCount;
      window.dispatchEvent(new CustomEvent("mahalle:refresh-conversations"));

      if (nextUnreadCount <= previousUnreadCount) return;

      try {
        const res = await fetch("/api/notifications/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const firstMessageAlert = Array.isArray(data?.messageAlerts) ? data.messageAlerts[0] : null;
        if (!firstMessageAlert) return;
        showMessageNotification(firstMessageAlert);
      } catch {
        // Bildirim fetch'i hata verse de üst bar akmaya devam etsin.
      }
    };

    const loadSummary = async () => {
      try {
        const res = await fetch("/api/me/shell-summary", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.unreadCount === "number") {
          setLiveUnreadCount(data.unreadCount);
          void maybeRefreshConversationsAndNotify(data.unreadCount);
          try {
            window.sessionStorage.setItem(storageKey, String(data.unreadCount));
          } catch {
            // ignore storage issues
          }
        }
      } catch {
        // Bildirim özeti hata verse bile üst bar akıcı kalmalı.
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadSummary();
      }
    };

    try {
      const cachedUnread = window.sessionStorage.getItem(storageKey);
      if (cachedUnread !== null) {
        const parsed = Number(cachedUnread);
        if (!Number.isNaN(parsed)) setLiveUnreadCount(parsed);
      }
    } catch {
      // ignore cache issues
    }

    loadSummary();

    try {
      eventSource = new EventSource("/api/me/shell-summary/stream");
      eventSource.addEventListener("summary", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          if (!cancelled && typeof data?.unreadCount === "number") {
            setLiveUnreadCount(data.unreadCount);
            void maybeRefreshConversationsAndNotify(data.unreadCount);
            try {
              window.sessionStorage.setItem(storageKey, String(data.unreadCount));
            } catch {
              // ignore storage issues
            }
          }
        } catch {
          // ignore malformed payloads
        }
      });
      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch {
      // SSE desteklenmezse polling fallback devam eder.
    }

    try {
      notificationsEventSource = new EventSource("/api/notifications/stream");
      notificationsEventSource.addEventListener("notifications", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          const firstMessageAlert = Array.isArray(data?.messageAlerts) ? data.messageAlerts[0] : null;
          if (!cancelled) {
            window.dispatchEvent(new CustomEvent("mahalle:refresh-conversations"));
            if (firstMessageAlert) {
              showMessageNotification(firstMessageAlert);
            }
          }
        } catch {
          // ignore malformed notification payloads
        }
      });
      notificationsEventSource.onerror = () => {
        notificationsEventSource?.close();
      };
    } catch {
      // canlı bildirim stream'i desteklenmezse summary fallback devam eder.
    }

    intervalId = window.setInterval(refreshIfVisible, 8000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("mahalle:refresh-summary", refreshIfVisible as EventListener);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      if (toastTimer) window.clearTimeout(toastTimer);
      eventSource?.close();
      notificationsEventSource?.close();
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("mahalle:refresh-summary", refreshIfVisible as EventListener);
    };
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <Button asChild size="sm" variant="outline" className={compact ? "h-9 rounded-xl px-2.5 text-xs font-semibold" : undefined}>
        <Link href="/auth/login" prefetch>
          Profile Giriş Yap
        </Link>
      </Button>
    );
  }

  return (
    <div className={`inline-flex max-w-full items-center ${compact ? "gap-1" : "gap-2"}`}>
      {toastAlert ? (
        <button
          type="button"
          onClick={() => {
            setToastAlert(null);
            router.push(`/messages/${toastAlert.id}`);
          }}
          className="fixed right-3 top-[5.25rem] z-[70] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-amber-200 bg-white/97 px-4 py-3 text-left shadow-[0_16px_40px_rgba(180,120,45,0.18)] backdrop-blur sm:right-4 sm:top-[6rem] sm:max-w-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Yeni Mesaj</p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{toastAlert.peer}</p>
          <p className="mt-1 truncate text-sm text-zinc-600">{toastAlert.body || "Yeni mesajın var."}</p>
        </button>
      ) : null}
      <Button asChild type="button" size="icon" variant="outline" className={`relative shrink-0 border-amber-200 bg-white ${compact ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-full"}`}>
        <Link href={notificationHref} prefetch aria-label="Bildirimler">
          <Bell className={`${compact ? "h-4.5 w-4.5" : "h-6 w-6"} text-amber-700`} />
          {liveUnreadCount > 0 ? (
            <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          ) : null}
          {liveUnreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
              {liveUnreadCount > 9 ? "9+" : liveUnreadCount}
            </span>
          ) : null}
        </Link>
      </Button>

      {userId ? (
        <Link href={`/profile/${userId}`} prefetch aria-label="Profilim" className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-amber-200 bg-amber-50 ${compact ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-full"}`}>
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt="Profil" className="h-full w-full object-cover" />
          ) : (
            <span className={compact ? "text-sm font-bold text-amber-700" : "text-lg font-bold text-amber-700"}>P</span>
          )}
        </Link>
      ) : null}

      <Button
        type="button"
        size={compact ? "icon" : "sm"}
        variant="outline"
        aria-label="Çıkış Yap"
        className={compact ? "h-9 w-9 shrink-0 rounded-xl border-amber-200 bg-white" : undefined}
        onClick={async () => {
          await signOut({ redirect: false });
          router.push("/auth/login");
          router.refresh();
        }}
      >
        {compact ? <LogOut className="h-4 w-4" /> : "Çıkış Yap"}
      </Button>
    </div>
  );
}
