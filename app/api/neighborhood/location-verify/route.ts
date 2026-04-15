import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { reverseGeocodeLocation } from "@/lib/geocode";
import { findNeighborhoodByLocation } from "@/lib/neighborhood-geo";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180)
});

function normalizePart(value?: string | null) {
  return (value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleize(value?: string | null, fallback = "Merkez") {
  const normalized = (value || fallback).trim();
  if (!normalized) return fallback;

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1).toLocaleLowerCase("tr-TR"))
    .join(" ");
}

function buildInviteCode(city: string, district: string, name: string) {
  const raw = `${city}-${district}-${name}-${Date.now().toString().slice(-4)}`
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");

  return raw.slice(0, 24) || `AUTO${Date.now().toString().slice(-6)}`;
}

function buildAutoNeighborhoodId(city: string, district: string, name: string) {
  const key = [city, district, name]
    .map((part) => normalizePart(part).replace(/\s+/g, "-"))
    .filter(Boolean)
    .join("-");

  return key ? `auto-${key}` : `auto-${randomUUID()}`;
}

async function resolveNeighborhood(lat: number, lng: number) {
  const reverse = await reverseGeocodeLocation(lat, lng);
  const matchedNeighborhood = await findNeighborhoodByLocation(lat, lng, reverse);

  if (matchedNeighborhood) {
    return {
      neighborhood: matchedNeighborhood,
      city: titleize(reverse?.city || matchedNeighborhood.city, "Türkiye"),
      district: titleize(reverse?.district || reverse?.suburb || matchedNeighborhood.district, "Merkez"),
      name: titleize(reverse?.suburb || matchedNeighborhood.name || reverse?.district, "Merkez")
    };
  }

  const city = titleize(reverse?.city, "Türkiye");
  const district = titleize(reverse?.district || reverse?.suburb, "Merkez");
  const name = titleize(reverse?.suburb || reverse?.district, district);
  const id = buildAutoNeighborhoodId(city, district, name);

  const neighborhood =
    (await prisma.neighborhood.findUnique({ where: { id } })) ||
    (await prisma.neighborhood.upsert({
      where: { id },
      create: {
        id,
        city,
        district,
        name,
        inviteCode: buildInviteCode(city, district, name),
        lat,
        lng,
        radiusKm: 18
      },
      update: {
        city,
        district,
        name,
        lat,
        lng
      }
    }));

  return { neighborhood, city, district, name };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Gecersiz konum verisi gonderildi." }, { status: 400 });
    }

    const { neighborhood, city, district, name } = await resolveNeighborhood(parsed.data.lat, parsed.data.lng);
    const targetUser =
      (await prisma.user.findUnique({ where: { id: session.user.id } })) ||
      (session.user.email ? await prisma.user.findUnique({ where: { email: session.user.email } }) : null);

    if (!targetUser) {
      return NextResponse.json(
        { error: "Oturum kullanicisi bulunamadi. Lutfen cikis yapip tekrar giris yapin." },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        neighborhoodId: neighborhood.id,
        verifiedAt: new Date()
      }
    });

    const redirectTo = !targetUser.locationScope
      ? "/onboarding/scope"
      : targetUser.locationScope === "DISTRICT"
        ? "/map"
        : "/home";

    return NextResponse.json({
      message: "Konum dogrulandi",
      neighborhoodId: neighborhood.id,
      locationLabel: `${city} / ${district} / ${name}`,
      redirectTo
    });
  } catch (error) {
    console.error("location-verify failed", error);
    return NextResponse.json(
      {
        error: "Konum dogrulamasi su anda tamamlanamadi. Internet baglantisini kontrol edip tekrar dene."
      },
      { status: 500 }
    );
  }
}
