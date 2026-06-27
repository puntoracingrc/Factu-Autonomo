import {
  runValidator,
  validatePhase2C57To66Aggregate,
} from "./validate-phase2c57-66-private-staging-readiness-gates-lib.mjs";

runValidator(
  "Phase 2C.57-2C.66 private staging readiness gates",
  validatePhase2C57To66Aggregate,
);
