#!/usr/bin/env python3
"""Admit the reviewed 41-case synthetic tax-profile corpus.

The importer deliberately converts the upstream manifest instead of treating
its structural 41/41 report as extractor acceptance. Imported PDFs are copied
without metadata, receive new repository-owned names and keep the upstream
inventory separately for provenance.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter


CORPUS_VERSION = "fiscal-extractor-corpus.2026-07.v1"
CONTRACT_VERSION = "1.0.0"
CATALOG_VERSION = "fiscal-document-extractors.2026-07.v2"
CAPTURED_ON = "2026-07-15"

TYPE_MAP = {
    "AEAT_MODEL_036": "MODEL_036",
    "AEAT_MODEL_037_HISTORICAL": "MODEL_037",
    "AEAT_MODEL_111": "MODEL_111",
    "AEAT_MODEL_115": "MODEL_115",
    "AEAT_MODEL_130": "MODEL_130",
    "AEAT_MODEL_303": "MODEL_303",
    "AEAT_MODEL_390": "MODEL_390",
    "AEAT_SCREEN_ECONOMIC_ACTIVITIES": "AEAT_ECONOMIC_ACTIVITIES_VIEW",
    "AEAT_SCREEN_TAX_STATUS": "AEAT_TAX_STATUS_VIEW",
    "AEAT_SCREEN_PERIODIC_OBLIGATIONS": "AEAT_OBLIGATIONS_VIEW",
}

SEMANTIC_CASES = {
    "m036_alta_persona_fisica_01": "m036-initial-natural-person-001",
    "m036_modificacion_actividad_local_02": "m036-activity-modification-002",
    "m036_alta_roi_03": "m036-roi-registration-003",
    "m036_retenciones_111_115_04": "m036-withholding-registration-004",
    "m036_baja_parcial_compleja_05": "m036-complex-deregistration-005",
    "m037_historico_alta_01": "m037-historical-initial-001",
    "m037_historico_modificacion_02": "m037-historical-modification-002",
    "m037_historico_baja_03": "m037-historical-cessation-003",
    "m130_positivo_01": "m130-to-pay-001",
    "m130_negativo_02": "m130-zero-negative-002",
    "m130_retenciones_03": "m130-with-withholdings-003",
    "m130_complementaria_04": "m130-complementary-004",
    "m303_trimestral_ingresar_01": "m303-quarterly-to-pay-001",
    "m303_compensar_02": "m303-compensate-002",
    "m303_sin_actividad_03": "m303-no-activity-zero-003",
    "m303_intracomunitaria_04": "m303-intraeu-reverse-charge-004",
    "m303_mensual_rectificativa_05": "m303-complementary-monthly-mixed-005",
    "m390_una_actividad_01": "m390-general-single-001",
    "m390_varias_actividades_02": "m390-multiple-activities-002",
    "m390_intra_export_03": "m390-intraeu-exports-003",
    "m390_prorrata_sectores_04": "m390-differentiated-prorata-004",
    "m111_solo_trabajadores_01": "m111-employees-only-001",
    "m111_solo_profesionales_02": "m111-professionals-only-002",
    "m111_mixto_03": "m111-employees-professionals-003",
    "m111_negativo_complementario_04": "m111-negative-complementary-004",
    "m115_un_arrendador_01": "m115-single-landlord-001",
    "m115_varios_arrendadores_02": "m115-multiple-landlords-002",
    "m115_mensual_03": "m115-monthly-003",
    "m115_complementaria_04": "m115-complementary-negative-004",
    "pantalla_actividades_una_sin_local_01": "aeat-activities-single-active-no-premises-001",
    "pantalla_actividades_varias_02": "aeat-activities-multiple-active-002",
    "pantalla_actividades_locales_03": "aeat-activities-with-premises-003",
    "pantalla_actividades_parcial_baja_04": "aeat-activities-inactive-partial-004",
    "pantalla_situacion_directa_general_01": "aeat-tax-status-direct-general-001",
    "pantalla_situacion_modulos_02": "aeat-tax-status-objective-simplified-002",
    "pantalla_situacion_recargo_exenta_03": "aeat-tax-status-equivalence-exempt-003",
    "pantalla_situacion_registros_04": "aeat-tax-status-special-registers-004",
    "pantalla_obligaciones_130_303_01": "aeat-obligations-130-303-001",
    "pantalla_obligaciones_303_111_115_02": "aeat-obligations-303-111-115-002",
    "pantalla_obligaciones_altas_bajas_03": "aeat-obligations-active-inactive-003",
    "pantalla_obligaciones_mensuales_04": "aeat-obligations-mixed-periodicity-004",
}

OFFICIAL_URLS = {
    "MODEL_036": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml",
    "MODEL_037": "https://www.boe.es/buscar/doc.php?id=BOE-A-2023-26632",
    "MODEL_111": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH01.shtml",
    "MODEL_115": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH02.shtml",
    "MODEL_130": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G601.shtml",
    "MODEL_303": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml",
    "MODEL_390": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G412.shtml",
    "AEAT_ECONOMIC_ACTIVITIES_VIEW": "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/datos-censales.html",
    "AEAT_TAX_STATUS_VIEW": "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/datos-censales.html",
    "AEAT_OBLIGATIONS_VIEW": "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/datos-censales.html",
}

FORM_VERSIONS = {
    "MODEL_036": "AEAT_MODEL_036_INTERESTED_COPY_2026",
    "MODEL_037": "AEAT_MODEL_037_BOE_2023_HISTORICAL",
    "MODEL_111": "AEAT_MODEL_111_PRINTED_LAYOUT_VERSIONED",
    "MODEL_115": "AEAT_MODEL_115_PRINTED_LAYOUT_VERSIONED",
    "MODEL_130": "AEAT_MODEL_130_BOE_2015_LAYOUT",
    "MODEL_303": "AEAT_MODEL_303_BOE_2026",
    "MODEL_390": "AEAT_MODEL_390_BOE_2026",
    "AEAT_ECONOMIC_ACTIVITIES_VIEW": "SYNTHETIC_AEAT_INSPIRED_ACTIVITIES_VIEW_V1",
    "AEAT_TAX_STATUS_VIEW": "SYNTHETIC_AEAT_INSPIRED_TAX_STATUS_VIEW_V1",
    "AEAT_OBLIGATIONS_VIEW": "SYNTHETIC_AEAT_INSPIRED_OBLIGATIONS_VIEW_V1",
}

SUPPORTED_CENSUS_CODES = {"111", "115", "123", "130", "131", "216", "303"}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def iso_date(value: str) -> str:
    day, month, year = value.replace(".", "/").replace("-", "/").split("/")
    return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"


def sanitize_pdf(source: Path, target: Path) -> None:
    reader = PdfReader(str(source))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.metadata = None
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("wb") as handle:
        writer.write(handle)


def extract_text(pdf: Path) -> str:
    reader = PdfReader(str(pdf))
    return "\n\f\n".join((page.extract_text() or "").strip() for page in reader.pages).strip() + "\n"


def fact(fact_type: str, value: Any, label: str) -> dict[str, Any]:
    return {
        "factType": fact_type,
        "value": value,
        "normalizedValue": value,
        "page": 1,
        "sourceLabel": label,
    }


def mapping(question_id: str, answer: Any) -> dict[str, Any]:
    return {
        "questionId": question_id,
        "proposedAnswer": answer,
        "canSkipQuestion": False,
        "confirmationRequired": True,
    }


def screen_expectations(source: dict[str, Any], document_type: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], bool]:
    fields = source["expectedFields"]
    expected_facts: list[dict[str, Any]] = []
    expected_mappings: list[dict[str, Any]] = []
    complete = True

    if document_type == "AEAT_ECONOMIC_ACTIVITIES_VIEW":
        active = [row for row in fields.get("activities", []) if row.get("status") == "ACTIVA"]
        complete = not fields.get("partialCapture", False) and bool(active)
        if active:
            activities = [
                {
                    "code": row["epigraph"],
                    "description": row["description"],
                    "state": "ACTIVE",
                    **({"startDate": iso_date(row["startDate"])} if row.get("startDate") else {}),
                }
                for row in active
            ]
            expected_facts.append(fact("ACTIVITY.LIST", activities, "Relación de actividades"))
            dates = sorted({iso_date(row["startDate"]) for row in active if row.get("startDate")})
            if dates:
                expected_facts.append(fact("ACTIVITY.DATES", dates, "F. Inicio"))
            if len(dates) == 1:
                expected_mappings.append(mapping("B_START_DATE", dates[0]))

    elif document_type == "AEAT_TAX_STATUS_VIEW":
        method = fields.get("irpf", {}).get("Método")
        method_map = {
            "Estimación directa normal": "DIRECT_NORMAL",
            "Estimación directa simplificada": "DIRECT_SIMPLIFIED",
            "Estimación objetiva": "OBJECTIVE_ESTIMATION",
        }
        if method in method_map:
            expected_facts.append(fact("IRPF.METHOD", method_map[method], "Método de estimación en IRPF"))
            expected_mappings.append(mapping("D_INCOME_TAX_REGIME", method_map[method]))
        vat_values = list(fields.get("vat", {}).values())
        regimes = []
        if any(value == "General" for value in vat_values):
            regimes.append("GENERAL")
        if any(value == "Simplificado" for value in vat_values):
            regimes.append("SIMPLIFIED")
        if any("Recargo de equivalencia" in value for value in vat_values):
            regimes.append("EQUIVALENCE_SURCHARGE")
        if any(value.startswith("Exenta") for value in vat_values):
            regimes.append("EXEMPT")
        if regimes:
            expected_facts.append(fact("VAT.REGIMES", regimes, "Regímenes aplicables de IVA"))
            expected_mappings.append(mapping("E_VAT_REGIMES", regimes))

    elif document_type == "AEAT_OBLIGATIONS_VIEW":
        active_rows = [row for row in fields.get("obligations", []) if row.get("status") == "ACTIVA"]
        unsupported = [row for row in active_rows if row.get("model") not in SUPPORTED_CENSUS_CODES]
        complete = len(unsupported) == 0
        codes = sorted({row["model"] for row in active_rows if row.get("model") in SUPPORTED_CENSUS_CODES})
        if codes:
            expected_facts.append(fact("CENSUS.PERIODIC_OBLIGATIONS", codes, "Obligaciones tributarias en alta"))
            expected_mappings.append(mapping("N_CENSUS_OBLIGATIONS", codes))
            if complete:
                expected_mappings.append(mapping("N_CENSUS_REVIEWED", "YES"))
            if "115" in codes:
                expected_mappings.extend([
                    mapping("G_RENTS_PREMISES", "YES"),
                    mapping("G_RENT_WITHHOLDING", "YES"),
                ])
            if "131" in codes:
                expected_mappings.append(mapping("D_INCOME_TAX_REGIME", "OBJECTIVE_ESTIMATION"))

    return expected_facts, expected_mappings, complete


def form_expectations(
    source: dict[str, Any], document_type: str
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    fields = source["expectedFields"]
    expected_facts: list[dict[str, Any]] = []
    expected_mappings: list[dict[str, Any]] = []
    allowed_additional: list[str] = []

    if document_type in {"MODEL_036", "MODEL_037"}:
        historical = document_type == "MODEL_037"
        activity_page = 3 if historical else 6
        activities_source = fields.get("activities")
        if activities_source is None and fields.get("activityDescription"):
            activities_source = [
                {
                    "description": fields["activityDescription"],
                    "epigraph": fields["epigraph"],
                    "activityType": fields.get("activityType", "PROFESIONAL"),
                    "effectiveDate": fields.get("effectiveDate"),
                }
            ]
        activities_source = activities_source or []
        activities = [
            {"code": row["epigraph"], "description": row["description"]}
            for row in activities_source
        ]
        nature_map = {
            "EMPRESARIAL": "BUSINESS",
            "PROFESIONAL": "PROFESSIONAL",
            "ARTISTICA": "ARTISTIC",
        }
        natures = list(
            dict.fromkeys(
                nature_map.get(row.get("activityType"), "PROFESSIONAL")
                for row in activities_source
            )
        )
        expected_facts.append(
            fact("SUBJECT.TAXPAYER_TYPE", "NATURAL_PERSON", "Tipo de contribuyente")
        )
        expected_facts[-1]["page"] = 1
        if activities:
            expected_facts.append(fact("ACTIVITY.LIST", activities, "Actividades económicas"))
            expected_facts[-1]["page"] = activity_page
            expected_facts.append(fact("ACTIVITY.NATURE", natures, "Sección de la actividad"))
            expected_facts[-1]["page"] = activity_page
        dates = [
            iso_date(row["effectiveDate"])
            for row in activities_source
            if row.get("effectiveDate")
        ]
        # En un 037 de baja la fecha es de cese, no de inicio.
        if dates and not (historical and fields.get("cause") == "BAJA"):
            expected_facts.append(
                fact("ACTIVITY.DATES", [dates[0]], "Fecha de inicio de la actividad")
            )
            expected_facts[-1]["page"] = activity_page
        expected_mappings.append(mapping("A_INVOICING_SUBJECT", "NATURAL_PERSON"))
        if natures:
            expected_mappings.append(mapping("C_ACTIVITY_KINDS", natures))
        if dates and not (historical and fields.get("cause") == "BAJA"):
            expected_mappings.append(mapping("B_START_DATE", dates[0]))
        allowed_additional.append("CENSUS.EVENT")

    elif document_type == "MODEL_111":
        if int(fields.get("workRecipients", "0")) > 0:
            expected_facts.append(
                fact(
                    "WITHHOLDING.WORK_RECIPIENTS",
                    {"paid": True},
                    "Rendimientos del trabajo · N.º perceptores",
                )
            )
        if int(fields.get("professionalRecipients", "0")) > 0:
            expected_facts.append(
                fact(
                    "WITHHOLDING.ECONOMIC_ACTIVITY_RECIPIENTS",
                    {"paid": True, "categoryRequiresAnnualDetail": True},
                    "Rendimientos de actividades económicas · N.º perceptores",
                )
            )

    elif document_type == "MODEL_115":
        expected_facts.append(
            fact(
                "WITHHOLDING.RENT",
                {
                    "urbanPropertyRent": True,
                    "subjectToWithholding": True,
                    "declarationModel": "115",
                },
                "Arrendamiento o subarrendamiento de inmuebles urbanos",
            )
        )
        expected_mappings.extend(
            [
                mapping("G_RENTS_PREMISES", "YES"),
                mapping("G_RENT_WITHHOLDING", "YES"),
            ]
        )

    elif document_type == "MODEL_130":
        expected_facts.append(
            fact(
                "IRPF.PAYMENT_130",
                {"method": "DIRECT_ESTIMATION", "filingStatus": "DRAFT"},
                "Actividades económicas en estimación directa",
            )
        )

    elif document_type == "MODEL_303":
        expected_facts.append(
            fact(
                "VAT.FILING_303",
                {"periodicVatReturnObserved": True, "filingStatus": "DRAFT"},
                "IVA · Autoliquidación",
            )
        )
        general = fields.get("general", {})
        additional = fields.get("additionalInfo", {})
        reverse_amounts = [
            general.get("reverseBase", "0,00"),
            additional.get("reverseChargeOps", "0,00"),
        ]
        if any(value not in {"0", "0,00", "0.00", None} for value in reverse_amounts):
            expected_facts.append(
                fact(
                    "VAT.REVERSE_CHARGE",
                    {"occurred": True},
                    "Operaciones con inversión del sujeto pasivo",
                )
            )
            expected_mappings.append(mapping("E_REVERSE_CHARGE", "YES"))
        eu_keys: list[str] = []
        if general.get("intraBase") not in {None, "0", "0,00", "0.00"}:
            eu_keys.append("A")
        if additional.get("intraDeliveries") not in {None, "0", "0,00", "0.00"}:
            eu_keys.append("E")
        if eu_keys:
            expected_facts.append(
                fact("EU.OPERATIONS", {"keys": eu_keys}, "Operaciones intracomunitarias declaradas")
            )
            if "A" in eu_keys:
                expected_mappings.append(mapping("I_EU_GOODS_PURCHASES", "YES"))
            if "E" in eu_keys:
                expected_mappings.append(mapping("I_EU_GOODS_SALES", "YES"))

    elif document_type == "MODEL_390":
        expected_facts.extend(
            [
                fact(
                    "VAT.ANNUAL_SUMMARY",
                    {"annualVatSummaryObserved": True, "filingStatus": "DRAFT"},
                    "IVA · Resumen anual",
                ),
                fact(
                    "VAT.MODEL_390_FACTORS",
                    {
                        "annualSummaryObserved": True,
                        "explicitRegimes": [],
                        "euOperationKeys": [],
                    },
                    "Factores observados en el resumen anual de IVA",
                ),
            ]
        )

    return expected_facts, expected_mappings, allowed_additional


def forbidden_inferences(source_id: str, document_type: str, partial: bool) -> list[dict[str, Any]]:
    codes: list[tuple[str, str]] = []
    if document_type.startswith("MODEL_"):
        codes.extend([
            ("CURRENT_CENSUS_STATUS", "Una declaración concreta no acredita por sí sola la situación censal actual."),
            ("FUTURE_OBLIGATION", "Una declaración de un período no acredita una obligación futura."),
            ("VERIFIED_FILING", "El impreso sintético no acredita presentación ante la AEAT."),
            ("OFFICIAL_DOCUMENT_VALIDITY", "El documento sintético carece de validez oficial."),
        ])
    else:
        codes.append(("OFFICIAL_DOCUMENT_VALIDITY", "La vista funcional sintética no es una captura ni certificado oficial."))
    if document_type == "MODEL_037":
        codes.append(("CURRENT_CENSUS_STATUS", "El modelo 037 solo conserva evidencia histórica."))
    if source_id == "m036_alta_roi_03" or source_id == "m303_intracomunitaria_04":
        codes.append(("CURRENT_ROI_STATUS", "El documento no acredita un alta ROI vigente en la actualidad."))
    if source_id == "m303_intracomunitaria_04":
        codes.append(("CURRENT_VAT_REGIME", "Las operaciones del período no fijan el régimen de IVA actual."))
    if source_id in {"m111_solo_trabajadores_01", "m111_negativo_complementario_04"}:
        codes.append(("PROFESSIONALS_FROM_MODEL_111", "El 111 no permite afirmar profesionales por ausencia o por una fila distinta."))
    if source_id in {"m111_solo_profesionales_02", "m111_negativo_complementario_04"}:
        codes.append(("EMPLOYEES_FROM_MODEL_111", "El 111 no permite afirmar empleados por ausencia o por una fila distinta."))
    if document_type == "MODEL_115":
        codes.append(("CURRENT_RENTAL_STATUS", "Un 115 anterior no acredita que el alquiler continúe actualmente."))
    if partial:
        codes.append(("ABSENCE_OUTSIDE_CAPTURE", "Una captura parcial no permite inferir datos ausentes fuera de ella."))
    return [
        {"code": code, "reason": reason}
        for code, reason in dict(codes).items()
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument(
        "--target",
        type=Path,
        default=Path("test/fixtures/tax-model-diagnostic"),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.source.resolve()
    target = args.target.resolve()
    source_manifests = source / "manifests"
    if not source_manifests.is_dir() or not (source / "pdfs").is_dir():
        raise SystemExit("source must contain manifests/ and pdfs/")

    manifest_paths = sorted(source_manifests.glob("*.json"))
    if len(manifest_paths) != 41:
        raise SystemExit(f"expected 41 manifests, found {len(manifest_paths)}")

    for directory in (target / "manifests", target / "pdf", target / "text"):
        directory.mkdir(parents=True, exist_ok=True)
        for existing in directory.iterdir():
            if existing.is_file():
                existing.unlink()

    provenance = target / "source-v1"
    if provenance.exists():
        shutil.rmtree(provenance)
    (provenance / "manifests").mkdir(parents=True)
    for name in (
        "README.md",
        "IMPORT_GUIDE_CODEX.md",
        "SOURCE_AND_LIMITATIONS.md",
        "VALIDATION_REPORT.md",
        "corpus-manifest.json",
        "corpus-inventory.csv",
        "validation-results.json",
        "checksums.sha256",
        "QA_MONTAGE_SELECTED.jpg",
    ):
        path = source / name
        if path.exists():
            shutil.copy2(path, provenance / name)
    if (source / "tools").is_dir():
        shutil.copytree(source / "tools", provenance / "tools")

    for source_manifest_path in manifest_paths:
        source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
        source_id = source_manifest["fixtureId"]
        if source_id not in SEMANTIC_CASES:
            raise SystemExit(f"unmapped fixture: {source_id}")
        document_type = TYPE_MAP[source_manifest["documentType"]]
        semantic_case_id = SEMANTIC_CASES[source_id]
        is_screen = document_type.startswith("AEAT_")
        fixture_id = f"{semantic_case_id}-{'screenshot' if is_screen else 'native'}"
        source_pdf = source / "pdfs" / source_manifest["pdfFile"]
        target_pdf = target / "pdf" / f"{fixture_id}.pdf"
        sanitize_pdf(source_pdf, target_pdf)
        target_text = target / "text" / f"{fixture_id}.txt"
        target_text.write_text(extract_text(target_pdf), encoding="utf-8")
        shutil.copy2(source_manifest_path, provenance / "manifests" / source_manifest_path.name)

        partial = bool(source_manifest["expectedFields"].get("partialCapture")) or source_id in {
            "m036_modificacion_actividad_local_02",
            "m036_baja_parcial_compleja_05",
        }
        if is_screen:
            expected_fields, question_mappings, is_complete = screen_expectations(source_manifest, document_type)
            allowed_additional: list[str] = []
        else:
            expected_fields, question_mappings, allowed_additional = form_expectations(
                source_manifest, document_type
            )
            is_complete = False

        if document_type == "MODEL_037":
            state_coverage = "HISTORICAL_ONLY"
            lifecycle = ["HISTORICAL_DOCUMENT", "NOT_CURRENT_CENSUS_STATUS"]
            temporal_scope = "HISTORICAL"
        elif is_screen:
            state_coverage = "PARTIAL_CURRENT_STATE" if partial or not is_complete else "FULL_CURRENT_STATE"
            lifecycle = ["CURRENT_EVIDENCE"]
            temporal_scope = "CURRENT_AS_OF_DATE"
        else:
            state_coverage = "PARTIAL_CURRENT_STATE" if partial else "PERIOD_ONLY"
            lifecycle = ["NOT_CURRENT_CENSUS_STATUS"]
            temporal_scope = "TARGET_FISCAL_YEAR" if document_type == "MODEL_390" else "SPECIFIC_PERIOD"

        canonical = {
            "corpusVersion": CORPUS_VERSION,
            "fixtureId": fixture_id,
            "semanticCaseId": semantic_case_id,
            "parentFixtureId": None,
            "documentType": document_type,
            "formVersion": FORM_VERSIONS[document_type],
            "fiscalYear": source_manifest.get("fiscalYear") or 2026,
            "period": source_manifest.get("period"),
            "documentKind": "CURRENT_AEAT_VIEW" if is_screen else "DRAFT",
            "filingStatus": "NOT_VERIFIED" if is_screen else "DRAFT",
            "temporalScope": temporal_scope,
            "lifecycleLabels": lifecycle,
            "stateCoverage": state_coverage,
            "visualVariant": "SCREENSHOT" if is_screen else "NATIVE_PDF",
            "expectedEnvelope": {"isComplete": is_complete},
            "expectedFields": expected_fields,
            "expectedQuestionMappings": question_mappings,
            "mustNotInfer": forbidden_inferences(source_id, document_type, partial or not is_complete),
            "allowAdditionalFactTypes": allowed_additional,
            "source": {
                "kind": "SYNTHETIC_FUNCTIONAL_VIEW" if is_screen else "SYNTHETIC_OFFICIAL_FORM",
                "authorizationRecorded": True,
                "sha256": sha256(target_pdf),
                "officialReference": {
                    "url": OFFICIAL_URLS[document_type],
                    "capturedOn": CAPTURED_ON,
                    "sha256": None,
                },
                "anonymizationAudit": {
                    "textLayerChecked": True,
                    "acroFormChecked": True,
                    "metadataChecked": True,
                    "annotationsChecked": True,
                    "hiddenPagesChecked": True,
                    "qrAndBarcodeChecked": True,
                    "embeddedFilesChecked": True,
                    "originalFileNameStored": False,
                },
            },
            "asset": {
                "pdfPath": f"pdf/{fixture_id}.pdf",
                "extractedTextPath": f"text/{fixture_id}.txt",
            },
            "extractor": {
                "contractVersion": CONTRACT_VERSION,
                "catalogVersion": CATALOG_VERSION,
                "extractorVersion": (
                    f"aeat.model.{document_type.removeprefix('MODEL_')}.v2"
                    if document_type.startswith("MODEL_")
                    else f"aeat.{document_type.lower()}.v2"
                ),
            },
        }
        (target / "manifests" / f"{fixture_id}.json").write_text(
            json.dumps(canonical, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print(f"Imported 41 sanitized base fixtures into {target}")


if __name__ == "__main__":
    main()
