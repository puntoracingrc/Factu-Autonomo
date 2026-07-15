#!/usr/bin/env python3
"""Fail-closed multilayer PII scanner for an admitted fiscal PDF candidate.

The report contains only counts and a SHA-256. It never emits the filename,
paths or matched values.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader


PATTERNS = {
    "taxId": re.compile(r"\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])\b", re.I),
    "iban": re.compile(r"\bES\d{22}\b", re.I),
    "email": re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I),
    "phone": re.compile(r"(?<!\d)(?:\+34\s*)?[6789]\d{8}(?!\d)"),
    "nrcOrCsv": re.compile(r"\b(?:NRC|CSV)\s*[:.-]?\s*[A-Z0-9-]{8,}\b", re.I),
    "postalCode": re.compile(r"\b(?:0[1-9]|[1-4]\d|5[0-2])\d{3}\b"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scan every accessible PDF layer without logging values")
    parser.add_argument("input_pdf", type=Path)
    parser.add_argument("--known-original-values", type=Path)
    parser.add_argument("--qr-barcode-reviewed", action="store_true")
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def strings(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, bytes):
        return [value.decode("utf-8", errors="ignore")]
    if isinstance(value, dict):
        output: list[str] = []
        for key, nested in value.items():
            output.extend(strings(key))
            output.extend(strings(nested))
        return output
    if isinstance(value, (list, tuple)):
        output = []
        for nested in value:
            output.extend(strings(nested))
        return output
    return [str(value)]


def known_values(path: Path | None) -> list[str]:
    if path is None:
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if len(line.strip()) >= 4]


def main() -> None:
    args = parse_args()
    source = args.input_pdf.resolve()
    if not source.is_file() or source.suffix.lower() != ".pdf":
        raise SystemExit("INPUT_MUST_BE_PDF")
    reader = PdfReader(str(source), strict=True)
    if reader.is_encrypted:
        raise SystemExit("ENCRYPTED_PDF_REJECTED")

    layer_values: dict[str, list[str]] = {
        "fileName": [source.name],
        "nativeText": [],
        "metadata": strings(reader.metadata),
        "acroForm": strings(reader.get_fields() or {}),
        "xfa": [],
        "annotations": [],
        "embeddedFiles": [],
        "optionalContent": [],
        "javascript": [],
    }
    root = reader.trailer.get("/Root", {})
    root_object = root.get_object() if hasattr(root, "get_object") else root
    layer_values["xfa"].extend(strings(root_object.get("/AcroForm", {}).get("/XFA") if isinstance(root_object.get("/AcroForm"), dict) else None))
    layer_values["optionalContent"].extend(strings(root_object.get("/OCProperties")))
    layer_values["javascript"].extend(strings(root_object.get("/Names", {}).get("/JavaScript") if isinstance(root_object.get("/Names"), dict) else None))
    layer_values["embeddedFiles"].extend(strings(root_object.get("/Names", {}).get("/EmbeddedFiles") if isinstance(root_object.get("/Names"), dict) else None))

    external_link_count = 0
    for page in reader.pages:
        layer_values["nativeText"].append(page.extract_text() or "")
        annotations = page.get("/Annots")
        if annotations is None:
            continue
        for annotation_ref in annotations.get_object():
            annotation = annotation_ref.get_object()
            layer_values["annotations"].extend(strings(annotation))
            action = annotation.get("/A")
            if action and action.get_object().get("/URI"):
                external_link_count += 1

    exact_values = known_values(args.known_original_values)
    generic_counts = {label: 0 for label in PATTERNS}
    exact_match_count = 0
    for values in layer_values.values():
        for value in values:
            folded = value.casefold()
            exact_match_count += sum(original.casefold() in folded for original in exact_values)
            for label, pattern in PATTERNS.items():
                generic_counts[label] += len(pattern.findall(value))

    generic_match_count = sum(generic_counts.values())
    has_javascript = bool(layer_values["javascript"])
    embedded_file_count = len(layer_values["embeddedFiles"])
    safe = (
        exact_match_count == 0
        and generic_match_count == 0
        and not has_javascript
        and embedded_file_count == 0
        and args.qr_barcode_reviewed
    )
    report = {
        "scannerVersion": "tax-real-variant-pii.2026-07.v1",
        "documentSha256": digest(source),
        "pageCount": len(reader.pages),
        "safeForCorpus": safe,
        "rawValuesExposed": False,
        "layerCount": len(layer_values),
        "genericPatternCounts": generic_counts,
        "knownOriginalMatchCount": exact_match_count,
        "hasJavaScript": has_javascript,
        "embeddedFileCount": embedded_file_count,
        "externalLinkCount": external_link_count,
        "qrAndBarcodeChecked": args.qr_barcode_reviewed,
        "humanVisualReviewStillRequired": True,
    }
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    if not safe:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
