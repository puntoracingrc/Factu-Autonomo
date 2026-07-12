import { FISCAL_CALENDAR_ENABLED_KEY } from "./config";

/** Contrato aislado de la superficie pública informativa del calendario. */
export const FISCAL_CALENDAR_MODULE_DESCRIPTOR = {
  id: "fiscal_calendar_aeat",
  name: "Calendario fiscal",
  route: "/consultor-fiscal/calendario",
  releaseFlag: FISCAL_CALENDAR_ENABLED_KEY,
  lifecycleStatus: "public_review",
  localOnly: false,
  readOnly: true,
  oauthEnabled: false,
  externalWritesEnabled: false,
  notificationsEnabled: false,
} as const;
