import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  FiscalNotificationInputError,
  assertBoundedDocumentInput,
  assertBoundedId,
  assertBoundedIdList,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
  assertNotAborted,
} from "./input-contract";

function validDocumentInput(): Record<string, unknown> {
  return {
    ownerScope: "user:synthetic",
    documentId: "document-synthetic-1",
    pages: [
      { pageNumber: 1, text: "Contenido sintético uno", isBlank: false },
      { pageNumber: 2, text: "", isBlank: true },
    ],
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

describe("fiscal notification bounded input contract", () => {
  it("accepts a bounded synthetic document without mutating it", () => {
    const input = deepFreeze(validDocumentInput());
    const before = structuredClone(input);

    expect(() => assertBoundedDocumentInput(input)).not.toThrow();
    expect(input).toEqual(before);
  });

  it.each([
    ["", "OWNER_SCOPE_REQUIRED"],
    [123, "OWNER_SCOPE_REQUIRED"],
    [{}, "OWNER_SCOPE_REQUIRED"],
    [" user:synthetic", "OWNER_SCOPE_REQUIRED"],
    ["user:synthetic ", "OWNER_SCOPE_REQUIRED"],
    ["user:\u0000synthetic", "OWNER_SCOPE_REQUIRED"],
    ["x".repeat(161), "OWNER_SCOPE_REQUIRED"],
  ])("rejects an invalid owner scope", (ownerScope, code) => {
    expect(() => assertBoundedOwnerScope(ownerScope, "ownerScope")).toThrowError(
      expect.objectContaining({ code, path: "ownerScope" }),
    );
  });

  it.each(["", 123, {}, " id", "id ", "id\u007funsafe", "x".repeat(161)])(
    "rejects invalid identifiers without normalization",
    (id) => {
      expect(() => assertBoundedId(id, "documentId")).toThrowError(
        expect.objectContaining({ code: "INVALID_ID", path: "documentId" }),
      );
    },
  );

  it("requires unique bounded identifiers and enforces evidence limits", () => {
    expect(() => assertBoundedIdList(["same", "same"], "ids")).toThrowError(
      expect.objectContaining({ code: "INVALID_ID", path: "ids[1]" }),
    );
    expect(() =>
      assertBoundedIdList(
        Array.from(
          { length: FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds + 1 },
          (_, index) => `evidence-${index}`,
        ),
        "evidenceIds",
        FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "TOO_MANY_EVIDENCE_IDS",
        path: "evidenceIds",
      }),
    );
  });

  it("only narrows bounded id lists whose validated storage is frozen", () => {
    const frozen = Object.freeze(["id-synthetic"]);
    expect(() => assertBoundedIdList(frozen, "ids")).not.toThrow();
    expect(() => assertBoundedIdList(["id-synthetic"], "ids")).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "ids" }),
    );
  });

  it("rejects sparse, decorated and accessor-backed arrays", () => {
    const sparseIds = new Array(2) as string[];
    sparseIds[0] = "evidence-1";
    expect(() => assertBoundedIdList(sparseIds, "ids")).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "ids" }),
    );

    const decoratedIds = ["evidence-1"] as Array<string> & {
      privateMarker?: string;
    };
    decoratedIds.privateMarker = "SYNTHETIC_PRIVATE_VALUE";
    expect(() => assertBoundedIdList(decoratedIds, "ids")).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "ids" }),
    );

    const accessorIds = ["evidence-1"];
    Object.defineProperty(accessorIds, "0", {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("SYNTHETIC_PRIVATE_VALUE");
      },
    });
    expect(() => assertBoundedIdList(accessorIds, "ids")).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "ids" }),
    );

    const input = validDocumentInput();
    const pages = input.pages as unknown[];
    (pages as unknown as Record<PropertyKey, unknown>)[Symbol("private")] =
      "SYNTHETIC_PRIVATE_VALUE";
    expect(() => assertBoundedDocumentInput(input)).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "pages" }),
    );
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Infinity])(
    "requires non-negative safe integer cents",
    (amount) => {
      expect(() => assertNonNegativeIntegerCents(amount, "amountCents")).toThrowError(
        expect.objectContaining({ code: "INVALID_AMOUNT", path: "amountCents" }),
      );
    },
  );

  it("rejects unknown keys without echoing their name or value", () => {
    const privateMarker = "synthetic-private-marker";
    const input = {
      ...validDocumentInput(),
      [`taxId_${privateMarker}`]: privateMarker,
    };

    let error: unknown;
    try {
      assertBoundedDocumentInput(input);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(FiscalNotificationInputError);
    expect(error).toMatchObject({ code: "INVALID_INPUT", path: "$.$unknown" });
    expect(JSON.stringify(error)).not.toContain(privateMarker);
    expect((error as Error).message).not.toContain(privateMarker);
  });

  it("rejects unknown nested page keys fail-closed", () => {
    const input = validDocumentInput();
    (input.pages as Record<string, unknown>[])[0] = {
      pageNumber: 1,
      text: "Texto sintético",
      isBlank: false,
      nif: "synthetic-value",
    };

    expect(() => assertBoundedDocumentInput(input)).toThrowError(
      expect.objectContaining({
        code: "INVALID_INPUT",
        path: "pages[0].$unknown",
      }),
    );
  });

  it("rejects inherited, symbolic and accessor-backed input without leaking values", () => {
    const inherited = Object.create({ ownerScope: "private-inherited" });
    Object.assign(inherited, validDocumentInput());
    delete inherited.ownerScope;
    expect(() => assertBoundedDocumentInput(inherited)).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "$" }),
    );

    const symbolic = validDocumentInput() as Record<PropertyKey, unknown>;
    symbolic[Symbol("private")] = "private-symbol-value";
    expect(() => assertBoundedDocumentInput(symbolic)).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "$" }),
    );

    const accessor = validDocumentInput();
    Object.defineProperty(accessor, "ownerScope", {
      enumerable: true,
      get() {
        throw new Error("SYNTHETIC_PRIVATE_VALUE");
      },
    });
    expect(() => assertBoundedDocumentInput(accessor)).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "$" }),
    );
  });

  it("does not narrow mutable proxy-backed records after snapshot validation", () => {
    const input = validDocumentInput();
    const pages = input.pages as Record<string, unknown>[];
    pages[0] = new Proxy(pages[0]!, {
      get(target, property, receiver) {
        if (property === "pageNumber") return 99;
        if (property === "text") {
          return "x".repeat(FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars + 1);
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const proxy = new Proxy(input, {
      get(target, property, receiver) {
        if (property === "ownerScope") return " invalid ";
        return Reflect.get(target, property, receiver);
      },
    });

    expect(() => assertBoundedDocumentInput(proxy)).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "$frozen" }),
    );
  });

  it.each([
    [
      [
        { pageNumber: 1, text: "a", isBlank: false },
        { pageNumber: 1, text: "b", isBlank: false },
      ],
      "pages[1].pageNumber",
    ],
    [
      [
        { pageNumber: 1, text: "a", isBlank: false },
        { pageNumber: 3, text: "b", isBlank: false },
      ],
      "pages[1].pageNumber",
    ],
  ])("rejects duplicate or non-consecutive page numbers", (pages, path) => {
    const input = { ...validDocumentInput(), pages };
    expect(() => assertBoundedDocumentInput(input)).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path }),
    );
  });

  it("rejects excessive page count before reading any page", () => {
    const unreadablePage = Object.defineProperty({}, "pageNumber", {
      enumerable: true,
      get: () => {
        throw new Error("page must not be read");
      },
    });
    const input = {
      ...validDocumentInput(),
      pages: Array.from(
        { length: FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages + 1 },
        () => unreadablePage,
      ),
    };

    expect(() => assertBoundedDocumentInput(input)).toThrowError(
      expect.objectContaining({ code: "TOO_MANY_PAGES", path: "pages" }),
    );

    const hostilePages = new Proxy(
      new Array(FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages + 1),
      {
        ownKeys() {
          throw new Error("entries must not be inspected");
        },
      },
    );
    expect(() =>
      assertBoundedDocumentInput({ ...validDocumentInput(), pages: hostilePages }),
    ).toThrowError(
      expect.objectContaining({ code: "TOO_MANY_PAGES", path: "pages" }),
    );
  });

  it("enforces the aggregate text limit without concatenating pages", () => {
    const input = {
      ...validDocumentInput(),
      pages: [
        {
          pageNumber: 1,
          text: "a".repeat(FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars),
          isBlank: false,
        },
        { pageNumber: 2, text: "b", isBlank: false },
      ],
    };

    expect(() => assertBoundedDocumentInput(input)).toThrowError(
      expect.objectContaining({ code: "TEXT_TOO_LARGE", path: "pages" }),
    );
  });

  it("fails immediately and during processing when aborted", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => assertNotAborted(controller.signal)).toThrowError(
      expect.objectContaining({ code: "ABORTED", path: "signal" }),
    );
    expect(() =>
      assertBoundedDocumentInput({
        ...validDocumentInput(),
        signal: controller.signal,
      }),
    ).toThrowError(expect.objectContaining({ code: "ABORTED", path: "signal" }));
  });
});
