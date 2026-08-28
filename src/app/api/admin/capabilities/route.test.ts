import { describe, expect, it, vi, afterEach } from "vitest";
import { GET } from "./route";
import { getUserSessionFromBearer } from "@/lib/billing/server-auth";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserSessionFromBearer: vi.fn(),
}));

function session(email: string, aal: "aal1" | "aal2") {
  return {
    user: { id: email, email },
    sessionId: "22222222-2222-4222-8222-222222222222",
    aal,
  } as Awaited<ReturnType<typeof getUserSessionFromBearer>>;
}

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
    vi.mocked(getUserSessionFromBearer).mockResolvedValue(null);

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
      vi.mocked(getUserSessionFromBearer).mockResolvedValue(
        session(email, "aal2"),
      );

      const response = await GET(request());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        fullAdmin: true,
        adminEmailAuthorized: true,
        aiLearning: true,
        learningLabel: "admin",
        adminMfa: { required: true, satisfied: true, currentLevel: "aal2" },
      });
    },
  );

  it("reconoce a persianasalmar como administrador propietario completo", async () => {
    vi.mocked(getUserSessionFromBearer).mockResolvedValue(
      session("persianasalmar@gmail.com", "aal2"),
    );

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      fullAdmin: true,
      adminEmailAuthorized: true,
      aiLearning: true,
      learningLabel: "admin",
    });
  });

  it("mantiene el bootstrap MFA visible pero no concede Admin en AAL1", async () => {
    vi.mocked(getUserSessionFromBearer).mockResolvedValue(
      session("persianasalmar@gmail.com", "aal1"),
    );

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      fullAdmin: false,
      adminEmailAuthorized: true,
      aiLearning: false,
      adminMfa: { required: true, satisfied: false, currentLevel: "aal1" },
    });
  });
});
