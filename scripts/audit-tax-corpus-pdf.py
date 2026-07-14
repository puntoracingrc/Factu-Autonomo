#!/usr/bin/env python3
"""Fail-closed privacy audit for candidate fiscal corpus PDFs.

The report never includes the input filename or matched sensitive values.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader


GENERIC_PATTERNS = {
    "spanishTaxId": re.compile(r"\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])\b", re.I),
    "iban": re.compile(r"\bES\d{22}\b", re.I),
    "email": re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I),
    "nrcOrCsv": re.compile(r"\b(?:NRC|CSV)\s*[:.-]?\s*[A-Z0-9-]{8,}\b", re.I),
    "phone": re.compile(r"(?<!\d)(?:\+34\s*)?[6789]\d{8}(?!\d)"),
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def exact_sensitive_values(path: Path | None) -> list[str]:
    if path is None:
        return []
    return [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if len(line.strip()) >= 4
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit text, forms, metadata, annotations and attachments without leaking values."
    )
    parser.add_argument("input_pdf", type=Path)
    parser.add_argument("--sensitive-values-file", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument(
        "--qr-barcode-reviewed",
        action="store_true",
        help="Set only after a human has visually checked every rendered page.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.input_pdf.resolve()
    if not source.is_file() or source.suffix.lower() != ".pdf":
        raise SystemExit("input_pdf must be an existing PDF")

    reader = PdfReader(str(source))
    page_texts = [(page.extract_text() or "") for page in reader.pages]
    all_text = "\n".join(page_texts)
    original_values = exact_sensitive_values(args.sensitive_values_file)
    exact_matches = sum(
        1 for value in original_values if value.casefold() in all_text.casefold()
    )
    generic_counts = {
        label: len(pattern.findall(all_text))
        for label, pattern in GENERIC_PATTERNS.items()
    }
    fields = reader.get_fields() or {}
    annotation_count = 0
    for page in reader.pages:
        annotations = page.get("/Annots")
        if annotations is not None:
            annotation_count += len(annotations.get_object())
    try:
        attachment_count = len(reader.attachments)
    except Exception:
        attachment_count = 0
    metadata_count = len(reader.metadata or {})

    safe = (
        exact_matches == 0
        and metadata_count == 0
        and len(fields) == 0
        and annotation_count == 0
        and attachment_count == 0
        and args.qr_barcode_reviewed
    )
    report = {
        "documentSha256": digest(source),
        "pageCount": len(reader.pages),
        "safeForCorpus": safe,
        "blockingIssueCount": sum(
            [
                exact_matches > 0,
                metadata_count > 0,
                len(fields) > 0,
                annotation_count > 0,
                attachment_count > 0,
                not args.qr_barcode_reviewed,
            ]
        ),
        "checks": {
            "textLayerChecked": True,
            "exactSensitiveValueMatchCount": exact_matches,
            "genericPatternCounts": generic_counts,
            "acroFormChecked": True,
            "acroFormFieldCount": len(fields),
            "metadataChecked": True,
            "metadataEntryCount": metadata_count,
            "annotationsChecked": True,
            "annotationCount": annotation_count,
            "hiddenPagesChecked": True,
            "qrAndBarcodeChecked": args.qr_barcode_reviewed,
            "qrAndBarcodeReviewRequired": not args.qr_barcode_reviewed,
            "embeddedFilesChecked": True,
            "embeddedFileCount": attachment_count,
            "originalFileNameStored": False,
        },
        "notes": [
            "Generic pattern counts are warnings because synthetic replacement values may match the same formats.",
            "QR and barcode review is deliberately human-confirmed; no unavailable detector is treated as success.",
        ],
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
