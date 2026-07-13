import { describe, expect, it, vi } from "vitest";
import {
  AppIssuedRecoveryPdfFileError,
  MAX_APP_ISSUED_RECOVERY_PDF_BYTES,
  readAppIssuedRecoveryPdfFile,
} from "./app-issued-recovery-file";

const PRIVATE_FILENAME = "F-PRIVATE-NIF-REDACTED.pdf";
const PRIVATE_CONTENT = "PRIVATE_CUSTOMER_AND_BANK_DETAILS";
const EXPECTED_INJECTED_SHA256 = Array.from({ length: 32 }, (_, index) =>
  index.toString(16).padStart(2, "0"),
).join("");

function pdfBytes(suffix = PRIVATE_CONTENT): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`%PDF-1.7\n${suffix}`);
}

function pdfFile(
  bytes: Uint8Array<ArrayBuffer> = pdfBytes(),
  type = "application/pdf",
): File {
  return new File([bytes], PRIVATE_FILENAME, { type });
}

function injectedDigest(length = 32) {
  return vi.fn(async (bytes: Uint8Array<ArrayBuffer>) => {
    void bytes;
    return Uint8Array.from({ length }, (_, index) => index).buffer;
  });
}

async function captureFailure(
  promise: Promise<unknown>,
): Promise<AppIssuedRecoveryPdfFileError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppIssuedRecoveryPdfFileError);
    return error as AppIssuedRecoveryPdfFileError;
  }
  throw new Error("Expected PDF intake failure");
}

describe("app-issued recovery PDF file intake", () => {
  it("returns only a lowercase SHA-256 digest, byte length and fixed media type", async () => {
    const file = pdfFile();
    const digestSha256 = injectedDigest();

    const result = await readAppIssuedRecoveryPdfFile(file, { digestSha256 });

    expect(result).toEqual({
      sha256: EXPECTED_INJECTED_SHA256,
      byteLength: file.size,
      mediaType: "application/pdf",
    });
    expect(Reflect.ownKeys(result).sort()).toEqual(
      ["byteLength", "mediaType", "sha256"].sort(),
    );
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(PRIVATE_FILENAME);
    expect(JSON.stringify(result)).not.toContain(PRIVATE_CONTENT);
    expect(digestSha256).toHaveBeenCalledTimes(1);
    expect(Array.from(digestSha256.mock.calls[0]?.[0] ?? [])).toEqual(
      Array.from(pdfBytes()),
    );
  });

  it("uses browser Web Crypto SHA-256 when no digest is injected", async () => {
    const file = pdfFile(new TextEncoder().encode("%PDF-1.7\nsynthetic"));

    await expect(readAppIssuedRecoveryPdfFile(file)).resolves.toEqual({
      sha256:
        "5aea7a7a5e33d66d021fd52802ceb64ac5b8f377b2be55fddca8607f093ce3ce",
      byteLength: file.size,
      mediaType: "application/pdf",
    });
  });

  it.each(["", "text/plain", "application/pdf; charset=utf-8"])(
    "requires the exact PDF media type before reading: %j",
    async (type) => {
      const file = pdfFile(pdfBytes(), type);
      const arrayBuffer = vi.spyOn(file, "arrayBuffer");
      const digestSha256 = injectedDigest();

      await expect(
        readAppIssuedRecoveryPdfFile(file, { digestSha256 }),
      ).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
      expect(arrayBuffer).not.toHaveBeenCalled();
      expect(digestSha256).not.toHaveBeenCalled();
    },
  );

  it("rejects non-File values without exposing their contents", async () => {
    const failure = await captureFailure(
      readAppIssuedRecoveryPdfFile({
        name: PRIVATE_FILENAME,
        type: "application/pdf",
        size: 12,
        arrayBuffer: async () => pdfBytes().buffer,
      }),
    );

    expect(failure.code).toBe("UNSUPPORTED_FILE");
    expect(failure.message).toBe(
      "APP_ISSUED_RECOVERY_PDF_FILE_ERROR:UNSUPPORTED_FILE",
    );
    expect(failure.message).not.toContain(PRIVATE_FILENAME);
  });

  it.each([
    [new Uint8Array(), "FILE_EMPTY"],
    [new Uint8Array(MAX_APP_ISSUED_RECOVERY_PDF_BYTES + 1), "FILE_TOO_LARGE"],
  ] as const)(
    "rejects size bounds before reading bytes",
    async (bytes, code) => {
      const file = pdfFile(bytes);
      const arrayBuffer = vi.spyOn(file, "arrayBuffer");
      const digestSha256 = injectedDigest();

      await expect(
        readAppIssuedRecoveryPdfFile(file, { digestSha256 }),
      ).rejects.toMatchObject({ code });
      expect(arrayBuffer).not.toHaveBeenCalled();
      expect(digestSha256).not.toHaveBeenCalled();
    },
  );

  it.each([
    [new TextEncoder().encode("renamed non-PDF"), "missing magic"],
    [new TextEncoder().encode(" %PDF-1.7"), "leading whitespace"],
    [new TextEncoder().encode("%PDF"), "truncated magic"],
  ] as const)(
    "rejects invalid PDF bytes (%s) before hashing",
    async (bytes, reason) => {
      void reason;
      const digestSha256 = injectedDigest();

      await expect(
        readAppIssuedRecoveryPdfFile(pdfFile(bytes), { digestSha256 }),
      ).rejects.toMatchObject({ code: "INVALID_PDF" });
      expect(digestSha256).not.toHaveBeenCalled();
    },
  );

  it("rejects a declared/read byte-length mismatch", async () => {
    const file = pdfFile();
    vi.spyOn(file, "arrayBuffer").mockResolvedValue(
      pdfBytes().slice(0, 6).buffer,
    );
    const digestSha256 = injectedDigest();

    await expect(
      readAppIssuedRecoveryPdfFile(file, { digestSha256 }),
    ).rejects.toMatchObject({ code: "INVALID_PDF" });
    expect(digestSha256).not.toHaveBeenCalled();
  });

  it.each(["reject", "throw"] as const)(
    "maps an arrayBuffer %s to a redacted read error",
    async (failureMode) => {
      const file = pdfFile();
      const privateError = new Error(`${PRIVATE_FILENAME}:${PRIVATE_CONTENT}`);
      if (failureMode === "reject") {
        vi.spyOn(file, "arrayBuffer").mockRejectedValue(privateError);
      } else {
        vi.spyOn(file, "arrayBuffer").mockImplementation(() => {
          throw privateError;
        });
      }

      const failure = await captureFailure(readAppIssuedRecoveryPdfFile(file));

      expect(failure.code).toBe("FILE_READ_FAILED");
      expect(failure.message).toBe(
        "APP_ISSUED_RECOVERY_PDF_FILE_ERROR:FILE_READ_FAILED",
      );
      expect(failure.message).not.toContain(PRIVATE_FILENAME);
      expect(failure.message).not.toContain(PRIVATE_CONTENT);
    },
  );

  it("fails closed when hashing rejects without leaking the original error", async () => {
    const digestSha256 = vi.fn(async () => {
      throw new Error(`${PRIVATE_FILENAME}:${PRIVATE_CONTENT}`);
    });

    const failure = await captureFailure(
      readAppIssuedRecoveryPdfFile(pdfFile(), { digestSha256 }),
    );

    expect(failure.code).toBe("HASH_UNAVAILABLE");
    expect(failure.message).toBe(
      "APP_ISSUED_RECOVERY_PDF_FILE_ERROR:HASH_UNAVAILABLE",
    );
    expect(failure.message).not.toContain(PRIVATE_FILENAME);
    expect(failure.message).not.toContain(PRIVATE_CONTENT);
  });

  it.each([0, 31, 33])(
    "fails closed when hashing returns a %d-byte digest",
    async (digestLength) => {
      await expect(
        readAppIssuedRecoveryPdfFile(pdfFile(), {
          digestSha256: injectedDigest(digestLength),
        }),
      ).rejects.toMatchObject({ code: "HASH_UNAVAILABLE" });
    },
  );
});
