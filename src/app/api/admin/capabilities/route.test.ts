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

  it.each(["admin-one@example.com", "admin-two@example.com"])(
    "da los mismos permisos completos e IA ilimitada a %s",
    async (email) => {
      vi.stubEnv(
        "ADMIN_EMAILS",
        "admin-one@example.com,admin-two@example.com",
      );
      vi.mocked(getUserFromBearer).mockResolvedValue({
        id: email,
        email,
      } as Awaited<ReturnType<typeof getUserFromBearer>>);

      const response = await GET(request());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        fullAdmin: true,
        adminEmailAuthorized: true,
        aiLearning: true,
        learningLabel: "admin",
      });
      expect(body).not.toHaveProperty("adminMfa");
    },
  );

  it("conserva aprendizaje IA sin conceder admin completo", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-empresa",
      email: "persianasalmar@gmail.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      fullAdmin: false,
      adminEmailAuthorized: false,
      aiLearning: true,
      learningLabel: "persianas_almar",
    });
  });
});
