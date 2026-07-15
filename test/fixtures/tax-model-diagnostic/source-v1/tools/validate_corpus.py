from __future__ import annotations
import csv, hashlib, json, re
from collections import Counter
from pathlib import Path
import fitz

ROOT=Path('/mnt/data/tax_profile_corpus_v1')
corpus=json.loads((ROOT/'corpus-manifest.json').read_text(encoding='utf-8'))
errors=[]; warnings=[]; results=[]
expected_counts={
 'AEAT_MODEL_036':5,
 'AEAT_MODEL_037_HISTORICAL':3,
 'AEAT_MODEL_130':4,
 'AEAT_MODEL_303':5,
 'AEAT_MODEL_390':4,
 'AEAT_MODEL_111':4,
 'AEAT_MODEL_115':4,
 'AEAT_SCREEN_ECONOMIC_ACTIVITIES':4,
 'AEAT_SCREEN_TAX_STATUS':4,
 'AEAT_SCREEN_PERIODIC_OBLIGATIONS':4,
}
if corpus.get('totalFixtures') != 41:
 errors.append(f"corpus-manifest totalFixtures={corpus.get('totalFixtures')} expected 41")
if len(corpus.get('fixtures',[])) != 41:
 errors.append(f"corpus-manifest fixtures={len(corpus.get('fixtures',[]))} expected 41")

types=Counter()
nifs=[]
for item in corpus['fixtures']:
 fid=item['fixtureId']; types[item['documentType']]+=1
 pdf=ROOT/item['pdf']; manp=ROOT/item['manifest']
 row={'fixtureId':fid,'ok':True,'errors':[],'warnings':[]}
 if not pdf.exists(): row['errors'].append('PDF missing')
 if not manp.exists(): row['errors'].append('manifest missing')
 if row['errors']:
  row['ok']=False; errors += [f"{fid}: {x}" for x in row['errors']]; results.append(row); continue
 man=json.loads(manp.read_text(encoding='utf-8'))
 nif=man.get('expectedFields',{}).get('taxpayerNif')
 if nif: nifs.append(nif)
 if man.get('fixtureId')!=fid: row['errors'].append('fixtureId mismatch')
 if man.get('synthetic') is not True: row['errors'].append('synthetic flag missing')
 if man.get('notValidForFiling') is not True: row['errors'].append('notValidForFiling flag missing')
 if man.get('containsRealPersonalData') is not False: row['errors'].append('containsRealPersonalData must be false')
 sha=hashlib.sha256(pdf.read_bytes()).hexdigest()
 if sha!=man.get('sha256') or sha!=item.get('sha256'): row['errors'].append('SHA-256 mismatch')
 try:
  doc=fitz.open(pdf)
  if doc.is_encrypted: row['errors'].append('PDF encrypted')
  if doc.page_count != man.get('expectedPages'): row['errors'].append(f"page count {doc.page_count} != {man.get('expectedPages')}")
  text='\n'.join(page.get_text('text') for page in doc)
  if 'DOCUMENTO SINTÉTICO' not in text: row['errors'].append('watermark/footer synthetic marker not extractable')
  if 'NO PRESENTABLE' not in text: row['errors'].append('NO PRESENTABLE marker not extractable')
  if nif and nif not in text: row['errors'].append(f'NIF {nif} not found in extracted text')
  model_match=re.search(r'AEAT_MODEL_(\d+)',man.get('documentType',''))
  if model_match and model_match.group(1) not in text:
   row['warnings'].append(f"model token {model_match.group(1)} not found in native extracted text; may remain in background image only")
  if len(text.strip())<80: row['errors'].append('too little extractable text')
  doc.close()
 except Exception as exc:
  row['errors'].append(f'PDF open/extract failed: {exc}')
 if not man.get('expectedFields'): row['errors'].append('expectedFields missing')
 if not man.get('mustNotInfer'): row['errors'].append('mustNotInfer missing')
 if not man.get('fieldEvidence'): row['errors'].append('fieldEvidence missing')
 row['ok']=not row['errors']
 errors += [f"{fid}: {x}" for x in row['errors']]
 warnings += [f"{fid}: {x}" for x in row['warnings']]
 results.append(row)

for typ,cnt in expected_counts.items():
 if types[typ]!=cnt: errors.append(f'{typ}: {types[typ]} expected {cnt}')
if set(types)!=set(expected_counts):
 extras=set(types)-set(expected_counts)
 if extras: errors.append(f'Unexpected document types: {sorted(extras)}')
if len(nifs)!=len(set(nifs)): errors.append('Duplicate synthetic NIF values found')

status='VALIDATED_SYNTHETIC_BASE_CORPUS' if not errors else 'VALIDATION_FAILED'
corpus['status']=status
corpus['validation']={
 'validatorVersion':'1.0.0',
 'validatedFixtures':sum(1 for r in results if r['ok']),
 'errors':len(errors),
 'warnings':len(warnings),
 'limitations':[
  'Los formularios no han sido cumplimentados ni validados en los servicios de presentación de la AEAT.',
  'Las pantallas censales son simulaciones funcionales y no capturas oficiales.',
  'Este corpus base prueba clasificación y extracción; las degradaciones OCR deben generarse como una fase separada.',
 ]
}
(ROOT/'corpus-manifest.json').write_text(json.dumps(corpus,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'validation-results.json').write_text(json.dumps({'status':status,'errors':errors,'warnings':warnings,'results':results},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

lines=[
 '# Informe de validación del corpus', '',
 f'**Estado:** `{status}`', '',
 f'- PDF esperados: 41',
 f'- PDF encontrados y comprobados: {len(results)}',
 f'- Fixtures válidos: {sum(1 for r in results if r["ok"])}',
 f'- Errores: {len(errors)}',
 f'- Advertencias: {len(warnings)}', '',
 '## Comprobaciones realizadas', '',
 '- Existencia del PDF y manifiesto correspondiente.',
 '- Apertura del PDF y recuento de páginas.',
 '- Huella SHA-256.',
 '- Marcado sintético y no presentable en texto extraíble.',
 '- Presencia del NIF sintético esperado.',
 '- Estructura mínima del manifiesto.',
 '- Recuento por familia documental.',
 '- Ausencia de NIF sintéticos duplicados.', '',
 '## Limitaciones conocidas', '',
 '- Los formularios no se han enviado ni validado en los servicios oficiales de presentación.',
 '- Las pantallas censales son simulaciones y no capturas oficiales.',
 '- Los PDF base contienen capa de texto nativa. Las variantes escaneadas/OCR deben derivarse posteriormente.',
]
if errors:
 lines += ['', '## Errores', ''] + [f'- {e}' for e in errors]
if warnings:
 lines += ['', '## Advertencias', ''] + [f'- {w}' for w in warnings]
lines += ['', '## Recuento por tipo', ''] + [f'- `{k}`: {types[k]}' for k in sorted(types)]
(ROOT/'VALIDATION_REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(status)
print('valid',sum(1 for r in results if r['ok']),'errors',len(errors),'warnings',len(warnings))
if errors:
 for e in errors[:30]: print('ERROR',e)
if warnings:
 for w in warnings[:20]: print('WARN',w)
