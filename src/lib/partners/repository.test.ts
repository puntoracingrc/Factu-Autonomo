import { describe, expect, it, vi } from "vitest";
import {
  getPartnerAccountRecord,
  PartnerSchemaUnavailableError,
} from "./repository";

describe("Partner repository schema detection", () => {
  it("recognizes the PostgREST missing-table schema-cache response", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST205",
        message:
          "Could not find the table 'public.partner_accounts' in the schema cache",
      },
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const admin = {
      from: vi.fn().mockReturnValue({ select }),
    };

    await expect(
      getPartnerAccountRecord(admin as never, "owner-user-id"),
    ).rejects.toBeInstanceOf(PartnerSchemaUnavailableError);
  });

  it("keeps unrelated database failures closed", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const admin = {
      from: vi.fn().mockReturnValue({ select }),
    };

    const result = getPartnerAccountRecord(admin as never, "owner-user-id");

    await expect(result).rejects.toThrow(
      "No se pudieron consultar los datos del programa Partners.",
    );
    await expect(result).rejects.toMatchObject({
      operation: "partner_account",
      databaseCode: "42501",
    });
  });
});
