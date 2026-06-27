import {
  runValidator,
  validatePhase2C41,
} from "./validate-phase2c37-48-route-fake-hardening-lib.mjs";

runValidator(
  "Phase 2C.41 sync route in-memory rate limit request id",
  validatePhase2C41,
);
