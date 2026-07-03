import { describe, expect, it, vi, afterEach } from "vitest";
import { GET } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

function request() {
  return new Request("http://localhost/api/admin/capabilities", {
    headers: { Authorization: "Bearer token" },
  });
}

describe("GET /api/admin/capabilities", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("requiere sesion", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("distingue admin completo de aprendizaje IA", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-empresa",
      email: "persianasalmar@gmail.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      fullAdmin: false,
      aiLearning: true,
      learningLabel: "persianas_almar",
    });
  });
});
