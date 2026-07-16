import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "../input-contract";
import type { FiscalNotificationDocumentFamilyIdV3 } from "../knowledge/document-families.v3";
import { extractProfileDrivenFamilyV2 } from "./profile-driven-extractor.v2";

/**
 * Corpus copied from aeat_document_knowledge_pack_v1.json (profiles[].id/nameEs).
 * It deliberately does not import the recognition-rule registry, its canonical
 * titles or its anchors: changing a production rule cannot silently rewrite
 * this independent acceptance corpus.
 */
const INDEPENDENT_AEAT_FAMILY_CORPUS = Object.freeze([
  ["notification.delivery_attempt", "Intento, reenvío o carátula de notificación"],
  ["notification.publication_or_appearance", "Publicación o comparecencia para notificación"],
  ["notification.dehu_envelope", "Sobre, acuse o evidencia DEHú/Notific@"],
  ["information.tax_data_report", "Datos fiscales"],
  ["information.regulatory_change", "Comunicación informativa de cambio normativo o de canal"],
  ["information.model_filing_reminder", "Recordatorio de obligación de presentar un modelo"],
  ["identity.clave_registration_receipt", "Justificante de alta en Cl@ve"],
  ["certificate.tax_compliance", "Certificado de estar al corriente"],
  ["registry.tax_registration_resolution", "Resolución censal o registral"],
  ["compliance.informal_missing_return_notice", "Carta de aviso por declaraciones no registradas"],
  ["compliance.formal_filing_requirement", "Requerimiento formal de presentación"],
  ["compliance.document_request", "Requerimiento de documentación"],
  ["compliance.individual_information_requirement", "Requerimiento individual de información con trascendencia tributaria"],
  ["assessment.procedure_start", "Inicio de verificación, comprobación o regularización"],
  ["assessment.allegations_and_proposal", "Trámite de alegaciones y propuesta de liquidación"],
  ["assessment.final_provisional_assessment", "Resolución con liquidación provisional"],
  ["assessment.no_adjustment_resolution", "Terminación sin regularización o sin liquidación"],
  ["assessment.value_check", "Comprobación administrativa de valores"],
  ["sanction.initiation_and_hearing", "Inicio de expediente sancionador y audiencia"],
  ["sanction.resolution", "Resolución sancionadora"],
  ["sanction.loss_of_reduction", "Exigencia de reducción de sanción perdida"],
  ["collection.deferral_request_receipt", "Solicitud o justificante de aplazamiento o fraccionamiento"],
  ["collection.deferral_substantiation_requirement", "Requerimiento de subsanación o garantía de aplazamiento"],
  ["collection.deferral_grant", "Concesión de aplazamiento o fraccionamiento"],
  ["collection.deferral_modification", "Modificación de aplazamiento o fraccionamiento"],
  ["collection.deferral_denial", "Denegación de aplazamiento o fraccionamiento"],
  ["collection.deferral_inadmissibility_or_archival", "Inadmisión, desistimiento o archivo de aplazamiento"],
  ["collection.deferral_breach", "Incumplimiento de aplazamiento o fraccionamiento"],
  ["collection.interest_assessment", "Liquidación independiente de intereses de demora"],
  ["collection.enforcement_order", "Providencia de apremio"],
  ["collection.precautionary_measure", "Medida cautelar de recaudación"],
  ["collection.asset_sale", "Enajenación o subasta de bienes"],
  ["collection.late_filing_surcharge", "Liquidación de recargo por presentación fuera de plazo"],
  ["collection.external_debt", "Deuda de otro organismo recaudada por la AEAT"],
  ["collection.offset_requested", "Compensación a instancia del obligado"],
  ["collection.offset_ex_officio", "Compensación de oficio"],
  ["collection.offset_resolution", "Resolución total, parcial o denegatoria de compensación"],
  ["collection.extinction_or_balance_notice", "Comunicación de extinción, aplicación o saldo pendiente"],
  ["refund.request_or_recognition", "Solicitud, propuesta o reconocimiento de devolución"],
  ["refund.payment_communication", "Comunicación de pago de devolución"],
  ["refund.undue_payment", "Devolución de ingresos indebidos"],
  ["refund.withholding_or_offset", "Retención, compensación o aplicación de una devolución"],
  ["irpf.spouse_refund_suspension", "Suspensión de deuda IRPF mediante devolución del cónyuge"],
  ["review.guarantee_cost_reimbursement", "Reembolso del coste de garantías"],
  ["payment.payment_form", "Carta o documento de pago"],
  ["payment.receipt", "Justificante o recibo de pago"],
  [
    "payment.failed_or_reversed",
    "Pago fallido, rechazado, anulado o devuelto",
    "Pago rechazado",
  ],
  ["seizure.bank_account", "Embargo de cuenta o depósito"],
  ["seizure.movable_asset", "Embargo de bien mueble"],
  ["seizure.real_estate", "Embargo de inmueble"],
  ["seizure.commercial_credits", "Embargo de créditos comerciales o arrendaticios"],
  ["seizure.compliance_reiteration", "Reiteración de obligaciones de embargo de créditos"],
  ["seizure.release", "Levantamiento de embargo"],
  ["seizure.wages_or_pensions", "Embargo de sueldos, salarios o pensiones"],
  ["seizure.securities_or_financial_assets", "Embargo de valores u otros activos financieros"],
  ["seizure.cash_or_refund", "Embargo de efectivo, devolución o crédito frente a la Administración"],
  ["seizure.tpv_receipts", "Embargo de cobros mediante terminal de punto de venta"],
  ["seizure.business_income_or_rents", "Embargo de ingresos de actividad o rentas"],
  ["seizure.third_party_response", "Contestación de tercero a una diligencia de embargo"],
  ["seizure.third_party_payment", "Ingreso efectuado por receptor o tercero retenedor"],
  ["review.recurso_reposicion", "Recurso de reposición"],
  ["review.economic_administrative_claim", "Reclamación económico-administrativa"],
  ["review.suspension_request", "Solicitud o justificante de suspensión"],
  ["review.suspension_decision", "Acuerdo sobre la suspensión solicitada"],
  ["review.resolution", "Resolución de recurso o reclamación"],
  ["review.material_error", "Rectificación de error material, de hecho o aritmético"],
  ["review.revocation", "Procedimiento especial de revocación"],
  ["review.nullity", "Revisión de acto nulo de pleno derecho"],
  ["review.lesivity", "Declaración de lesividad de acto anulable"],
  ["review.third_party_claim", "Tercería de dominio o de mejor derecho"],
  ["liability.proposal", "Propuesta y audiencia de declaración de responsabilidad"],
  ["liability.final_resolution", "Acuerdo final de declaración de responsabilidad"],
  ["liability.solidary", "Declaración de responsabilidad solidaria"],
  ["liability.subsidiary", "Declaración de responsabilidad subsidiaria"],
  ["liability.successors", "Recaudación frente a sucesores"],
  ["inspection.procedure", "Procedimiento inspector"],
  ["inspection.communication", "Comunicación de inicio, alcance o ampliación inspectora"],
  ["inspection.diligence", "Diligencia de actuaciones inspectoras"],
  ["inspection.act_agreement", "Acta con acuerdo"],
  ["inspection.act_conformity", "Acta de conformidad"],
  ["inspection.act_disagreement", "Acta de disconformidad"],
  ["inspection.assessment", "Acuerdo o liquidación derivada de inspección"],
  ["registry.census_requirement", "Requerimiento de comprobación o rectificación censal"],
  ["registry.census_proposal", "Propuesta de rectificación censal y alegaciones"],
  ["registry.tax_domicile_resolution", "Acuerdo o resolución sobre domicilio fiscal"],
  ["registry.nif_revocation", "Acuerdo de revocación del NIF"],
  ["registry.nif_rehabilitation", "Acuerdo de rehabilitación del NIF"],
] as const satisfies readonly (readonly [
  FiscalNotificationDocumentFamilyIdV3,
  string,
  ...string[],
])[]);

const OWNER_SCOPE = "user:synthetic-independent-corpus";

function document(title: string, bodyLines: readonly string[] = []): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: `synthetic-${title.length}`,
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: [
          "Agencia Estatal de Administración Tributaria",
          "Gobierno de España",
          title,
          ...bodyLines,
        ].join("\n"),
        isBlank: false,
      }),
    ]),
  });
}

describe("profile-driven extractor v2 independent AEAT corpus", () => {
  it("recognizes the 87 profile titles copied from the external knowledge pack", async () => {
    expect(INDEPENDENT_AEAT_FAMILY_CORPUS).toHaveLength(87);
    expect(new Set(INDEPENDENT_AEAT_FAMILY_CORPUS.map(([id]) => id)).size).toBe(87);

    for (const [expectedFamilyId, title, ...bodyLines] of INDEPENDENT_AEAT_FAMILY_CORPUS) {
      const result = await extractProfileDrivenFamilyV2({
        document: document(title, bodyLines),
      });
      expect(result.status, `${expectedFamilyId}:${title}`).toBe("REVIEW_REQUIRED");
      expect(result.familyId, `${expectedFamilyId}:${title}`).toBe(expectedFamilyId);
      expect(result.confirmsFamily, expectedFamilyId).toBe(false);
      expect(result.requiresHumanReview, expectedFamilyId).toBe(true);
      expect(result.materializationPolicy, expectedFamilyId).toBe("PROHIBITED");
    }
  });

  it("does not accept prefixed draft headings as exact family titles", async () => {
    for (const [expectedFamilyId, title, ...bodyLines] of INDEPENDENT_AEAT_FAMILY_CORPUS) {
      const result = await extractProfileDrivenFamilyV2({
        document: document(`Borrador sintético — ${title}`, bodyLines),
      });
      expect(result.status, expectedFamilyId).toBe("UNKNOWN");
      expect(result.familyId, expectedFamilyId).toBeNull();
      expect(result.fieldCandidates, expectedFamilyId).toEqual([]);
    }
  });
});
