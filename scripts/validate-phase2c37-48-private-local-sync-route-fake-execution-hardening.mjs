import {
  runValidator,
  validatePhase2C37To48Aggregate,
} from "./validate-phase2c37-48-route-fake-hardening-lib.mjs";

runValidator(
  "Phase 2C.37-2C.48 private local sync route fake execution hardening",
  validatePhase2C37To48Aggregate,
);
