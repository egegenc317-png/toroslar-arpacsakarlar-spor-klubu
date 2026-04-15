import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/neighborhood/location-verify/route";

const {
  mockAuth,
  mockReverseGeocodeLocation,
  mockFindNeighborhoodByLocation,
  mockUserFindUnique,
  mockUserUpdate
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockReverseGeocodeLocation: vi.fn(),
  mockFindNeighborhoodByLocation: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth
}));

vi.mock("@/lib/geocode", () => ({
  reverseGeocodeLocation: mockReverseGeocodeLocation
}));

vi.mock("@/lib/neighborhood-geo", () => ({
  findNeighborhoodByLocation: mockFindNeighborhoodByLocation
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    neighborhood: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate
    }
  }
}));

describe("POST /api/neighborhood/location-verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("string koordinatlari kabul edip kullaniciyi mahalleye baglar", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "test@example.com" }
    });
    mockReverseGeocodeLocation.mockResolvedValue({
      city: "Bursa",
      district: "Nilufer",
      suburb: "Gorukle"
    });
    mockFindNeighborhoodByLocation.mockResolvedValue({
      id: "n1",
      city: "Bursa",
      district: "Nilufer",
      name: "Gorukle"
    });
    mockUserFindUnique.mockResolvedValue({
      id: "u1",
      email: "test@example.com",
      locationScope: "NEIGHBORHOOD"
    });
    mockUserUpdate.mockResolvedValue({});

    const req = new Request("http://localhost/api/neighborhood/location-verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: "40.123", lng: "29.456" })
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.neighborhoodId).toBe("n1");
    expect(json.locationLabel).toContain("Bursa");
    expect(mockFindNeighborhoodByLocation).toHaveBeenCalledWith(40.123, 29.456, {
      city: "Bursa",
      district: "Nilufer",
      suburb: "Gorukle"
    });
    expect(mockUserUpdate).toHaveBeenCalled();
  });

  it("oturum yoksa 401 dondurur", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new Request("http://localhost/api/neighborhood/location-verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: 40.123, lng: 29.456 })
    });

    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });
});
