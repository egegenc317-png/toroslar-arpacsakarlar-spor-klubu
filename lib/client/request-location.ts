"use client";

export type BrowserPermissionState = "granted" | "prompt" | "denied" | "unsupported";

type LocationResult = {
  lat: number;
  lng: number;
  accuracy?: number;
  permissionState: BrowserPermissionState;
};

async function getPermissionState(): Promise<BrowserPermissionState> {
  if (!navigator.permissions?.query) return "unsupported";

  try {
    const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (result.state === "granted" || result.state === "prompt" || result.state === "denied") {
      return result.state;
    }
    return "unsupported";
  } catch {
    return "unsupported";
  }
}

function geolocationAttempt(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function ensureSecureContext() {
  if (typeof window === "undefined") return;

  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (window.isSecureContext || isLocalHost) return;

  throw new Error("Konum izni bu cihazda sadece guvenli baglantida calisir. Siteyi https:// ile acip tekrar dene.");
}

function mapLocationError(error: GeolocationPositionError | null, permissionState: BrowserPermissionState) {
  if (error?.code === 1 || permissionState === "denied") {
    return "Konum izni kapalı görünüyor. Tarayıcı veya telefon ayarlarından konum iznini açıp tekrar dene.";
  }

  if (error?.code === 2) {
    return "Konum bulunamadı. GPS veya hassas konumu açıp tekrar dene.";
  }

  if (error?.code === 3) {
    return "Konum alma isteği zaman aşımına uğradı. Açık alanda veya daha güçlü sinyalde tekrar dene.";
  }

  return "Konum alınamadı. Telefonunda konum servisini ve tarayıcı izinlerini kontrol et.";
}

export async function requestPreciseLocation(): Promise<LocationResult> {
  ensureSecureContext();

  if (!navigator.geolocation) {
    throw new Error("Tarayıcın konum servisini desteklemiyor.");
  }

  const permissionState = await getPermissionState();

  const attempts: PositionOptions[] = [
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 30_000
    },
    {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300_000
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: Infinity
    }
  ];

  let lastError: GeolocationPositionError | null = null;

  for (const options of attempts) {
    try {
      const result = await geolocationAttempt(options);

      return {
        lat: result.coords.latitude,
        lng: result.coords.longitude,
        accuracy: result.coords.accuracy,
        permissionState
      };
    } catch (error) {
      lastError = error as GeolocationPositionError | null;
    }
  }

  throw new Error(mapLocationError(lastError, permissionState));
}
