from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

import fitz
import numpy as np

ROOT = Path('/mnt/data/tax_profile_corpus_pending29_v1')
corpus_path = ROOT / 'corpus-manifest.json'
corpus = json.loads(corpus_path.read_text(encoding='utf-8'))
errors: list[str] = []
warnings: list[str] = []
results: list[dict] = []

EXPECTED_FAMILIES = 29
EXPECTED_BASES = 116
EXPECTED_TOTAL = 348
EXPECTED_PER_FAMILY = 12
EXPECTED_VISUALS = {'NATIVE_TEXT_PDF', 'RASTER_SCAN_COMPRESSED', 'RASTER_ROTATED_CAPTURE'}
EXPECTED_SCENARIOS = {'habitual', 'negative_zero', 'complex', 'incomplete_ambiguous'}

if corpus.get('families') != EXPECTED_FAMILIES:
    errors.append(f"families={corpus.get('families')} expected {EXPECTED_FAMILIES}")
if corpus.get('semanticBaseFixtures') != EXPECTED_BASES:
    errors.append(f"semanticBaseFixtures={corpus.get('semanticBaseFixtures')} expected {EXPECTED_BASES}")
if corpus.get('totalPdfFixtures') != EXPECTED_TOTAL:
    errors.append(f"totalPdfFixtures={corpus.get('totalPdfFixtures')} expected {EXPECTED_TOTAL}")
if len(corpus.get('fixtures', [])) != EXPECTED_TOTAL:
    errors.append(f"fixture index length={len(corpus.get('fixtures', []))} expected {EXPECTED_TOTAL}")

family_counts = Counter()
scenario_by_family = defaultdict(set)
visuals_by_base = defaultdict(set)
base_nif = {}
manifest_ids = set()

for item in corpus.get('fixtures', []):
    fid = item['fixtureId']
    row = {'fixtureId': fid, 'ok': True, 'errors': [], 'warnings': []}
    pdf = ROOT / item['pdf']
    man_path = ROOT / item['manifest']
    if not pdf.exists():
        row['errors'].append('PDF missing')
    if not man_path.exists():
        row['errors'].append('manifest missing')
    if row['errors']:
        row['ok'] = False
        errors.extend(f'{fid}: {e}' for e in row['errors'])
        results.append(row)
        continue

    man = json.loads(man_path.read_text(encoding='utf-8'))
    manifest_ids.add(man.get('fixtureId'))
    family = man.get('documentType')
    family_counts[family] += 1
    scenario_by_family[family].add(man.get('semanticScenario'))
    visuals_by_base[man.get('baseFixtureId')].add(man.get('visualVariant'))

    if man.get('fixtureId') != fid:
        row['errors'].append('fixtureId mismatch')
    if man.get('synthetic') is not True:
        row['errors'].append('synthetic must be true')
    if man.get('notValidForFiling') is not True:
        row['errors'].append('notValidForFiling must be true')
    if man.get('containsRealPersonalData') is not False:
        row['errors'].append('containsRealPersonalData must be false')
    if man.get('semanticScenario') not in EXPECTED_SCENARIOS:
        row['errors'].append('unexpected semanticScenario')
    if man.get('visualVariant') not in EXPECTED_VISUALS:
        row['errors'].append('unexpected visualVariant')
    if not man.get('expectedFields'):
        row['errors'].append('expectedFields missing')
    if not man.get('fieldEvidence'):
        row['errors'].append('fieldEvidence missing')
    if not man.get('mustNotInfer'):
        row['errors'].append('mustNotInfer missing')
    if not man.get('expectedQuestionMappings'):
        row['warnings'].append('expectedQuestionMappings empty')
    if not man.get('sourceTemplate', {}).get('officialSources'):
        row['errors'].append('officialSources missing')
    for url in man.get('sourceTemplate', {}).get('officialSources', []):
        host = urlparse(url).netloc.lower()
        if not (host.endswith('agenciatributaria.gob.es') or host.endswith('seg-social.gob.es')):
            row['errors'].append(f'non-official source host: {host}')
    if man.get('sourceTemplate', {}).get('liveServiceGenerated') is not False:
        row['errors'].append('liveServiceGenerated must be false')
    if man.get('semanticScenario') == 'incomplete_ambiguous':
        if man.get('expectedDisposition') != 'REVIEW_OR_REJECT':
            row['errors'].append('incomplete case must be REVIEW_OR_REJECT')
        if man.get('completeDocument') is not False:
            row['errors'].append('incomplete case must set completeDocument false')
    if man.get('documentType') in {'AEAT_MODEL_720','AEAT_MODEL_721'} and man.get('semanticScenario') == 'negative_zero':
        if man.get('documentKind') != 'SYNTHETIC_EMPTY_DRAFT':
            row['errors'].append('empty 720/721 must be marked as draft')

    sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if sha != man.get('sha256') or sha != item.get('sha256'):
        row['errors'].append('SHA-256 mismatch')
    if pdf.stat().st_size < 1000:
        row['errors'].append('PDF too small')

    try:
        doc = fitz.open(pdf)
        if doc.is_encrypted:
            row['errors'].append('PDF encrypted')
        if doc.page_count != man.get('expectedPages'):
            row['errors'].append(f"page count {doc.page_count} != {man.get('expectedPages')}")
        if doc.page_count < 1:
            row['errors'].append('zero pages')
        page = doc[0]
        pix = page.get_pixmap(matrix=fitz.Matrix(0.45,0.45), alpha=False)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        rgb = arr[:,:,:3]
        nonwhite = float(np.mean(np.any(rgb < 245, axis=2)))
        if nonwhite < 0.015:
            row['errors'].append(f'first page appears blank ({nonwhite:.4f})')
        text = '\n'.join(p.get_text('text') for p in doc)
        image_count = sum(len(p.get_images(full=True)) for p in doc)
        visual = man.get('visualVariant')
        nif = man.get('expectedFields', {}).get('taxpayer.nif')
        if visual == 'NATIVE_TEXT_PDF':
            if len(text.strip()) < 160:
                row['errors'].append('native PDF has too little extractable text')
            if 'FACSIMIL SINTÉTICO' not in text:
                row['errors'].append('native synthetic banner not extractable')
            if 'NO PRESENTABLE' not in text:
                row['errors'].append('native no-presentable marker not extractable')
            if nif and nif not in text:
                row['errors'].append('synthetic NIF not found in native text')
            base = man.get('baseFixtureId')
            if base in base_nif and base_nif[base] != nif:
                row['errors'].append('base NIF inconsistent')
            base_nif[base] = nif
        else:
            if image_count < doc.page_count:
                row['errors'].append('raster variant lacks one image per page')
            if len(text.strip()) > 40:
                row['warnings'].append('raster variant unexpectedly contains text')
        doc.close()
    except Exception as exc:
        row['errors'].append(f'PDF open/render failed: {exc}')

    row['ok'] = not row['errors']
    errors.extend(f'{fid}: {e}' for e in row['errors'])
    warnings.extend(f'{fid}: {w}' for w in row['warnings'])
    results.append(row)

if len(manifest_ids) != EXPECTED_TOTAL:
    errors.append(f'unique manifest ids={len(manifest_ids)} expected {EXPECTED_TOTAL}')
if len(family_counts) != EXPECTED_FAMILIES:
    errors.append(f'unique families={len(family_counts)} expected {EXPECTED_FAMILIES}')
for family, count in sorted(family_counts.items()):
    if count != EXPECTED_PER_FAMILY:
        errors.append(f'{family}: {count} fixtures expected {EXPECTED_PER_FAMILY}')
    if scenario_by_family[family] != EXPECTED_SCENARIOS:
        errors.append(f'{family}: scenarios {sorted(scenario_by_family[family])} expected {sorted(EXPECTED_SCENARIOS)}')
if len(visuals_by_base) != EXPECTED_BASES:
    errors.append(f'unique bases={len(visuals_by_base)} expected {EXPECTED_BASES}')
for base, visuals in visuals_by_base.items():
    if visuals != EXPECTED_VISUALS:
        errors.append(f'{base}: visuals {sorted(visuals)} expected {sorted(EXPECTED_VISUALS)}')

# Verify expected files and QA artefacts.
for required in ['README.md','SOURCE_AND_LIMITATIONS.md','IMPORT_GUIDE_CODEX.md','corpus-inventory.csv','family-coverage.csv','qa/QA_MONTAGE_29_FAMILIES.jpg']:
    if not (ROOT / required).exists():
        errors.append(f'missing required artefact: {required}')

status = 'VALIDATED_SYNTHETIC_CORPUS_EXTENSION' if not errors else 'VALIDATION_FAILED'
corpus['status'] = status
corpus['validation'] = {
    'validatorVersion': '1.0.0',
    'validatedPdfFixtures': sum(1 for r in results if r['ok']),
    'semanticBaseFixtures': len(visuals_by_base),
    'errors': len(errors),
    'warnings': len(warnings),
    'checks': [
        'Counts by family, semantic scenario and visual variant',
        'Manifest structure and official-source domains',
        'SHA-256 and page count',
        'Native text layer and synthetic markers',
        'Raster-only variants and embedded page images',
        'First-page non-blank render check',
        'Incomplete/ambiguous cases require review',
        'Empty 720/721 examples are drafts and cannot prove absence',
    ],
    'limitations': [
        'No PDF was generated or validated by a live AEAT/TGSS service.',
        'Documents are synthetic facsimiles based on official fields, descriptions and record designs.',
        'Real anonymized outputs should later be added as an independent validation layer.',
    ],
}
corpus_path.write_text(json.dumps(corpus, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(ROOT / 'validation-results.json').write_text(json.dumps({'status':status,'errors':errors,'warnings':warnings,'results':results}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

lines = [
    '# Informe de validación del corpus ampliado', '',
    f'**Estado:** `{status}`', '',
    f'- Familias esperadas: {EXPECTED_FAMILIES}',
    f'- Casos semánticos base esperados: {EXPECTED_BASES}',
    f'- PDF totales esperados: {EXPECTED_TOTAL}',
    f'- PDF comprobados: {len(results)}',
    f'- PDF válidos: {sum(1 for r in results if r["ok"])}',
    f'- Errores: {len(errors)}',
    f'- Advertencias: {len(warnings)}', '',
    '## Cobertura', '',
    '- Cuatro casos semánticos por familia: habitual, negativo/cero, complejo e incompleto/ambiguo.',
    '- Tres variantes visuales por caso: nativa, escaneada/comprimida y captura girada.',
    '- Verificación de inferencias prohibidas y tratamiento especial de documentos incompletos.', '',
    '## Comprobaciones ejecutadas', '',
]
for check in corpus['validation']['checks']:
    lines.append(f'- {check}.')
lines += ['', '## Limitaciones', '']
for lim in corpus['validation']['limitations']:
    lines.append(f'- {lim}')
if errors:
    lines += ['', '## Errores', ''] + [f'- {e}' for e in errors]
if warnings:
    lines += ['', '## Advertencias', ''] + [f'- {w}' for w in warnings[:100]]
lines += ['', '## Recuento por familia', ''] + [f'- `{k}`: {family_counts[k]}' for k in sorted(family_counts)]
(ROOT / 'VALIDATION_REPORT.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')

print(status)
print('valid', sum(1 for r in results if r['ok']), 'errors', len(errors), 'warnings', len(warnings))
for e in errors[:50]:
    print('ERROR', e)
for w in warnings[:20]:
    print('WARN', w)
