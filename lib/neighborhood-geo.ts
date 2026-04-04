// @ts-nocheck
import { prisma } from "@/lib/prisma";
import { reverseGeocodeLocation } from "@/lib/geocode";

type NeighborhoodRecord = {
  id: string;
  city: string;
  district: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm?: number;
};

function getEffectiveNeighborhoodRadiusKm(radiusKm?: number | null) {
  const safeRadius = typeof radiusKm === "number" && radiusKm > 0 ? radiusKm : 15;
  return Math.min(Math.max(safeRadius, 1.5), 25);
}

function toRad(v: number) {
  return (v * Math.PI) / 180;
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

function normalizeText(value?: string | null) {
  return (value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesNormalized(source?: string | null, target?: string | null) {
  const a = normalizeText(source);
  const b = normalizeText(target);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export async function findNeighborhoodByLocation(lat: number, lng: number) {
  const all = (await prisma.neighborhood.findMany()) as NeighborhoodRecord[];
  const ranked = all
    .map((n) => ({
      ...n,
      distance: distanceKm(lat, lng, n.lat, n.lng)
    }))
    .sort((a, b) => a.distance - b.distance);

  const reverse = await reverseGeocodeLocation(lat, lng);
  const inRadius = ranked.filter((item) => item.distance <= getEffectiveNeighborhoodRadiusKm(item.radiusKm));
  if (inRadius.length === 0) {
    return null;
  }

  const districtMatched = inRadius.find((item) =>
    includesNormalized(reverse?.district, item.district) ||
    includesNormalized(reverse?.suburb, item.name) ||
    includesNormalized(reverse?.displayName, `${item.district} ${item.name}`)
  );

  return districtMatched || inRadius[0] || null;
}

