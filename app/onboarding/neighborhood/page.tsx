"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationHelpCard } from "@/components/location-help-card";
import { requestPreciseLocation, type BrowserPermissionState } from "@/lib/client/request-location";

export default function NeighborhoodOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<BrowserPermissionState>("unsupported");

  useEffect(() => {
    if (!navigator.permissions?.query) return;

    let active = true;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (!active) return;
        setPermissionState(result.state as BrowserPermissionState);
        result.onchange = () => setPermissionState(result.state as BrowserPermissionState);
      })
      .catch(() => setPermissionState("unsupported"));

    return () => {
      active = false;
    };
  }, []);

  const verifyLocation = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const position = await requestPreciseLocation();
      setPermissionState(position.permissionState);

      const res = await fetch("/api/neighborhood/location-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: position.lat,
          lng: position.lng
        })
      });

      const raw = await res.text();
      let data: Record<string, string> = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as Record<string, string>;
        } catch {
          data = {};
        }
      }
      setLoading(false);

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        setMessage(data.error || `Konum doğrulanamadı (HTTP ${res.status})`);
        return;
      }

      router.push(data.redirectTo || "/");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setMessage(err instanceof Error ? err.message : "Konum alinamadi.");
    }
  };

  return (
    <Card className="mx-auto max-w-lg overflow-hidden rounded-[24px] border-amber-200 bg-[linear-gradient(135deg,#fff7ed_0%,#fffdf8_48%,#fffbeb_100%)] shadow-sm">
      <CardHeader className="p-5 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl">Konum Doğrulama</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
        <p className="text-sm leading-6 text-muted-foreground">
          Devam etmek için konumunuzu doğrulayın. Sistem sizi bulunduğunuz şehir, ilçe ve mahalleye göre otomatik olarak hazırlayacak.
        </p>
        <div className="rounded-2xl border border-amber-200 bg-white/85 px-4 py-3 text-xs text-zinc-600">
          Telefonunda konum izni açık olmalı. Doğrulama sonrası otomatik yönlendirme yapılır.
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700">
          {permissionState === "granted"
            ? "Konum izni zaten açık. Doğrula dediğinde doğrudan konum kontrol edilir."
            : permissionState === "prompt"
              ? "Konum izni sorulmaya hazır. Doğrula dediğinde telefon izin penceresi açılmalı."
              : permissionState === "denied"
                ? "Konum izni daha önce kapatılmış. Tarayıcı veya telefon ayarlarından tekrar açman gerekiyor."
                : "Bazı telefonlarda izin penceresi tarayıcıya göre değişebilir. Doğrula tuşu izin istemeyi yine tetikler."}
        </div>
        <LocationHelpCard />
        <Button className="h-12 w-full rounded-xl bg-orange-500 text-white hover:bg-orange-600" onClick={verifyLocation} disabled={loading}>
          {loading ? "Konum kontrol ediliyor..." : "Konumumu Doğrula"}
        </Button>
        {message ? <p className="rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm text-zinc-700">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
