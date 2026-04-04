"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, CheckCheck, FileText, Paperclip, Pin, PinOff, SendHorizonal, Smile, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJsonWithTimeout } from "@/lib/client/fetch-json-with-timeout";
import { optimizeUploadImage } from "@/lib/client/optimize-upload-image";
import { normalizeMediaUrl } from "@/lib/media-url";

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string };
  _localPending?: boolean;
  _localPreviewUrl?: string;
};

type MentionUser = {
  id: string;
  name: string;
  username?: string | null;
};

type PinnedMessage = {
  id: string;
  body: string;
  senderName: string;
  createdAt: string;
};

type MessagePayload = Message & {
  sender?: { id: string; name: string };
};

type MessagesStreamPayload = {
  mode?: "reset" | "patch";
  items?: MessagePayload[];
  peerLastSeenAt?: string | null;
};

function buildSnapshotSignature(items: MessagePayload[], peerLastSeenAt: string | null) {
  return JSON.stringify({
    peerLastSeenAt: peerLastSeenAt || null,
    items: items.map((item) => ({
      id: item.id,
      body: item.body,
      senderId: item.senderId,
      createdAt: item.createdAt,
      pending: Boolean(item._localPending)
    }))
  });
}

function mergePatchedMessages(current: Message[], incoming: MessagePayload[]) {
  if (!incoming.length) return current;

  const next = [...current];
  const indexById = new Map(next.map((item, index) => [item.id, index]));

  for (const item of incoming) {
    const normalized: Message = {
      id: item.id,
      body: item.body,
      senderId: item.senderId,
      createdAt: item.createdAt,
      sender: item.sender || { id: item.senderId, name: "Sen" }
    };

    const existingIndex = indexById.get(item.id);
    if (typeof existingIndex === "number") {
      next[existingIndex] = normalized;
      continue;
    }

    indexById.set(item.id, next.length);
    next.push(normalized);
  }

  return next;
}

function formatMessageTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateChip(dateString: string) {
  return new Date(dateString).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

const FILE_MESSAGE_PREFIX = "__FILE__|";
const FILE_JSON_PREFIX = "__FILEJSON__";
const FILE_ONCE_CONSUMED_PREFIX = "__FILE_ONCE_CONSUMED__|";
const SYSTEM_MESSAGE_PREFIX = "__SYSTEM__|";
const QUICK_EMOJIS = [
  "😀", "😁", "😂", "🤣", "😅", "😆", "😉", "😊", "🙂", "🙃",
  "😍", "🥰", "😘", "😗", "😎", "🤩", "🥳", "🤗", "🤔", "🫡",
  "😢", "😭", "😡", "🤯", "😴", "🤐", "🥶", "🥵", "😱", "😬",
  "🙌", "👏", "👍", "👎", "🤝", "🙏", "💪", "🫶", "👌", "👀",
  "🔥", "✨", "⭐", "🌟", "⚡", "💯", "🎉", "🎈", "🎊", "🏆",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "🖤", "💔", "❤️‍🔥",
  "🌹", "🌸", "🌞", "🌙", "☕", "🍀", "🎵", "📸", "📱", "🚀"
];

function buildFileMessage(name: string, url: string, viewOnce = false) {
  return `${FILE_JSON_PREFIX}${JSON.stringify({ name, url, viewOnce })}`;
}

function parseFileMessage(body: string): { name: string; url: string; viewOnce: boolean; consumed: boolean } | null {
  if (body.startsWith(FILE_ONCE_CONSUMED_PREFIX)) {
    return { name: body.slice(FILE_ONCE_CONSUMED_PREFIX.length) || "Tek bakmalık Fotoğraf", url: "", viewOnce: true, consumed: true };
  }

  if (body.startsWith(FILE_JSON_PREFIX)) {
    try {
      const parsed = JSON.parse(body.slice(FILE_JSON_PREFIX.length)) as { name?: string; url?: string; viewOnce?: boolean };
      if (!parsed?.name) return null;
      return {
        name: parsed.name || "Dosya",
        url: normalizeMediaUrl(parsed.url || ""),
        viewOnce: Boolean(parsed.viewOnce),
        consumed: false
      };
    } catch {
      return null;
    }
  }

  if (!body.startsWith(FILE_MESSAGE_PREFIX)) return null;
  const payload = body.slice(FILE_MESSAGE_PREFIX.length);
  const splitIndex = payload.indexOf("|");
  if (splitIndex < 1) return null;
  const name = payload.slice(0, splitIndex).trim();
  const url = payload.slice(splitIndex + 1).trim();
  return { name: name || "Dosya", url: normalizeMediaUrl(url), viewOnce: false, consumed: false };
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(url);
}

function parseSystemMessage(body: string) {
  if (!body.startsWith(SYSTEM_MESSAGE_PREFIX)) return null;
  return body.slice(SYSTEM_MESSAGE_PREFIX.length).trim();
}

function renderMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]+)/g);
  return parts.map((part, index) =>
    /^@[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]+$/.test(part) ? (
      <span key={`${part}-${index}`} className="font-semibold underline decoration-current underline-offset-2">
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

export function ChatClient({
  conversationId,
  currentUserId,
  peerName,
  peerId,
  isGroup = false,
  canPin = false,
  pinnedMessage: initialPinnedMessage = null,
  mentionUsers = []
}: {
  conversationId: string;
  currentUserId: string;
  peerName: string;
  peerId: string;
  isGroup?: boolean;
  canPin?: boolean;
  pinnedMessage?: PinnedMessage | null;
  mentionUsers?: MentionUser[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peerLastSeenAt, setPeerLastSeenAt] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraShot, setCameraShot] = useState<{ file: File; url: string } | null>(null);
  const [viewOnceMode, setViewOnceMode] = useState(true);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(initialPinnedMessage);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportSettling, setViewportSettling] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const snapshotSignatureRef = useRef("");
  const shouldStickToBottomRef = useRef(true);
  const viewportSettleTimerRef = useRef<number | null>(null);
  const notifyShellRefresh = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mahalle:refresh-summary"));
    }
  };

  const applySnapshot = useCallback((items: MessagePayload[], peerSeenAt: string | null) => {
    const safeItems = Array.isArray(items) ? items : [];
    const nextSignature = buildSnapshotSignature(safeItems, peerSeenAt);
    if (snapshotSignatureRef.current === nextSignature) return;

    snapshotSignatureRef.current = nextSignature;
    startTransition(() => {
      setMessages(safeItems);
      setPeerLastSeenAt(peerSeenAt);
      setError(null);
    });
  }, []);

  const applyPatchedSnapshot = useCallback((items: MessagePayload[], peerSeenAt: string | null) => {
    setMessages((prev) => {
      const nextMessages = mergePatchedMessages(prev, items);
      const nextSignature = buildSnapshotSignature(nextMessages, peerSeenAt);
      if (snapshotSignatureRef.current === nextSignature) {
        return prev;
      }

      snapshotSignatureRef.current = nextSignature;
      startTransition(() => {
        setPeerLastSeenAt(peerSeenAt);
        setError(null);
      });
      return nextMessages;
    });
  }, []);

  const replaceOptimisticMessage = useCallback((optimisticId: string, nextMessage: MessagePayload) => {
    let nextMessages: Message[] = [];
    setMessages((prev) => {
      nextMessages = prev.map((message) =>
        message.id === optimisticId
          ? {
              id: nextMessage.id,
              body: nextMessage.body,
              senderId: nextMessage.senderId,
              createdAt: nextMessage.createdAt,
              sender: nextMessage.sender || { id: nextMessage.senderId, name: "Sen" }
            }
          : message
      );
      return nextMessages;
    });
    snapshotSignatureRef.current = buildSnapshotSignature(nextMessages, peerLastSeenAt);
  }, [peerLastSeenAt]);

  const mentionQuery = useMemo(() => {
    const match = body.match(/(?:^|\s)@([a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]*)$/);
    return match ? match[1] : null;
  }, [body]);

  const mentionCandidates = useMemo(() => {
    if (!isGroup || mentionQuery === null) return [] as MentionUser[];
    const q = mentionQuery.toLowerCase();
    return mentionUsers
      .filter((user) => user.id !== currentUserId)
      .filter((user) => {
        const username = (user.username || "").toLowerCase();
        const name = user.name.toLowerCase();
        return !q || username.includes(q) || name.includes(q);
      })
      .slice(0, 6);
  }, [currentUserId, isGroup, mentionQuery, mentionUsers]);

  useEffect(() => {
    setMentionOpen(isGroup && mentionQuery !== null && mentionCandidates.length > 0);
  }, [isGroup, mentionCandidates.length, mentionQuery]);

  useEffect(() => {
    setPinnedMessage(initialPinnedMessage);
  }, [initialPinnedMessage]);

  const insertMention = (user: MentionUser) => {
    const token = `@${user.username || user.name.replace(/\s+/g, "").toLowerCase()}`;
    setBody((prev) => prev.replace(/(?:^|\s)@[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]*$/, (match) => `${match.startsWith(" ") ? " " : ""}${token} `));
    setMentionOpen(false);
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/auth/login");
          return;
        }
        if (res.status === 403) {
          setError("Bu sohbete erisim iznin yok. Konuşma listesine donup yeniden deneyin.");
          return;
        }
        setError("Mesajlar yüklenemedi. Lütfen tekrar dene.");
        return;
      }
      const data = await res.json();
      applySnapshot(
        Array.isArray(data.items) ? data.items : [],
        typeof data.peerLastSeenAt === "string" ? data.peerLastSeenAt : null
      );
    } catch {
      setError("Bağlantı hatası olustu. Internetini kontrol et.");
    }
  }, [applySnapshot, conversationId, router]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackTimer: number | null = null;
    let cancelled = false;

    const startFallbackPolling = () => {
      if (fallbackTimer) return;
      fallbackTimer = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void fetchMessages();
        }
      }, 12000);
    };

    void fetchMessages();

    try {
      eventSource = new EventSource(`/api/conversations/${conversationId}/messages/stream`);
      eventSource.addEventListener("messages", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as MessagesStreamPayload;
          if (cancelled) return;
          if (data?.mode === "patch" && Array.isArray(data?.items)) {
            applyPatchedSnapshot(data.items, typeof data?.peerLastSeenAt === "string" ? data.peerLastSeenAt : null);
            return;
          }
          if (Array.isArray(data?.items)) {
            applySnapshot(data.items, typeof data?.peerLastSeenAt === "string" ? data.peerLastSeenAt : null);
          }
        } catch {
          // ignore malformed SSE payloads
        }
      });
      eventSource.addEventListener("error", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          if (!cancelled && typeof data?.error === "string") {
            setError(data.error);
          }
        } catch {
          // ignore malformed SSE payloads
        }
      });
      eventSource.onerror = () => {
        eventSource?.close();
        startFallbackPolling();
      };
    } catch {
      startFallbackPolling();
    }

    return () => {
      cancelled = true;
      eventSource?.close();
      if (fallbackTimer) window.clearInterval(fallbackTimer);
    };
  }, [applyPatchedSnapshot, applySnapshot, conversationId, fetchMessages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !shouldStickToBottomRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateStickyState = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 96;
    };

    updateStickyState();
    container.addEventListener("scroll", updateStickyState, { passive: true });
    return () => container.removeEventListener("scroll", updateStickyState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const updateViewportInsets = () => {
      const nextInset = Math.max(0, Math.round(window.innerHeight - visualViewport.height - visualViewport.offsetTop));
      const nextKeyboardOpen = nextInset > 120;
      setKeyboardInset((prev) => (prev === nextInset ? prev : nextInset));
      setKeyboardOpen((prev) => (prev === nextKeyboardOpen ? prev : nextKeyboardOpen));
      setViewportSettling(true);

      if (viewportSettleTimerRef.current) {
        window.clearTimeout(viewportSettleTimerRef.current);
      }
      viewportSettleTimerRef.current = window.setTimeout(() => {
        setViewportSettling(false);
      }, 180);

      if (nextKeyboardOpen) {
        shouldStickToBottomRef.current = true;
        requestAnimationFrame(() => {
          const container = scrollRef.current;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    };

    updateViewportInsets();
    visualViewport.addEventListener("resize", updateViewportInsets);
    visualViewport.addEventListener("scroll", updateViewportInsets);
    window.addEventListener("orientationchange", updateViewportInsets);

    return () => {
      if (viewportSettleTimerRef.current) {
        window.clearTimeout(viewportSettleTimerRef.current);
      }
      visualViewport.removeEventListener("resize", updateViewportInsets);
      visualViewport.removeEventListener("scroll", updateViewportInsets);
      window.removeEventListener("orientationchange", updateViewportInsets);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (cameraShot) {
      URL.revokeObjectURL(cameraShot.url);
      setCameraShot(null);
    }
    setCameraOpen(false);
  }, [cameraShot]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!emojiOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (emojiPickerRef.current?.contains(target)) return;
      if (emojiButtonRef.current?.contains(target)) return;
      setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [emojiOpen]);

  const focusComposer = useCallback(() => {
    shouldStickToBottomRef.current = true;
    window.setTimeout(() => {
      textInputRef.current?.focus();
      const container = scrollRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 80);
  }, []);

  const sendTextMessage = useCallback(async (text: string) => {
    const trimmedBody = text.trim();
    if (!trimmedBody || sending) return;

    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      body: trimmedBody,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, name: "Sen" },
      _localPending: true
    };

    shouldStickToBottomRef.current = true;
    setMessages((prev) => [...prev, optimisticMessage]);
    setError(null);
    setEmojiOpen(false);
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmedBody })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.item) {
          replaceOptimisticMessage(optimisticId, data.item);
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        }
        notifyShellRefresh();
        return;
      }

      if (res.status === 401) {
        router.replace("/auth/login");
        return;
      }

      if (res.status === 403 && !isGroup) {
        window.location.href = `/api/conversations/direct?userId=${encodeURIComponent(peerId)}&contextTitle=${encodeURIComponent(`${peerName} ile Sohbet`)}`;
        return;
      }

      let message = "Mesaj gönderilemedi. Lütfen tekrar dene.";
      try {
        const data = await res.json();
        if (typeof data?.error === "string") message = data.error;
      } catch {}
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError(message);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError("Bağlantı hatası olustu. Internetini kontrol et.");
    } finally {
      setSending(false);
    }
  }, [conversationId, currentUserId, isGroup, peerId, peerName, replaceOptimisticMessage, router, sending]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || sending) return;
    const text = body;
    setBody("");
    await sendTextMessage(text);
  };

  const sendFile = async (file: File, options?: { viewOnce?: boolean }) => {
    if (sending || uploadingFile) return;
    const viewOnce = Boolean(options?.viewOnce);
    const optimizedFile = file.type.startsWith("image/")
      ? await optimizeUploadImage(file, { maxDimension: 1600, quality: 0.82 })
      : file;

    const localPreviewUrl = optimizedFile.type.startsWith("image/") ? URL.createObjectURL(optimizedFile) : undefined;
    const optimisticId = `local-file-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      body: buildFileMessage(optimizedFile.name, "", viewOnce),
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, name: "Sen" },
      _localPending: true,
      _localPreviewUrl: localPreviewUrl
    };

    shouldStickToBottomRef.current = true;
    setMessages((prev) => [...prev, optimisticMessage]);
    setError(null);
    setSending(true);
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", optimizedFile);
      const { response: uploadRes, data: uploadData } = await fetchJsonWithTimeout("/api/upload", { method: "POST", body: fd }, 30000);
      if (!uploadRes.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setError(uploadData?.error || "Dosya yüklenemedi. Lütfen tekrar dene.");
        return;
      }
      const uploadedUrl = typeof uploadData?.url === "string" ? uploadData.url : "";
      if (!uploadedUrl) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setError("Dosya URL'i alınamadı.");
        return;
      }

      const messageRes = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: buildFileMessage(optimizedFile.name, uploadedUrl, viewOnce) })
      });

      if (!messageRes.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setError("Dosya mesajı gönderilemedi.");
        return;
      }

      const messageData = await messageRes.json().catch(() => ({}));
      if (messageData?.item) {
        replaceOptimisticMessage(optimisticId, messageData.item);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
      notifyShellRefresh();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError("Dosya gönderiminde bağlantı hatası olustu.");
    } finally {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setSending(false);
      setUploadingFile(false);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      mediaStreamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      cameraInputRef.current?.click();
    }
  };

  const captureAndSend = async () => {
    const videoEl = videoRef.current;
    const canvasEl = captureCanvasRef.current;
    if (!videoEl || !canvasEl) return;
    if (!videoEl.videoWidth || !videoEl.videoHeight) return;

    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    const blob = await new Promise<Blob | null>((resolve) => canvasEl.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    const file = new File([blob], `kamera-${Date.now()}.jpg`, { type: "image/jpeg" });
    const url = URL.createObjectURL(file);
    if (cameraShot) URL.revokeObjectURL(cameraShot.url);
    setCameraShot({ file, url });
  };

  const sendCapturedPhoto = async () => {
    if (!cameraShot) return;
    const file = cameraShot.file;
    stopCamera();
    await sendFile(file, { viewOnce: viewOnceMode });
  };

  const emptyHint = useMemo(
    () => (isGroup ? `${peerName} grubunda ilk mesajı sen başlat.` : `${peerName} ile sohbeti başlatmak için ilk mesajı gönderebilirsin.`),
    [isGroup, peerName]
  );
  const lastMessageDate = messages.length > 0 ? formatDateChip(messages[messages.length - 1].createdAt) : "";

  const updatePinnedMessage = async (message: Pick<Message, "id" | "body" | "createdAt" | "sender"> | null) => {
    if (!canPin || pinningId) return;
    setPinningId(message?.id || "unpin");
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message?.id || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Sabit mesaj güncellenemedi.");
        setPinningId(null);
        return;
      }
      setPinnedMessage(
        message
          ? {
              id: message.id,
              body: message.body,
              senderName: message.sender.name,
              createdAt: message.createdAt
            }
          : null
      );
    } catch {
      setError("Sabit mesaj güncellenemedi.");
    } finally {
      setPinningId(null);
    }
  };

  const scrollToPinnedMessage = () => {
    if (!pinnedMessage) return;
    const target = messageRefs.current[pinnedMessage.id];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-1 sm:space-y-2">
      <div className="relative overflow-hidden rounded-[18px] border border-amber-200 bg-[linear-gradient(170deg,#fff7ea_0%,#ffeaca_45%,#fff6e7_100%)] p-1.5 sm:rounded-[22px] sm:p-2.5">
        <div className="pointer-events-none absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "radial-gradient(#b98855 0.8px, transparent 0.8px)", backgroundSize: "13px 13px" }} />
        {isGroup && pinnedMessage ? (
          <button
            type="button"
            onClick={scrollToPinnedMessage}
            className="relative z-10 mb-1 block w-full rounded-[18px] border border-amber-200 bg-[linear-gradient(135deg,#fff9ef_0%,#ffe6b8_50%,#fffdf8_100%)] px-2.5 py-2 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md sm:mb-1.5 sm:rounded-2xl sm:px-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                  <Pin className="h-3.5 w-3.5" />
                  Sabitlenen Mesaj
                </p>
                <p className="mt-1 truncate text-xs font-medium text-zinc-800">{pinnedMessage.senderName}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-zinc-700">{parseSystemMessage(pinnedMessage.body) || parseFileMessage(pinnedMessage.body)?.name || pinnedMessage.body}</p>
              </div>
              {canPin ? (
                <button
                  type="button"
                  onClick={() => void updatePinnedMessage(null)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white/90 text-amber-700 transition hover:bg-white"
                  aria-label="Sabit mesajı kaldır"
                >
                  <PinOff className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </button>
        ) : null}
        {lastMessageDate ? (
          <div className="relative z-10 mx-auto mb-1 w-fit rounded-full border border-amber-200 bg-white/85 px-2.5 py-1 text-[10px] font-medium text-zinc-600 sm:mb-2 sm:px-3 sm:text-[11px]">
            {lastMessageDate}
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="relative z-10 max-h-[64vh] space-y-1 overflow-y-auto rounded-[18px] bg-white/35 p-1 sm:max-h-[62vh] sm:space-y-1.5 sm:rounded-2xl sm:p-2.5"
          style={
            keyboardOpen
              ? {
                  maxHeight: `calc(100svh - ${Math.min(320, keyboardInset + 220)}px)`,
                  paddingBottom: `${Math.min(28, Math.max(10, keyboardInset * 0.08))}px`
                }
              : undefined
          }
        >
          {messages.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-amber-200 bg-white/95 px-3 py-6 text-center text-sm text-zinc-500 sm:rounded-2xl sm:py-7">{emptyHint}</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === currentUserId;
              const pending = Boolean(m._localPending);
              const seen = peerLastSeenAt ? new Date(peerLastSeenAt).getTime() >= new Date(m.createdAt).getTime() : false;
              const fileMeta = parseFileMessage(m.body);
              const systemText = parseSystemMessage(m.body);
              const previewUrl = fileMeta?.url || m._localPreviewUrl || "";
              if (systemText) {
                return (
                  <div key={m.id} className="py-1">
                    <div className="mx-auto flex w-fit max-w-[94%] items-center gap-1.5 rounded-full border border-amber-200/90 bg-[linear-gradient(135deg,#fffdf8_0%,#fff0d2_48%,#ffffff_100%)] px-2.5 py-1 text-center text-[10px] font-medium text-zinc-700 shadow-[0_8px_25px_rgba(180,120,45,0.12)] sm:max-w-[92%] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px]">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                        <Sparkles className="h-3 w-3" />
                      </span>
                      <span>{systemText}</span>
                      <span className="text-[10px] text-zinc-500">{formatMessageTime(m.createdAt)}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={m.id}
                  ref={(node) => {
                    messageRefs.current[m.id] = node;
                  }}
                  className={`group relative w-fit max-w-[96%] px-2.5 py-1.5 text-[13px] leading-[1.35] shadow-sm sm:max-w-[84%] sm:px-3 sm:text-sm ${mine ? "ml-auto rounded-[15px] rounded-br-[5px] bg-gradient-to-r from-orange-500 to-amber-500 text-white" : "rounded-[15px] rounded-bl-[5px] border border-amber-200 bg-white text-zinc-800"} ${pinnedMessage?.id === m.id ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-[#fff5e6]" : ""}`}
                >
                  {canPin ? (
                    <button
                      type="button"
                      onClick={() => void updatePinnedMessage(m)}
                      disabled={pinningId === m.id}
                      className={`absolute -top-2 ${mine ? "-left-2" : "-right-2"} inline-flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition sm:h-7 sm:w-7 ${pinnedMessage?.id === m.id ? "border-orange-300 bg-orange-500 text-white" : "border-amber-200 bg-white/95 text-amber-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"} disabled:opacity-60`}
                      aria-label="Mesajı sabitle"
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {fileMeta ? (
                    fileMeta.viewOnce && mine ? (
                      <div className="rounded-xl border border-orange-200/50 bg-white/15 px-3 py-3 text-xs font-medium text-orange-50">
                        Tek bakmalık Fotoğraf gönderildi.
                      </div>
                    ) : fileMeta.consumed ? (
                      <div className={`rounded-xl border px-3 py-3 text-xs font-medium ${mine ? "border-orange-200/50 bg-white/15 text-orange-50" : "border-amber-200 bg-amber-50/40 text-zinc-700"}`}>
                        Bu tek bakmalık Fotoğraf görüntülendi.
                      </div>
                    ) : fileMeta.viewOnce ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!previewUrl) return;
                          setPreviewImage({ url: previewUrl, name: fileMeta.name });
                          if (!mine) {
                            await fetch(`/api/conversations/${conversationId}/messages/${m.id}/consume`, {
                              method: "POST"
                            });
                            await fetchMessages();
                          }
                        }}
                        className={`block w-full rounded-xl border px-2.5 py-2.5 text-left text-xs font-semibold ${mine ? "border-orange-200/50 bg-white/15 text-orange-50" : "border-amber-200 bg-amber-50/40 text-zinc-700"} sm:px-3 sm:py-3`}
                      >
                        Tek bakmalık Fotoğraf
                      </button>
                    ) :
                    previewUrl && isImageUrl(previewUrl) ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setPreviewImage({ url: previewUrl, name: fileMeta.name });
                          if (fileMeta.viewOnce && !mine) {
                            await fetch(`/api/conversations/${conversationId}/messages/${m.id}/consume`, {
                              method: "POST"
                            });
                            await fetchMessages();
                          }
                        }}
                        className={`block w-full overflow-hidden rounded-[14px] border ${mine ? "border-orange-200/50 bg-white/15" : "border-amber-200 bg-amber-50/40"} sm:rounded-xl`}
                      >
                        <Image
                          src={previewUrl}
                          alt={fileMeta.name}
                          width={960}
                          height={640}
                          className="max-h-[26rem] w-full object-cover"
                          unoptimized
                        />
                      </button>
                    ) : (
                      <a
                        href={previewUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className={`block overflow-hidden rounded-[14px] border ${mine ? "border-orange-200/50 bg-white/15" : "border-amber-200 bg-amber-50/40"} sm:rounded-xl`}
                      >
                        <div className="flex items-center gap-2 px-3 py-3">
                          <FileText className={`h-4 w-4 ${mine ? "text-orange-100" : "text-orange-600"}`} />
                          <span className={`truncate text-xs font-medium ${mine ? "text-orange-50" : "text-zinc-700"}`}>{fileMeta.name}</span>
                        </div>
                      </a>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{renderMentions(m.body)}</p>
                  )}
                  {fileMeta?.viewOnce && !fileMeta.consumed ? (
                    <p className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${mine ? "text-orange-100/90" : "text-orange-600"}`}>Tek bakmalık</p>
                  ) : null}
                  <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] sm:gap-1.5 sm:text-[11px] ${mine ? "text-orange-100" : "text-zinc-500"}`}>
                    <span>{formatMessageTime(m.createdAt)}</span>
                    {mine ? (
                      pending ? (
                        <Check className="h-3.5 w-3.5 text-orange-100/95" />
                      ) : seen ? (
                        <CheckCheck className="h-3.5 w-3.5 text-orange-950" />
                      ) : (
                        <CheckCheck className="h-3.5 w-3.5 text-orange-100/95" />
                      )
                    ) : null}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

      <div
        className="sticky bottom-1 z-30 pb-[env(safe-area-inset-bottom)]"
        style={
          keyboardInset
            ? {
                bottom: `${keyboardInset + 4}px`,
                transition: viewportSettling ? "none" : "bottom 180ms ease-out, transform 180ms ease-out"
              }
            : {
                transition: "bottom 180ms ease-out, transform 180ms ease-out"
              }
        }
      >
        {mentionOpen ? (
          <div className="mb-1.5 overflow-hidden rounded-[18px] border border-amber-200 bg-white/95 shadow-xl shadow-amber-100/60 backdrop-blur sm:mb-2 sm:rounded-2xl">
            {mentionCandidates.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => insertMention(user)}
                className="flex w-full items-center justify-between border-b border-amber-100 px-3 py-2 text-left transition hover:bg-amber-50 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{user.name}</p>
                  <p className="text-xs text-zinc-500">@{user.username || "kullanıcı"}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">Etiketle</span>
              </button>
            ))}
          </div>
        ) : null}
        {emojiOpen ? (
          <div ref={emojiPickerRef} className="absolute bottom-full left-0 right-0 mb-1.5 rounded-[18px] border border-amber-200 bg-white/95 p-2 shadow-xl shadow-amber-100/60 backdrop-blur sm:mb-2 sm:rounded-2xl">
            <div className="mb-1 flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Emoji</p>
              <button
                type="button"
                onClick={() => setEmojiOpen(false)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition hover:bg-amber-50 hover:text-amber-700"
                aria-label="Emoji panelini kapat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto pr-1 sm:max-h-52">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setBody((prev) => `${prev}${emoji}`)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-amber-50"
                  aria-label={`Emoji ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form
          onSubmit={send}
          className="flex items-center gap-0.5 rounded-[18px] border border-amber-200 bg-white/95 p-1 shadow-lg shadow-amber-100/60 backdrop-blur sm:gap-1.5 sm:rounded-2xl sm:p-2"
          style={{
            transform: keyboardOpen ? "translateY(0)" : "translateY(0)",
            transition: viewportSettling ? "none" : "box-shadow 180ms ease-out, transform 180ms ease-out"
          }}
        >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) void sendFile(selected, { viewOnce: false });
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) void sendFile(selected, { viewOnce: true });
            e.currentTarget.value = "";
          }}
        />
        <div className="relative">
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => setEmojiOpen((prev) => !prev)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-amber-50 hover:text-amber-700 sm:h-9 sm:w-9"
            aria-label="Emoji"
          >
            <Smile className="h-4.5 w-4.5" />
          </button>
        </div>

        <Input
          ref={textInputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={focusComposer}
          placeholder={`${peerName} için bir mesaj yaz...`}
          className="h-9 min-w-0 rounded-full border-amber-200 bg-white px-2.5 text-[13px] focus-visible:ring-orange-300 sm:h-10 sm:px-3 sm:text-sm"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || uploadingFile}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 sm:h-9 sm:w-9"
          aria-label="Ek dosya"
        >
          <Paperclip className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={() => void openCamera()}
          disabled={sending || uploadingFile}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 sm:h-9 sm:w-9"
          aria-label="Kamera"
        >
          <Camera className="h-4.5 w-4.5" />
        </button>

        <Button type="submit" disabled={sending || uploadingFile || !body.trim()} className="h-9 shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 text-white hover:from-orange-600 hover:to-amber-600 sm:h-10 sm:px-4">
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </form>
      </div>

      {previewImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow hover:bg-white"
            aria-label="Onizlemeyi kapat"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/25 bg-black/20 shadow-2xl">
            <Image
              src={previewImage.url}
              alt={previewImage.name}
              width={1600}
              height={1200}
              className="max-h-[82vh] w-full object-contain"
              unoptimized
            />
          </div>
        </div>
      ) : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
            <button
              type="button"
              onClick={stopCamera}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow hover:bg-white"
              aria-label="Kamerayi kapat"
            >
              <X className="h-4 w-4" />
            </button>
            {cameraShot ? (
              <Image
                src={cameraShot.url}
                alt="Çekilen Fotoğraf"
                width={1280}
                height={960}
                className="h-[60vh] w-full bg-black object-contain"
                unoptimized
              />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-[60vh] w-full bg-black object-cover" />
            )}
            <div className="flex items-center justify-between bg-zinc-950/90 px-4 py-3">
              <p className="text-xs text-zinc-200">{cameraShot ? "Bu fotoğrafı göndermek istiyor musun?" : "Canlı kamera"}</p>
              <div className="flex items-center gap-2">
                {cameraShot ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewOnceMode((prev) => !prev)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${viewOnceMode ? "border-amber-300 bg-amber-500/30 text-amber-100" : "border-white/30 bg-white/10 text-white"}`}
                    >
                      Tek bakmalık: {viewOnceMode ? "Açık" : "Kapalı"}
                    </button>
                    <Button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(cameraShot.url);
                        setCameraShot(null);
                      }}
                      className="rounded-full border border-white/30 bg-white/10 px-4 text-white hover:bg-white/20"
                    >
                      Tekrar Çek
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void sendCapturedPhoto()}
                      disabled={sending || uploadingFile}
                      className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-white hover:from-orange-600 hover:to-amber-600"
                    >
                      Gönder
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void captureAndSend()}
                    disabled={sending || uploadingFile}
                    className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-white hover:from-orange-600 hover:to-amber-600"
                  >
                    Çek
                  </Button>
                )}
              </div>
            </div>
          </div>
          <canvas ref={captureCanvasRef} className="hidden" />
        </div>
      ) : null}
    </div>
  );
}





