// @ts-nocheck
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";

import { auth } from "@/lib/auth";
import { geocodeLocationText } from "@/lib/geocode";
import { findNeighborhoodByLocation } from "@/lib/neighborhood-geo";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedNeighborhoodMap } from "@/components/unified-neighborhood-map";

type BusinessUser = Awaited<ReturnType<typeof prisma.user.findMany>>[number];

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEffectiveNeighborhoodRadiusKm(radiusKm?: number | null) {
  const safeRadius = typeof radiusKm === "number" && radiusKm > 0 ? radiusKm : 3;
  return Math.min(Math.max(safeRadius, 1.5), 4);
}

async function resolveNeighborhoodCenter(neighborhood: {
  id: string;
  city?: string | null;
  district?: string | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  if (typeof neighborhood?.lat === "number" && typeof neighborhood?.lng === "number") {
    return { lat: neighborhood.lat, lng: neighborhood.lng };
  }

  const parts = [neighborhood?.name, neighborhood?.district, neighborhood?.city, "Türkiye"].filter(Boolean);
  const point = await geocodeLocationText(parts.join(", "));
  if (!point) return null;

  await prisma.neighborhood.update({
    where: { id: neighborhood.id },
    data: { lat: point.lat, lng: point.lng }
  });

  return point;
}

export default async function MapPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.locationScope) redirect("/onboarding/scope");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");
  const neighborhoodId = session.user.neighborhoodId;

  const neighborhood = await prisma.neighborhood.findUnique({ where: { id: neighborhoodId } });
  const businessUsers = await prisma.user.findMany();
  const neighborhoodRadiusKm = getEffectiveNeighborhoodRadiusKm(neighborhood?.radiusKm);
  const neighborhoodCenter = neighborhood ? await resolveNeighborhoodCenter(neighborhood) : null;

  const [listings, boardPosts] = await Promise.all([
    prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        neighborhoodId,
        OR: [
          { locationLat: { not: null } },
          { locationLng: { not: null } },
          { locationText: { not: null } }
        ]
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.boardPost.findMany({
      where: {
        neighborhoodId,
        OR: [
          { locationLat: { not: null } },
          { locationLng: { not: null } },
          { locationText: { not: null } }
        ]
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const isInsideCurrentNeighborhoodRadius = (lat?: number | null, lng?: number | null) => {
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      typeof neighborhoodCenter?.lat !== "number" ||
      typeof neighborhoodCenter?.lng !== "number"
    ) {
      return false;
    }

    return distanceKm(lat, lng, neighborhoodCenter.lat, neighborhoodCenter.lng) <= neighborhoodRadiusKm;
  };

  const businessItems = (
    await Promise.all(
      businessUsers
        .filter((u: BusinessUser) => u.accountType === "BUSINESS")
        .filter((u: BusinessUser) => typeof u.shopLocationLat === "number" && typeof u.shopLocationLng === "number")
        .map(async (u: BusinessUser) => {
          const matchedNeighborhood = await findNeighborhoodByLocation(u.shopLocationLat!, u.shopLocationLng!);
          if (matchedNeighborhood?.id !== neighborhoodId) return null;
          if (!isInsideCurrentNeighborhoodRadius(u.shopLocationLat, u.shopLocationLng)) return null;

          return {
            id: `shop-${u.id}`,
            kind: "LISTING" as const,
            type: "SHOP",
            title: u.shopName || `${u.name} Dükkanı`,
            body: u.shopLocationText || "İşletme konumu",
            userName: u.name || "İşletme",
            href: `/shop/${u.id}`,
            createdAt: new Date(u.createdAt).toISOString(),
            locationText: u.shopLocationText ?? null,
            locationLat: u.shopLocationLat ?? null,
            locationLng: u.shopLocationLng ?? null,
            imageUrl: u.shopLogo ?? null,
            businessCategory: u.businessCategory ?? null
          };
        })
    )
  ).filter(Boolean);

  const listingItems = listings
    .filter((listing) => {
      if (typeof listing.locationLat === "number" && typeof listing.locationLng === "number") {
        return isInsideCurrentNeighborhoodRadius(listing.locationLat, listing.locationLng);
      }
      return true; // Include listings with locationText even if no coordinates
    })
    .map((listing) => {
      const photos = listing.photos ? JSON.parse(listing.photos) as string[] : [];
      return {
        id: `listing-${listing.id}`,
        kind: "LISTING" as const,
        type: listing.type,
        title: listing.title,
        body: listing.description,
        userName: listing.user.name,
        href: `/listings/${listing.id}`,
        createdAt: new Date(listing.createdAt).toISOString(),
        locationText: listing.locationText ?? null,
        locationLat: listing.locationLat ?? null,
        locationLng: listing.locationLng ?? null,
        imageUrl: photos.length > 0 ? photos[0] : null,
        businessCategory: listing.category ?? null
      };
    });

  const boardPostItems = boardPosts
    .filter((post) => {
      if (typeof post.locationLat === "number" && typeof post.locationLng === "number") {
        return isInsideCurrentNeighborhoodRadius(post.locationLat, post.locationLng);
      }
      return true; // Include posts with locationText even if no coordinates
    })
    .map((post) => {
      const photos = post.photos ? JSON.parse(post.photos) as string[] : [];
      return {
        id: `board-${post.id}`,
        kind: "BOARD" as const,
        type: post.type,
        title: post.title,
        body: post.body,
        userName: post.user.name,
        href: `/board/${post.id}`,
        createdAt: new Date(post.createdAt).toISOString(),
        locationText: post.locationText ?? null,
        locationLat: post.locationLat ?? null,
        locationLng: post.locationLng ?? null,
        imageUrl: photos.length > 0 ? photos[0] : null,
        businessCategory: null
      };
    });

  const mapItems = [...businessItems, ...listingItems, ...boardPostItems];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" /> Harita
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-zinc-600">
            {`${neighborhood?.city} / ${neighborhood?.district} / ${neighborhood?.name} mahallesi için işletmeler, ilanlar ve duyurular gösteriliyor.`}
          </p>
          <p className="text-xs text-zinc-500">
            Konum yenileyince harita sadece geçtiğin mahallenin işletme, ilan ve duyuru noktalarına göre güncellenir.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mahalle Haritası ({mapItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <UnifiedNeighborhoodMap
            items={mapItems}
            defaultCenter={
              neighborhoodCenter
            }
            maxDistanceKm={neighborhoodRadiusKm}
            showLegend={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}




