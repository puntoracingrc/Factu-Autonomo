import type { FiscalModelSource } from "../contracts";

const VERIFIED_AT = "2026-07-12T11:17:37+02:00";

function pendingSource(source: FiscalModelSource): FiscalModelSource {
  return Object.freeze({ ...source });
}

export const FISCAL_MODEL_SOURCE_REGISTRY_VERSION =
  "2026-07-12.foundation.v1" as const;

export const FISCAL_MODEL_SOURCES_V1: readonly FiscalModelSource[] =
  Object.freeze([
    pendingSource({
      id: "aeat.models.catalog",
      authority: "AEAT",
      sourceType: "CATALOG",
      title: "Presentar y consultar declaraciones por modelo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
      contentVersion: "aeat-page-2026-07-08",
      officialUpdatedAt: "2026-07-08",
      verifiedAt: VERIFIED_AT,
      contentHash: null,
      verificationStatus: "HASH_PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
    pendingSource({
      id: "aeat.model.036.procedure",
      authority: "AEAT",
      sourceType: "PROCEDURE",
      title:
        "Modelo 036. Censo de empresarios, profesionales y retenedores",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml",
      contentVersion: "aeat-page-2026-07-10",
      officialUpdatedAt: "2026-07-10",
      verifiedAt: VERIFIED_AT,
      contentHash: null,
      verificationStatus: "HASH_PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
    pendingSource({
      id: "aeat.model.036.guide",
      authority: "AEAT",
      sourceType: "GUIDE",
      title: "Guía práctica para cumplimentación del modelo censal 036",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/Ayuda/guia-practica-declaracion-censal.html",
      contentVersion: "aeat-page-2026-06-02",
      officialUpdatedAt: "2026-06-02",
      verifiedAt: VERIFIED_AT,
      contentHash: null,
      verificationStatus: "HASH_PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
    pendingSource({
      id: "boe.model.036.base",
      authority: "BOE",
      sourceType: "LEGAL_TEXT",
      title: "Orden EHA/1274/2007, de 26 de abril",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-9508",
      contentVersion: "BOE-A-2007-9508@2025-01-09",
      officialUpdatedAt: "2025-01-09",
      verifiedAt: VERIFIED_AT,
      contentHash: null,
      verificationStatus: "HASH_PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
    pendingSource({
      id: "boe.census.hac-1526-2024",
      authority: "BOE",
      sourceType: "LEGAL_TEXT",
      title: "Orden HAC/1526/2024, de 11 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/doc.php?id=BOE-A-2025-410",
      contentVersion: "BOE-A-2025-410",
      officialUpdatedAt: "2025-01-09",
      verifiedAt: VERIFIED_AT,
      contentHash: null,
      verificationStatus: "HASH_PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
    pendingSource({
      id: "aeat.model.037.retirement",
      authority: "AEAT",
      sourceType: "OFFICIAL_NOTICE",
      title: "Orden Ministerial de modificación de declaraciones censales",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-noticias/2025/enero/9/orden-ministerial-modificacion-declaraciones-censales.html",
      contentVersion: "aeat-page-2025-12-01",
      officialUpdatedAt: "2025-12-01",
      verifiedAt: VERIFIED_AT,
      contentHash: null,
      verificationStatus: "HASH_PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
    pendingSource({
      id: "aeat.model.303.procedure",
      authority: "AEAT",
      sourceType: "PROCEDURE",
      title: "Modelo 303. IVA. Autoliquidación",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml",
      contentVersion: "aeat-page-2026-06-09",
      officialUpdatedAt: "2026-06-09",
      verifiedAt: VERIFIED_AT,
      contentHash: null,
      verificationStatus: "HASH_PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
    pendingSource({
      id: "aeat.model.303.instructions-2026",
      authority: "AEAT",
      sourceType: "INSTRUCTIONS",
      title: "Modelo 303. Instrucciones 2026",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html",
      contentVersion: "aeat-page-2026-06-09",
      officialUpdatedAt: "2026-06-09",
      verifiedAt: VERIFIED_AT,
      contentHash: null,
      verificationStatus: "HASH_PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
    pendingSource({
      id: "boe.model.303.base",
      authority: "BOE",
      sourceType: "LEGAL_TEXT",
      title: "Orden EHA/3786/2008, de 29 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2008-20953",
      contentVersion: "BOE-A-2008-20953@2026-01-26",
      officialUpdatedAt: "2026-01-26",
      verifiedAt: VERIFIED_AT,
      contentHash: null,
      verificationStatus: "HASH_PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
  ]);
