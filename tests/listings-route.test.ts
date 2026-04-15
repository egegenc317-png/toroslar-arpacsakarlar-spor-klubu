import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindMany, mockCount, mockAuth } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockAuth: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: mockFindMany,
      count: mockCount
    }
  }
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn()
}));

import { GET } from "@/app/api/listings/route";

describe("GET /api/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockCount.mockResolvedValue(1);
  });

  it("liste dondurur", async () => {
    mockFindMany.mockResolvedValue([{ id: "l1", title: "Deneme" }]);

    const req = new Request("http://localhost/api/listings?type=PRODUCT");
    const res = await GET(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.total).toBe(1);
  });
});
