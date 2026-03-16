import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Building2, Eye, FileText, MessageCircle, Megaphone, ShieldCheck, UserPlus, Users } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminUser = {
  id: string;
  name: string;
  username?: string | null;
  createdAt: Date | string;
  lastActiveAt?: Date | string | null;
  neighborhoodId?: string | null;
  accountType?: string | null;
  neighborhood?: {
    city: string;
    district: string;
    name: string;
  } | null;
};

type NeighborhoodSummary = {
  id: string;
  city: string;
  district: string;
  name: string;
};

type NeighborhoodListing = {
  neighborhoodId: string;
};

type NeighborhoodPost = {
  neighborhoodId: string;
  createdAt?: Date | string;
};

type ActivityMessage = {
  createdAt: Date | string;
};

type WeeklyUsageRow = {
  userId: string;
  seconds: number;
  updatedAt?: Date | string;
};

type SiteVisitRow = {
  visitorId: string;
  userId?: string | null;
  dateKey: string;
  pageCount: number;
  createdAt: Date | string;
};

type SitePageViewRow = {
  visitorId: string;
  userId?: string | null;
  neighborhoodId?: string | null;
  dateKey: string;
  path: string;
  viewCount: number;
  createdAt: Date | string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

const statCards = [
  {
    key: "totalUsers",
    title: "Toplam Hesap",
    icon: Users,
    accent: "from-[#f59e0b] to-[#ea580c]"
  },
  {
    key: "todayUsers",
    title: "Bugün Açılan Hesap",
    icon: UserPlus,
    accent: "from-[#f97316] to-[#fb923c]"
  },
  {
    key: "onlineUsers",
    title: "Şu An Online",
    icon: Activity,
    accent: "from-[#16a34a] to-[#22c55e]"
  },
  {
    key: "totalListings",
    title: "Toplam İlan",
    icon: FileText,
    accent: "from-[#2563eb] to-[#38bdf8]"
  },
  {
    key: "totalBoardPosts",
    title: "Toplam Duyuru",
    icon: Megaphone,
    accent: "from-[#d97706] to-[#f59e0b]"
  },
  {
    key: "businessUsers",
    title: "Toplam İşletme",
    icon: Building2,
    accent: "from-[#7c3aed] to-[#a855f7]"
  },
  {
    key: "totalMessages",
    title: "Toplam Mesaj",
    icon: MessageCircle,
    accent: "from-[#0f766e] to-[#14b8a6]"
  },
  {
    key: "openReports",
    title: "Açık Rapor",
    icon: ShieldCheck,
    accent: "from-[#dc2626] to-[#f97316]"
  },
  {
    key: "dailyVisitors",
    title: "Günlük Görüntüleme",
    icon: Eye,
    accent: "from-[#0f766e] to-[#2dd4bf]"
  },
  {
    key: "weeklyVisitors",
    title: "Haftalık Görüntüleme",
    icon: Eye,
    accent: "from-[#0891b2] to-[#38bdf8]"
  },
  {
    key: "monthlyVisitors",
    title: "Aylık Görüntüleme",
    icon: Eye,
    accent: "from-[#4f46e5] to-[#818cf8]"
  }
] as const;

export default async function AdminPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) redirect("/");

  const [usersRaw, listingsRaw, boardPostsRaw, messagesRaw, reports, neighborhoodsRaw, weeklyUsageRaw, siteVisitsRaw, sitePageViewsRaw] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { neighborhood: true }
    }),
    db.listing.findMany({}),
    db.boardPost.findMany({}),
    db.message.findMany({}),
    db.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } }),
    db.neighborhood.findMany({}),
    db.userWeeklyUsage.findMany({}),
    db.siteVisit.findMany({}),
    db.sitePageView.findMany({})
  ]);

  const users = usersRaw as AdminUser[];
  const listings = listingsRaw as (NeighborhoodListing & { createdAt?: Date | string })[];
  const boardPosts = boardPostsRaw as NeighborhoodPost[];
  const messages = messagesRaw as ActivityMessage[];
  const neighborhoods = neighborhoodsRaw as NeighborhoodSummary[];
  const weeklyUsage = weeklyUsageRaw as WeeklyUsageRow[];
  const siteVisits = siteVisitsRaw as SiteVisitRow[];
  const sitePageViews = sitePageViewsRaw as SitePageViewRow[];

  const today = startOfToday();
  const onlineThreshold = minutesAgo(5);
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekThreshold = new Date();
  weekThreshold.setDate(weekThreshold.getDate() - 6);
  weekThreshold.setHours(0, 0, 0, 0);
  const monthThreshold = new Date();
  monthThreshold.setDate(monthThreshold.getDate() - 29);
  monthThreshold.setHours(0, 0, 0, 0);

  const dailyVisitors = siteVisits.filter((visit) => visit.dateKey === todayKey).length;
  const weeklyVisitors = siteVisits.filter((visit) => new Date(visit.createdAt) >= weekThreshold).length;
  const monthlyVisitors = siteVisits.filter((visit) => new Date(visit.createdAt) >= monthThreshold).length;

  const stats = {
    totalUsers: users.length,
    todayUsers: users.filter((user) => new Date(user.createdAt) >= today).length,
    onlineUsers: users.filter((user) => user.lastActiveAt && new Date(user.lastActiveAt) >= onlineThreshold).length,
    totalListings: listings.length,
    totalBoardPosts: boardPosts.length,
    businessUsers: users.filter((user) => user.accountType === "BUSINESS").length,
    totalMessages: messages.length,
    openReports: reports.length,
    dailyVisitors,
    weeklyVisitors,
    monthlyVisitors
  };

  const recentUsers = users.slice(0, 6);
  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  const uniqueVisitorTrend = last7Days.map((date) => {
    const dateKey = date.toISOString().slice(0, 10);
    return {
      label: formatDayLabel(date),
      uniqueVisitors: new Set(siteVisits.filter((visit) => visit.dateKey === dateKey).map((visit) => visit.visitorId)).size
    };
  });

  const maxUniqueVisitors = Math.max(...uniqueVisitorTrend.map((item) => item.uniqueVisitors), 1);

  const dailyActivity = last7Days.map((date) => {
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const label = formatDayLabel(date);
    const userCount = users.filter((user) => new Date(user.createdAt) >= date && new Date(user.createdAt) < next).length;
    const listingCount = listings.filter((listing) => listing.createdAt && new Date(listing.createdAt) >= date && new Date(listing.createdAt) < next).length;
    const postCount = boardPosts.filter((post) => post.createdAt && new Date(post.createdAt) >= date && new Date(post.createdAt) < next).length;
    const messageCount = messages.filter((message) => new Date(message.createdAt) >= date && new Date(message.createdAt) < next).length;
    const total = userCount + listingCount + postCount + messageCount;

    return {
      label,
      userCount,
      listingCount,
      postCount,
      messageCount,
      total
    };
  });

  const maxDailyActivity = Math.max(...dailyActivity.map((item) => item.total), 1);

  const activeUsers = users
    .map((user) => {
      const totalSeconds = weeklyUsage
        .filter((row) => row.userId === user.id)
        .reduce((sum, row) => sum + row.seconds, 0);

      return {
        ...user,
        totalSeconds
      };
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 8);

  const mostActiveNeighborhoods = neighborhoods
    .map((neighborhood) => {
      const neighborhoodUsers = users.filter((user) => user.neighborhoodId === neighborhood.id);
      const neighborhoodListings = listings.filter((listing) => listing.neighborhoodId === neighborhood.id);
      const neighborhoodPosts = boardPosts.filter((post) => post.neighborhoodId === neighborhood.id);

      return {
        id: neighborhood.id,
        label: `${neighborhood.city} / ${neighborhood.district} / ${neighborhood.name}`,
        users: neighborhoodUsers.length,
        listings: neighborhoodListings.length,
        posts: neighborhoodPosts.length
      };
    })
    .sort((a, b) => b.users + b.listings + b.posts - (a.users + a.listings + a.posts))
    .slice(0, 5);

  const onlineNeighborhoods = neighborhoods
    .map((neighborhood) => {
      const onlineCount = users.filter(
        (user) =>
          user.neighborhoodId === neighborhood.id &&
          user.lastActiveAt &&
          new Date(user.lastActiveAt) >= onlineThreshold
      ).length;

      return {
        id: neighborhood.id,
        label: `${neighborhood.city} / ${neighborhood.district} / ${neighborhood.name}`,
        onlineCount
      };
    })
    .filter((item) => item.onlineCount > 0)
    .sort((a, b) => b.onlineCount - a.onlineCount)
    .slice(0, 8);

  const topPagesMap = sitePageViews.reduce<Record<string, { path: string; views: number; visitors: Set<string> }>>((acc, item) => {
    if (!acc[item.path]) {
      acc[item.path] = { path: item.path, views: 0, visitors: new Set<string>() };
    }
    acc[item.path].views += item.viewCount;
    acc[item.path].visitors.add(item.visitorId);
    return acc;
  }, {});

  const topPages = Object.values(topPagesMap)
    .map((item) => ({
      path: item.path,
      views: item.views,
      uniqueVisitors: item.visitors.size
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const todayNeighborhoodTraffic = neighborhoods
    .map((neighborhood) => {
      const todaysViews = sitePageViews.filter((item) => item.dateKey === todayKey && item.neighborhoodId === neighborhood.id);
      return {
        id: neighborhood.id,
        label: `${neighborhood.city} / ${neighborhood.district} / ${neighborhood.name}`,
        views: todaysViews.reduce((sum, item) => sum + item.viewCount, 0),
        uniqueVisitors: new Set(todaysViews.map((item) => item.visitorId)).size
      };
    })
    .filter((item) => item.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-amber-200 bg-[linear-gradient(135deg,#fff7e6_0%,#fffdf8_45%,#ffe9d4_100%)]">
        <div className="grid gap-5 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div className="space-y-3">
            <span className="inline-flex w-fit rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">Yönetim Merkezi</span>
            <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Dijital Mahallem İstatistikleri</h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-700 sm:text-base">
              Buradan anlık kullanıcı hareketini, açılan hesapları ve içerik yoğunluğunu tek ekranda takip edebilirsin.
              Online sayısı son 5 dakika içinde aktiflik gönderen kullanıcıları baz alır.
            </p>
          </div>
          <div className="grid gap-3 rounded-[26px] border border-amber-200 bg-white/80 p-4 shadow-sm">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Canlı Durum</p>
              <p className="mt-1 text-2xl font-black text-emerald-900">{stats.onlineUsers}</p>
              <p className="text-xs text-emerald-700">son 5 dakikada aktif kullanıcı</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Bugün</p>
              <p className="mt-1 text-2xl font-black text-amber-900">{stats.todayUsers}</p>
              <p className="text-xs text-amber-700">yeni hesap açıldı</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <Card key={card.key} className="overflow-hidden border-amber-200 bg-white">
              <CardContent className="p-0">
                <div className={`h-1.5 bg-gradient-to-r ${card.accent}`} />
                <div className="flex items-start justify-between p-5">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">{card.title}</p>
                    <p className="mt-2 text-3xl font-black text-zinc-950">{value}</p>
                  </div>
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle>Son 7 Günlük Hareket</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">Kayıt, ilan, duyuru ve mesaj toplamına göre günlük hareket özeti</p>
          </CardHeader>
          <CardContent>
            <div className="grid h-72 items-end gap-3 sm:grid-cols-7">
              {dailyActivity.map((item) => (
                <div key={item.label} className="flex h-full flex-col justify-end gap-2">
                  <div className="flex h-full items-end">
                    <div
                      className="w-full rounded-t-2xl bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-300"
                      style={{ height: `${Math.max(14, Math.round((item.total / maxDailyActivity) * 100))}%` }}
                    />
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 px-2 py-2 text-center">
                    <p className="text-[11px] font-semibold text-zinc-700">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-zinc-950">{item.total}</p>
                    <p className="text-[10px] text-zinc-500">
                      {item.userCount} hesap • {item.listingCount} ilan • {item.postCount} duyuru • {item.messageCount} mesaj
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle>En Aktif Kullanıcılar</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">Bu hafta sitede en çok zaman geçiren kullanıcılar</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeUsers.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between rounded-2xl border border-amber-100 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">
                    #{index + 1} {user.name}
                  </p>
                  <p className="truncate text-sm text-zinc-500">@{user.username || "kullanıcı adı yok"}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-zinc-950">{Math.round(user.totalSeconds / 60)} dk</p>
                  <p className="text-xs text-zinc-500">bu hafta aktif</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle>Tekil Ziyaretçi Grafiği</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">Son 7 gündeki benzersiz ziyaretçi sayısı</p>
          </CardHeader>
          <CardContent>
            <div className="grid h-64 items-end gap-3 sm:grid-cols-7">
              {uniqueVisitorTrend.map((item) => (
                <div key={item.label} className="flex h-full flex-col justify-end gap-2">
                  <div className="flex h-full items-end">
                    <div
                      className="w-full rounded-t-2xl bg-gradient-to-t from-sky-500 via-cyan-400 to-teal-300"
                      style={{ height: `${Math.max(14, Math.round((item.uniqueVisitors / maxUniqueVisitors) * 100))}%` }}
                    />
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/40 px-2 py-2 text-center">
                    <p className="text-[11px] font-semibold text-zinc-700">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-zinc-950">{item.uniqueVisitors}</p>
                    <p className="text-[10px] text-zinc-500">tekil ziyaretçi</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle>En Çok Görüntülenen Sayfalar</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">Toplam görüntülenmeye göre en çok ziyaret alan sayfalar</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-5 text-sm text-zinc-500">
                Sayfa görüntülenme verisi toplanıyor.
              </div>
            ) : (
              topPages.map((item) => (
                <div key={item.path} className="flex items-center justify-between rounded-2xl border border-amber-100 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{item.path}</p>
                    <p className="text-xs text-zinc-500">{item.uniqueVisitors} tekil ziyaretçi</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {item.views} görüntüleme
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Son Açılan Hesaplar</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">En son kayıt olan kullanıcılar ve aktiflik durumu</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">{user.name}</p>
                  <p className="truncate text-sm text-zinc-500">@{user.username || "kullanıcı adı yok"}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {user.neighborhood ? `${user.neighborhood.city} / ${user.neighborhood.district} / ${user.neighborhood.name}` : "Mahalle seçilmedi"}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  <p>Kayıt: {formatDate(user.createdAt)}</p>
                  <p className={user.lastActiveAt && new Date(user.lastActiveAt) >= onlineThreshold ? "font-semibold text-emerald-600" : ""}>
                    Son aktif: {formatDate(user.lastActiveAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Mahalle Yoğunluğu</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">Kullanıcı, ilan ve duyuru toplamına göre en hareketli mahalleler</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {mostActiveNeighborhoods.map((item) => (
                <div key={item.id} className="rounded-2xl border border-amber-100 bg-white px-4 py-3">
                  <p className="font-semibold text-zinc-900">{item.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1">{item.users} kullanıcı</span>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1">{item.listings} ilan</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1">{item.posts} duyuru</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Mahalle Bazlı Online</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">Şu an aktif kullanıcı bulunan mahalleler</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {onlineNeighborhoods.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-5 text-sm text-zinc-500">
                  Şu an aktif kullanıcı bilgisi toplanıyor.
                </div>
              ) : (
                onlineNeighborhoods.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-amber-100 bg-white px-4 py-3">
                    <p className="pr-4 text-sm font-medium text-zinc-800">{item.label}</p>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {item.onlineCount} online
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Bugün En Çok Giriş Alan Mahalleler</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">Bugünkü mahalle bazlı ziyaret trafiği</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayNeighborhoodTraffic.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-5 text-sm text-zinc-500">
                  Bugünkü mahalle trafiği henüz oluşmadı.
                </div>
              ) : (
                todayNeighborhoodTraffic.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-amber-100 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-800">{item.label}</p>
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                        {item.views} giriş
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{item.uniqueVisitors} tekil ziyaretçi</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Hızlı Yönetim</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Link className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 font-semibold text-zinc-900 transition hover:bg-amber-100" href="/admin/reports">Raporları Yönet</Link>
              <Link className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 font-semibold text-zinc-900 transition hover:bg-amber-100" href="/admin/users">Kullanıcıları Yönet</Link>
              <Link className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 font-semibold text-zinc-900 transition hover:bg-amber-100" href="/admin/listings">İlanları Yönet</Link>
              <Link className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 font-semibold text-zinc-900 transition hover:bg-amber-100" href="/admin/chats">Sohbetleri Yönet</Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
