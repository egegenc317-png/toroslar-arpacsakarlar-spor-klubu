"use client";

export type BrowserPermissionState = "granted" | "prompt" | "denied" | "unsupported";

type LocationResult = {
  lat: number;
  lng: number;
  accuracy?: number;
  permissionState: BrowserPermissionState;
};

const LOCATION_CACHE_KEY = "mahalle:last-location";
const LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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

function watchGeolocationAttempt(options: PositionOptions, timeoutMs: number) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    let watchId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      reject(new Error("timeout"));
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        window.clearTimeout(timeoutId);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        resolve(position);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        reject(error);
      },
      options
    );
  });
}

function cacheLocation(result: LocationResult) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify({
        lat: result.lat,
        lng: result.lng,
        accuracy: result.accuracy ?? null,
        ts: Date.now()
      })
    );
  } catch {
    // storage yoksa sessizce devam et
  }
}

function readCachedLocation(permissionState: BrowserPermissionState): LocationResult | null {
  if (typeof window === "undefined") return null;
  if (permissionState === "denied") return null;

  try {
    const raw = window.localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number; accuracy?: number | null; ts?: number };
    if (typeof parsed?.lat !== "number" || typeof parsed?.lng !== "number" || typeof parsed?.ts !== "number") {
      return null;
    }
    if (Date.now() - parsed.ts > LOCATION_CACHE_TTL_MS) {
      return null;
    }

    return {
      lat: parsed.lat,
      lng: parsed.lng,
      accuracy: typeof parsed.accuracy === "number" ? parsed.accuracy : undefined,
      permissionState
    };
  } catch {
    return null;
  }
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
      timeout: 30000,
      maximumAge: 15_000
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 120_000
    },
    {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 900_000
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
      const resolved = {
        lat: result.coords.latitude,
        lng: result.coords.longitude,
        accuracy: result.coords.accuracy,
        permissionState
      };
      cacheLocation(resolved);
      return resolved;
    } catch (error) {
      lastError = error as GeolocationPositionError | null;

      try {
        const watched = await watchGeolocationAttempt(
          options,
          Math.max(typeof options.timeout === "number" ? options.timeout + 5000 : 15000, 12000)
        );
        const resolved = {
          lat: watched.coords.latitude,
          lng: watched.coords.longitude,
          accuracy: watched.coords.accuracy,
          permissionState
        };
        cacheLocation(resolved);
        return resolved;
      } catch (watchError) {
        if ((watchError as { code?: number } | null)?.code) {
          lastError = watchError as GeolocationPositionError;
        }
      }
    }
  }

  const cached = readCachedLocation(permissionState);
  if (cached) {
    return cached;
  }

  throw new Error(mapLocationError(lastError, permissionState));
}
