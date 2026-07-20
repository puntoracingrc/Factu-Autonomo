import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_CUSTOMER_RESOLVABLE_CORPUS,
  SYNTHETIC_CUSTOMER_REVIEW_CORPUS,
} from "./local-parser.synthetic-corpus";
import { parseCustomerTextLocally } from "./local-parser";

describe("synthetic nationwide customer text corpus", () => {
  it.each(SYNTHETIC_CUSTOMER_RESOLVABLE_CORPUS)(
    "resolves $id locally",
    ({ input, expected }) => {
      const result = parseCustomerTextLocally(input);
      expect(result?.customer).toMatchObject(expected);
    },
  );

  it.each(SYNTHETIC_CUSTOMER_REVIEW_CORPUS)(
    "keeps $id fail-closed or under review",
    ({ input, expected }) => {
      const result = parseCustomerTextLocally(input);
      switch (expected) {
        case "null":
          expect(result).toBeNull();
          break;
        case "raw-city":
          expect(result?.customer.city).toMatch(/^(?:Arroyomolinos|Madriz)$/u);
          expect(result?.warnings.join(" ")).not.toContain(
            "coincidencia geografica unica",
          );
          break;
        case "conflict-warning":
          expect(result?.customer.city).toBe("Madrid");
          expect(result?.warnings.join(" ")).toContain(
            "provincias distintas",
          );
          break;
        case "missing-nif-warning":
          expect(result?.customer.nif).toBeNull();
          expect(result?.warnings).toContain("No se ha detectado NIF/CIF.");
          break;
        case "missing-postal-code":
          expect(result?.customer.postalCode).toBeNull();
          break;
      }
    },
  );
});
