import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindMany,
  mockFindUnique,
  mockCreate,
  mockCheckRateLimit,
  mockIsEmailVerified,
  mockConsumeVerifiedEmail
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockIsEmailVerified: vi.fn(),
  mockConsumeVerifiedEmail: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate
    }
  }
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockCheckRateLimit
}));

vi.mock("@/lib/email-verification", () => ({
  isEmailVerified: mockIsEmailVerified,
  consumeVerifiedEmail: mockConsumeVerifiedEmail
}));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ ok: true });
    mockFindMany.mockResolvedValue([]);
    mockIsEmailVerified.mockResolvedValue(true);
    mockConsumeVerifiedEmail.mockResolvedValue(undefined);
  });

  it("201 dondurur", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "u1" });

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        username: "testuser",
        email: "t@t.com",
        password: "Abc123",
        birthDate: "2000-01-01",
        accountType: "NEIGHBOR",
        showAge: false
      })
    });

    const res = await POST(req as never);
    expect(res.status).toBe(201);
  });

  it("409 dondurur", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1" });

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        username: "testuser",
        email: "t@t.com",
        password: "Abc123",
        birthDate: "2000-01-01",
        accountType: "NEIGHBOR",
        showAge: false
      })
    });

    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });
});
