#!/usr/bin/env python3
"""Generate deterministic image-only PDF degradations for one fiscal fixture."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from pypdf import PdfReader, PdfWriter


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render_pdf(source: Path, output: Path, dpi: int) -> list[Image.Image]:
    output.mkdir(parents=True, exist_ok=True)
    prefix = output / "page"
    subprocess.run(
        ["pdftoppm", "-png", "-r", str(dpi), str(source), str(prefix)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    paths = sorted(output.glob("page-*.png"))
    if not paths:
        raise RuntimeError("pdftoppm did not render any page")
    return [Image.open(path).convert("RGB") for path in paths]


def write_image_pdf(images: list[Image.Image], target: Path, dpi: int) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    first, *rest = [image.convert("RGB") for image in images]
    first.save(
        target,
        "PDF",
        resolution=float(dpi),
        save_all=True,
        append_images=rest,
    )
    reader = PdfReader(str(target))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.metadata = {}
    sanitized = target.with_suffix(".sanitized.pdf")
    with sanitized.open("wb") as output:
        writer.write(output)
    sanitized.replace(target)
    page_count = len(PdfReader(str(target)).pages)
    if page_count != len(images):
        raise RuntimeError(f"page count mismatch for {target.name}")


def scanned(images: list[Image.Image]) -> list[Image.Image]:
    return [
        ImageEnhance.Contrast(image.filter(ImageFilter.GaussianBlur(0.25))).enhance(
            0.96
        )
        for image in images
    ]


def low_resolution(images: list[Image.Image]) -> list[Image.Image]:
    degraded = []
    for image in images:
        width = max(1, image.width // 2)
        height = max(1, image.height // 2)
        small = image.resize((width, height), Image.Resampling.BILINEAR)
        degraded.append(
            ImageEnhance.Contrast(small.filter(ImageFilter.GaussianBlur(0.55))).enhance(
                0.88
            )
        )
    return degraded


def rotated(images: list[Image.Image]) -> list[Image.Image]:
    return [
        image.rotate(
            1.35 if index % 2 == 0 else -1.35,
            resample=Image.Resampling.BICUBIC,
            expand=True,
            fillcolor="white",
        )
        for index, image in enumerate(images)
    ]


def photographed(images: list[Image.Image]) -> list[Image.Image]:
    output = []
    for image in images:
        bordered = ImageOps.expand(image, border=36, fill="#e8e6e1")
        skewed = bordered.transform(
            bordered.size,
            Image.Transform.AFFINE,
            (1.0, 0.025, -18.0, 0.012, 1.0, -8.0),
            resample=Image.Resampling.BICUBIC,
            fillcolor="#d8d5ce",
        )
        shaded = ImageEnhance.Brightness(skewed).enhance(0.94)
        output.append(shaded.filter(ImageFilter.GaussianBlur(0.18)))
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate scanned, low-resolution, rotated and photographed PDFs."
    )
    parser.add_argument("input_pdf", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("semantic_case_id")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.input_pdf.resolve()
    if not source.is_file() or source.suffix.lower() != ".pdf":
        raise SystemExit("input_pdf must be an existing PDF")
    if not args.semantic_case_id.replace("-", "").isalnum():
        raise SystemExit("semantic_case_id must be canonical")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="tax-corpus-") as temp:
        temp_root = Path(temp)
        high = render_pdf(source, temp_root / "high", 180)
        variants = {
            "scanned": (scanned(high), 180),
            "low-resolution": (low_resolution(high), 90),
            "rotated": (rotated(high), 180),
            "photographed": (photographed(high), 180),
        }
        report = {
            "semanticCaseId": args.semantic_case_id,
            "parentSha256": digest(source),
            "variants": [],
        }
        for suffix, (images, dpi) in variants.items():
            target = args.output_dir / f"{args.semantic_case_id}-{suffix}.pdf"
            write_image_pdf(images, target, dpi)
            report["variants"].append(
                {
                    "visualVariant": suffix,
                    "sha256": digest(target),
                    "pageCount": len(images),
                }
            )
        (args.output_dir / f"{args.semantic_case_id}-visual-variants.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
