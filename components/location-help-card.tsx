type LocationHelpCardProps = {
  compact?: boolean;
};

export function LocationHelpCard({ compact = false }: LocationHelpCardProps) {
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50/60 ${compact ? "p-3" : "p-4"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Konum izni görünmüyorsa</p>
      <div className={`mt-2 grid gap-2 text-xs text-zinc-700 ${compact ? "" : "sm:grid-cols-3"}`}>
        <div className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2">
          <p className="font-semibold text-zinc-900">Guvenli Baglanti</p>
          <p className="mt-1">Adres cubugunda kilit simgesi olmali. Konum izni bircok cihazda sadece HTTPS uzerinde calisir.</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2">
          <p className="font-semibold text-zinc-900">Tarayıcıda Aç</p>
          <p className="mt-1">Uygulama içi tarayıcı yerine Chrome, Safari veya Samsung Internet içinde aç.</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2">
          <p className="font-semibold text-zinc-900">Ayarları Kontrol Et</p>
          <p className="mt-1">Telefon ayarlarında bu site veya tarayıcı için konum izninin açık olduğundan emin ol.</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2">
          <p className="font-semibold text-zinc-900">iPhone / Android</p>
          <p className="mt-1">iPhone’da Safari konum izni, Android’de tarayıcı uygulama izni ve hassas konum açık olmalı.</p>
        </div>
      </div>
    </div>
  );
}
