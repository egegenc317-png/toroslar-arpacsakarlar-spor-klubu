"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LockKeyhole, Mail, Shield } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError("E-posta veya kullanıcı adı gir.");
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: trimmedIdentifier,
        password,
        redirect: false,
        callbackUrl: "/post-login"
      });

      if (!result || result.error) {
        setError(result?.error ? result.error : "Giriş başarısız.");
        return;
      }

      router.push(result.url || "/post-login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş sırasında bir hata oluştu.");
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-110px)] overflow-hidden rounded-[26px] border border-zinc-200 bg-gradient-to-br from-zinc-900 via-zinc-800 to-amber-900 p-3 sm:min-h-[calc(100vh-120px)] sm:rounded-3xl sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -left-20 top-10 h-60 w-60 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-orange-300/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-5xl items-start gap-4 lg:grid-cols-[1.1fr_1fr] lg:gap-6">
        <Card className="order-1 border-zinc-200 bg-white/95 shadow-2xl">
          <CardHeader className="space-y-3 p-5 sm:p-6">
            <BrandLogo className="mb-1" />
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
              <Shield className="h-3.5 w-3.5" />
              Güvenli giriş
            </p>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">Giriş Yap</CardTitle>
            <p className="text-sm text-zinc-600">Mahalle Ağı hesabınla devam et.</p>
          </CardHeader>

          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  className="h-11 border-zinc-200 pl-9"
                  placeholder="E-posta veya kullanıcı adı"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                <Input
                  type="password"
                  className="h-11 border-zinc-200 pl-9"
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <Button className="h-11 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800" type="submit">
                Giriş
              </Button>
              <Button
                className="h-11 w-full rounded-xl border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
                type="button"
                variant="outline"
                onClick={() => router.push("/auth/register")}
              >
                Kayıt Ol
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="order-2 rounded-2xl border border-white/25 bg-white/10 p-4 text-white shadow-xl backdrop-blur-md sm:p-6">
          <h2 className="text-2xl font-bold">Komşu ekonomisine hoş geldin</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-100/90">
            Aynı semt veya mahallede güvenli alışveriş, duyuru, mikro iş ve mesajlaşma bir arada.
          </p>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">İlan, pano ve harita tek akışta</div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Yetkili moderasyon ve güven puanı</div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">İşletmeler için dükkan profili</div>
          </div>
          <p className="mt-5 text-xs text-zinc-100/80">
            Hesabın yoksa <Link href="/auth/register" className="font-semibold text-amber-200 underline">hemen kayıt ol</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}




