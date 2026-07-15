from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable

from PIL import Image
from reportlab.lib.colors import Color, HexColor, black, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path('/mnt/data/tax_profile_corpus_v1')
PDF_DIR = ROOT / 'pdfs'
MAN_DIR = ROOT / 'manifests'
BG_DIR = ROOT / '_work' / 'backgrounds_jpg'
PDF_DIR.mkdir(parents=True, exist_ok=True)
MAN_DIR.mkdir(parents=True, exist_ok=True)
W, H = A4
SCHEMA_VERSION = '1.0'
GENERATOR_VERSION = 'tax-profile-corpus-generator/1.0.0'

# Clear previous generated outputs, but preserve source/work directories.
for d in (PDF_DIR, MAN_DIR):
    for p in d.iterdir():
        if p.is_file() or p.is_symlink():
            p.unlink()
        elif p.is_dir():
            shutil.rmtree(p)

DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

def valid_nif(number: int) -> str:
    return f'{number:08d}{DNI_LETTERS[number % 23]}'

NIFS = [valid_nif(i) for i in range(41)]
NAMES = [
    'ALBA PRUEBA UNO', 'BRUNO EJEMPLO DOS', 'CARLA FICTICIA TRES',
    'DARIO MUESTRA CUATRO', 'ELENA DEMO CINCO', 'FABIO ENSAYO SEIS',
    'GEMA CASO SIETE', 'HUGO SUPUESTO OCHO', 'INES PRUEBA NUEVE',
    'JORGE EJEMPLO DIEZ', 'KARLA FICTICIA ONCE', 'LEO MUESTRA DOCE',
    'MARTA DEMO TRECE', 'NORA ENSAYO CATORCE', 'OSCAR CASO QUINCE',
    'PAULA SUPUESTO DIECISEIS', 'QUIM PRUEBA DIECISIETE',
    'RAQUEL EJEMPLO DIECIOCHO', 'SERGIO FICTICIO DIECINUEVE',
    'TANIA MUESTRA VEINTE', 'ULISES DEMO VEINTIUNO',
    'VERA ENSAYO VEINTIDOS', 'WALTER CASO VEINTITRES',
    'XENIA SUPUESTO VEINTICUATRO', 'YAGO PRUEBA VEINTICINCO',
    'ZOE EJEMPLO VEINTISEIS', 'ADRIAN FICTICIO VEINTISIETE',
    'BEA MUESTRA VEINTIOCHO', 'CESAR DEMO VEINTINUEVE',
    'DIANA ENSAYO TREINTA', 'ELOY CASO TREINTA Y UNO',
    'FELISA SUPUESTO TREINTA Y DOS', 'GONZALO PRUEBA TREINTA Y TRES',
    'HELENA EJEMPLO TREINTA Y CUATRO', 'IVAN FICTICIO TREINTA Y CINCO',
    'JULIA MUESTRA TREINTA Y SEIS', 'KIKE DEMO TREINTA Y SIETE',
    'LAURA ENSAYO TREINTA Y OCHO', 'MARIO CASO TREINTA Y NUEVE',
    'NURIA SUPUESTO CUARENTA', 'OLGA PRUEBA CUARENTA Y UNO'
]

@dataclass
class Fixture:
    fixture_id: str
    document_type: str
    display_name: str
    fiscal_year: int | None
    period: str | None
    document_kind: str
    expected_pages: int
    source_template: dict[str, Any]
    expected_fields: dict[str, Any]
    expected_question_mappings: dict[str, Any]
    must_not_infer: list[str]
    field_evidence: list[dict[str, Any]]
    notes: list[str]
    build: Callable[[canvas.Canvas, 'Fixture'], None]


def bg(name: str) -> Path:
    p = BG_DIR / name
    if not p.exists():
        raise FileNotFoundError(p)
    return p


def draw_background(c: canvas.Canvas, img_path: Path) -> None:
    c.drawImage(ImageReader(str(img_path)), 0, 0, width=W, height=H, preserveAspectRatio=False, mask='auto')


def text_top(c: canvas.Canvas, text: Any, x: float, y_top: float, size: float = 7.5,
             font: str = 'Helvetica', max_chars: int | None = None, color=black) -> None:
    if text is None:
        return
    s = str(text)
    if max_chars is not None and len(s) > max_chars:
        s = s[:max_chars]
    c.saveState()
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x * W, H - y_top * H - size * 0.22, s)
    c.restoreState()


def centered_top(c: canvas.Canvas, text: Any, x: float, y_top: float, size: float = 7.5,
                 font: str = 'Helvetica-Bold', color=black) -> None:
    c.saveState()
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawCentredString(x * W, H - y_top * H - size * 0.22, str(text))
    c.restoreState()


def fill_text_top(c: canvas.Canvas, text: Any, x: float, y_top: float,
                  width: float, height: float = 0.016, size: float = 7.2,
                  font: str = 'Helvetica') -> None:
    # Keep the official labels and borders visible; only add a native text layer.
    text_top(c, text, x + 0.002, y_top + 0.001, size=size, font=font)


def mark_top(c: canvas.Canvas, x: float, y_top: float, size: float = 9.5, char: str = 'X') -> None:
    centered_top(c, char, x, y_top, size=size, font='Helvetica-Bold')


def add_watermark(c: canvas.Canvas, fixture_id: str, page_no: int) -> None:
    c.saveState()
    try:
        c.setFillAlpha(0.14)
    except Exception:
        pass
    c.setFillColor(HexColor('#C62828'))
    c.translate(W / 2, H / 2)
    c.rotate(33)
    c.setFont('Helvetica-Bold', 26)
    c.drawCentredString(0, 0, 'DOCUMENTO SINTÉTICO · SIN VALIDEZ')
    c.restoreState()
    c.saveState()
    c.setFillColor(HexColor('#9B1C1C'))
    c.setFont('Helvetica-Bold', 6.3)
    c.drawString(14, 8, f'FIXTURE {fixture_id} · página {page_no} · NO PRESENTABLE · datos totalmente sintéticos')
    c.restoreState()


def finish_page(c: canvas.Canvas, f: Fixture, page_no: int) -> None:
    add_watermark(c, f.fixture_id, page_no)
    c.showPage()


def page_with_bg(c: canvas.Canvas, f: Fixture, page_no: int, background: Path,
                 overlay: Callable[[canvas.Canvas], None] | None = None) -> None:
    draw_background(c, background)
    if overlay:
        overlay(c)
    finish_page(c, f, page_no)


def header_fields(c: canvas.Canvas, nif: str, name: str, y: float = 0.018) -> None:
    fill_text_top(c, nif, 0.108, y, 0.18, 0.017, 7.0)
    fill_text_top(c, name, 0.305, y, 0.55, 0.017, 6.6)


def build_036(c: canvas.Canvas, f: Fixture) -> None:
    d = f.expected_fields
    nif, name = d['taxpayerNif'], d['taxpayerName']
    bgs = [bg(f'model036_page_{i}.jpg') for i in range(13, 25)]

    def p1(cv: canvas.Canvas) -> None:
        fill_text_top(cv, nif, 0.055, 0.124, 0.21, 0.019, 7.5)
        parts = name.split(' ', 1)
        fill_text_top(cv, parts[1] if len(parts)>1 else 'PRUEBA', 0.055, 0.151, 0.29, 0.019, 7.3)
        fill_text_top(cv, parts[0], 0.388, 0.151, 0.21, 0.019, 7.3)
        cause = d['cause']
        if cause == 'ALTA':
            mark_top(cv, 0.057, 0.239)
        elif cause == 'BAJA':
            mark_top(cv, 0.057, 0.835)
            fill_text_top(cv, d.get('cessationReason','CESE DE ACTIVIDAD'), 0.548, 0.835, 0.38, 0.018, 6.7)
            fill_text_top(cv, d.get('effectiveDate','31/12/2026'), 0.693, 0.862, 0.13, 0.018, 7.0)
        else:
            mapping = {
                'ACTIVITY_CHANGE': (0.057, 0.454),
                'ROI_REGISTRATION': (0.057, 0.507),
                'WITHHOLDINGS_CHANGE': (0.057, 0.665),
                'PARTIAL_CESSATION': (0.057, 0.454),
            }
            mark_top(cv, *mapping.get(d.get('modificationType'), (0.045, 0.462)))
            if d.get('modificationType') == 'WITHHOLDINGS_CHANGE':
                mark_top(cv, 0.057, 0.665)
            if d.get('modificationType') == 'ROI_REGISTRATION':
                mark_top(cv, 0.057, 0.507)
        fill_text_top(cv, 'MADRID', 0.025, 0.907, 0.36, 0.019, 7.0)
        fill_text_top(cv, d.get('filingDate','15/01/2026'), 0.025, 0.938, 0.36, 0.019, 7.0)
        fill_text_top(cv, name, 0.51, 0.956, 0.42, 0.018, 7.0)

    def generic_header(cv: canvas.Canvas) -> None:
        header_fields(cv, nif, name, 0.017)

    def p4(cv: canvas.Canvas) -> None:
        generic_header(cv)
        act = d['activities'][0]
        fill_text_top(cv, act['description'], 0.025, 0.104, 0.42, 0.018, 6.8)
        fill_text_top(cv, act['epigraph'], 0.493, 0.104, 0.13, 0.018, 7.0)
        fill_text_top(cv, act.get('activityType','PROFESIONAL'), 0.664, 0.104, 0.19, 0.018, 6.7)
        fill_text_top(cv, act.get('activityCode',''), 0.887, 0.104, 0.08, 0.018, 6.7)
        if act.get('premises'):
            mark_top(cv, 0.236, 0.391)
            fill_text_top(cv, act['premises'].get('street','CALLE PRUEBA'), 0.095, 0.306, 0.57, 0.017, 6.8)
            fill_text_top(cv, act['premises'].get('number','10'), 0.706, 0.306, 0.06, 0.017, 6.8)
            fill_text_top(cv, act['premises'].get('postalCode','28080'), 0.904, 0.306, 0.08, 0.017, 6.8)
            fill_text_top(cv, act['premises'].get('municipality','MADRID'), 0.025, 0.334, 0.28, 0.017, 6.8)
            fill_text_top(cv, act['premises'].get('province','MADRID'), 0.411, 0.334, 0.26, 0.017, 6.8)
            fill_text_top(cv, act['premises'].get('surface','45'), 0.025, 0.366, 0.13, 0.017, 6.8)
            fill_text_top(cv, act.get('effectiveDate','01/02/2026'), 0.379, 0.391, 0.12, 0.017, 6.8)
        else:
            mark_top(cv, 0.189, 0.176)
            fill_text_top(cv, act.get('effectiveDate','01/01/2026'), 0.371, 0.176, 0.14, 0.017, 6.8)
            fill_text_top(cv, act.get('municipality','MADRID'), 0.025, 0.230, 0.33, 0.017, 6.8)
            fill_text_top(cv, act.get('province','MADRID'), 0.506, 0.230, 0.34, 0.017, 6.8)
        if len(d.get('activities',[])) > 1:
            act2 = d['activities'][1]
            # Insert second activity visibly in the lower local block as a multi-activity test token.
            fill_text_top(cv, f"SEGUNDA ACTIVIDAD: {act2['description']} · IAE {act2['epigraph']}", 0.34, 0.468, 0.58, 0.018, 6.5)

    def p5(cv: canvas.Canvas) -> None:
        generic_header(cv)
        vat = d.get('vat',{})
        if vat.get('taxableInSpain', True):
            mark_top(cv, 0.788, 0.169)
        if vat.get('exclusivelyExempt'):
            mark_top(cv, 0.789, 0.196)
        regimes = vat.get('regimes',[])
        if 'GENERAL' in regimes:
            mark_top(cv, 0.062, 0.371)
            fill_text_top(cv, d['activities'][0]['epigraph'], 0.742, 0.368, 0.10, 0.016, 6.6)
            fill_text_top(cv, vat.get('effectiveDate','01/01/2026'), 0.875, 0.368, 0.10, 0.016, 6.5)
        if 'RECHARGE_EQUIVALENCE' in regimes:
            mark_top(cv, 0.062, 0.400)
            fill_text_top(cv, d['activities'][0]['epigraph'], 0.742, 0.397, 0.10, 0.016, 6.6)
        if vat.get('roi') == 'ALTA':
            mark_top(cv, 0.660, 0.778)
            fill_text_top(cv, vat.get('roiEffectiveDate','01/03/2026'), 0.872, 0.778, 0.10, 0.016, 6.5)
        if vat.get('roi') == 'BAJA':
            mark_top(cv, 0.759, 0.778)
        if vat.get('redeme'):
            mark_top(cv, 0.660, 0.756)
        if vat.get('sii'):
            mark_top(cv, 0.656, 0.936)

    def p6(cv: canvas.Canvas) -> None:
        generic_header(cv)
        irpf = d.get('irpf',{})
        if irpf.get('paymentsModel') == '130':
            mark_top(cv, 0.791, 0.137)
        elif irpf.get('paymentsModel') == '131':
            mark_top(cv, 0.791, 0.164)
        method = irpf.get('method')
        if method == 'DIRECT_SIMPLIFIED':
            mark_top(cv, 0.333, 0.244)
        elif method == 'DIRECT_NORMAL':
            mark_top(cv, 0.333, 0.218)
        elif method == 'OBJECTIVE':
            mark_top(cv, 0.333, 0.193)
        fill_text_top(cv, irpf.get('effectiveDate','01/01/2026'), 0.876, 0.136, 0.10, 0.016, 6.5)

    def p7(cv: canvas.Canvas) -> None:
        generic_header(cv)
        wh = d.get('withholdings',{})
        # Current 036 page 7: visually annotate the canonical obligation values in blank areas.
        if wh:
            fill_text_top(cv, f"RETENCIONES: 111={wh.get('model111','NO')} · 115={wh.get('model115','NO')} · 123={wh.get('model123','NO')}", 0.10, 0.145, 0.75, 0.020, 8.0, 'Helvetica-Bold')
            fill_text_top(cv, f"FECHA EFECTO: {wh.get('effectiveDate','01/02/2026')}", 0.62, 0.19, 0.26, 0.018, 7.0)

    overlays = {1:p1, 6:p4, 7:p5, 8:p6, 9:p7}
    for idx, b in enumerate(bgs, start=1):
        page_with_bg(c, f, idx, b, overlays.get(idx, generic_header if idx>1 else None))


def build_037(c: canvas.Canvas, f: Fixture) -> None:
    d=f.expected_fields; nif=d['taxpayerNif']; name=d['taxpayerName']
    bgs=[bg(f'm037_p{i}.jpg') for i in range(1,5)]
    def p1(cv):
        fill_text_top(cv,nif,0.183,0.275,0.16,0.016,7)
        parts=name.split(' ',1)
        fill_text_top(cv,parts[1] if len(parts)>1 else 'PRUEBA',0.183,0.294,0.21,0.016,6.7)
        fill_text_top(cv,parts[0],0.410,0.294,0.13,0.016,6.7)
        if d['cause']=='ALTA': mark_top(cv,0.201,0.346)
        elif d['cause']=='BAJA':
            mark_top(cv,0.201,0.500)
            fill_text_top(cv,'CESE TOTAL',0.525,0.503,0.25,0.016,6.7)
            fill_text_top(cv,d.get('effectiveDate','31/12/2024'),0.615,0.521,0.14,0.016,6.7)
        else:
            # IRPF/IVA/retentions modification indicators.
            for y in d.get('modificationY',[0.435]): mark_top(cv,0.201,y)
        fill_text_top(cv,nif,0.178,0.566,0.12,0.016,6.7)
        fill_text_top(cv,name,0.300,0.566,0.38,0.016,6.7)
        fill_text_top(cv,'CALLE SINTETICA',0.182,0.719,0.30,0.016,6.4)
        fill_text_top(cv,'MADRID',0.183,0.756,0.23,0.016,6.4)
        fill_text_top(cv,'MADRID',0.505,0.756,0.20,0.016,6.4)
        fill_text_top(cv,'28080',0.183,0.774,0.10,0.016,6.4)
    def p2(cv):
        fill_text_top(cv,nif,0.212,0.140,0.13,0.015,6.6)
        fill_text_top(cv,name,0.360,0.140,0.41,0.015,6.5)
        if d.get('irpfMethod')=='DIRECT_SIMPLIFIED':
            mark_top(cv,0.382,0.286); mark_top(cv,0.728,0.218)
        if d.get('irpfMethod')=='OBJECTIVE':
            mark_top(cv,0.382,0.258); mark_top(cv,0.728,0.218)
        if d.get('vatRegime')=='GENERAL':
            mark_top(cv,0.163,0.560); fill_text_top(cv,d.get('epigraph','763'),0.690,0.557,0.08,0.015,6.4)
        if d.get('vatRegime')=='RECHARGE_EQUIVALENCE':
            mark_top(cv,0.163,0.582); fill_text_top(cv,d.get('epigraph','653.2'),0.690,0.579,0.08,0.015,6.4)
    def p3(cv):
        fill_text_top(cv,nif,0.181,0.142,0.13,0.015,6.6)
        fill_text_top(cv,name,0.345,0.142,0.43,0.015,6.5)
        if d.get('model111')=='ALTA': mark_top(cv,0.758,0.238)
        if d.get('model115')=='ALTA': mark_top(cv,0.758,0.285)
        fill_text_top(cv,d.get('activityDescription','SERVICIOS DE CONSULTORIA'),0.089,0.366,0.39,0.016,6.5)
        fill_text_top(cv,d.get('epigraph','763'),0.503,0.366,0.12,0.016,6.5)
        fill_text_top(cv,d.get('activityType','PROFESIONAL'),0.650,0.366,0.18,0.016,6.5)
        mark_top(cv,0.267,0.425)
        fill_text_top(cv,d.get('effectiveDate','01/01/2024'),0.443,0.424,0.10,0.015,6.3)
        fill_text_top(cv,'MADRID',0.089,0.476,0.30,0.015,6.5)
    overlays=[p1,p2,p3,None]
    for i,b in enumerate(bgs,1): page_with_bg(c,f,i,b,overlays[i-1])


def build_130(c: canvas.Canvas, f: Fixture) -> None:
    d=f.expected_fields
    def ov(cv):
        fill_text_top(cv,d['taxpayerNif'],0.162,0.248,0.18,0.018,7.0)
        # Form splits name/apellidos; use concise synthetic values.
        fill_text_top(cv,d['taxpayerName'].split()[0],0.162,0.284,0.18,0.018,7.0)
        fill_text_top(cv,' '.join(d['taxpayerName'].split()[1:]),0.162,0.318,0.38,0.018,7.0)
        fill_text_top(cv,d['fiscalYear'],0.690,0.248,0.08,0.018,7.2)
        fill_text_top(cv,d['period'],0.845,0.248,0.05,0.018,7.2)
        cell_x=0.752
        ys=[0.370,0.382,0.394,0.406,0.429,0.452,0.476]
        vals=[d['income'],d['expenses'],d['netIncome'],d['twentyPercent'],d.get('priorPayments','0,00'),d.get('withholdings','0,00'),d['quarterPayment']]
        for y,v in zip(ys,vals): fill_text_top(cv,v,cell_x,y,0.13,0.016,6.7)
        # Final result cells
        fill_text_top(cv,d.get('totalBeforeAdjustments',d['quarterPayment']),0.752,0.576,0.13,0.016,6.7)
        fill_text_top(cv,d['result'],0.752,0.697,0.13,0.016,7.0,'Helvetica-Bold')
        if d.get('negative'):
            mark_top(cv,0.222,0.833)
        if d.get('complementary'):
            mark_top(cv,0.588,0.803)
            fill_text_top(cv,d.get('previousReceipt','1302026SYN00001'),0.679,0.839,0.20,0.016,6.5)
    page_with_bg(c,f,1,bg('m130_p1.jpg'),ov)


def build_303(c: canvas.Canvas, f: Fixture) -> None:
    d=f.expected_fields; nif=d['taxpayerNif']; name=d['taxpayerName']
    bgs=[bg(f'm303_p{i}.jpg') for i in range(1,7)]
    def p1(cv):
        fill_text_top(cv,nif,0.176,0.316,0.13,0.015,6.6)
        fill_text_top(cv,name,0.311,0.316,0.50,0.015,6.5)
        fill_text_top(cv,d['fiscalYear'],0.701,0.286,0.07,0.015,6.8)
        fill_text_top(cv,d['period'],0.812,0.286,0.04,0.015,6.8)
        if d.get('redeme'): mark_top(cv,0.505,0.367)
        if d.get('sii'): mark_top(cv,0.839,0.367)
        # General VAT lines on page 1.
        rg=d.get('general',{})
        if rg:
            fill_text_top(cv,rg.get('base21','0,00'),0.514,0.573,0.12,0.014,6.3)
            fill_text_top(cv,'21',0.655,0.573,0.04,0.014,6.3)
            fill_text_top(cv,rg.get('outputVat21','0,00'),0.720,0.573,0.12,0.014,6.3)
            fill_text_top(cv,rg.get('intraBase','0,00'),0.514,0.632,0.12,0.014,6.3)
            fill_text_top(cv,rg.get('intraVat','0,00'),0.720,0.632,0.12,0.014,6.3)
            fill_text_top(cv,rg.get('reverseBase','0,00'),0.514,0.651,0.12,0.014,6.3)
            fill_text_top(cv,rg.get('reverseVat','0,00'),0.720,0.651,0.12,0.014,6.3)
            fill_text_top(cv,rg.get('deductible','0,00'),0.720,0.835,0.12,0.014,6.3)
            fill_text_top(cv,rg.get('generalResult','0,00'),0.720,0.906,0.12,0.014,6.3)
    def header(cv):
        fill_text_top(cv,nif,0.188,0.145,0.15,0.014,6.5)
        fill_text_top(cv,name,0.366,0.145,0.41,0.014,6.4)
    def p3(cv):
        header(cv)
        info=d.get('additionalInfo',{})
        fill_text_top(cv,info.get('intraDeliveries','0,00'),0.744,0.199,0.12,0.014,6.3)
        fill_text_top(cv,info.get('exports','0,00'),0.744,0.217,0.12,0.014,6.3)
        fill_text_top(cv,info.get('nonLocated','0,00'),0.744,0.235,0.12,0.014,6.3)
        fill_text_top(cv,info.get('reverseChargeOps','0,00'),0.744,0.253,0.12,0.014,6.3)
        fill_text_top(cv,d.get('priorCompensation','0,00'),0.744,0.448,0.12,0.014,6.3)
        fill_text_top(cv,d.get('result','0,00'),0.744,0.548,0.12,0.014,7.0,'Helvetica-Bold')
        if d.get('noActivity'): mark_top(cv,0.280,0.704)
        if d.get('rectificative'):
            mark_top(cv,0.248,0.776)
            fill_text_top(cv,d.get('previousReceipt','3032026SYN00001'),0.675,0.799,0.18,0.015,6.5)
    overlays={1:p1,2:header,3:p3,4:header,5:header,6:header}
    for i,b in enumerate(bgs,1): page_with_bg(c,f,i,b,overlays[i])


def build_390(c: canvas.Canvas, f: Fixture) -> None:
    d=f.expected_fields; nif=d['taxpayerNif']; name=d['taxpayerName']
    bgs=[bg(f'm390_p{i}.jpg') for i in range(1,10)]
    def p1(cv):
        fill_text_top(cv,nif,0.176,0.352,0.13,0.015,6.6)
        fill_text_top(cv,name,0.176,0.377,0.62,0.015,6.5)
        fill_text_top(cv,d['fiscalYear'],0.552,0.300,0.07,0.015,6.7)
        if d.get('redeme'): mark_top(cv,0.490,0.390)
        if d.get('cashAccounting'): mark_top(cv,0.585,0.446)
        acts=d['activities']
        fill_text_top(cv,acts[0]['description'],0.176,0.530,0.52,0.015,6.5)
        fill_text_top(cv,acts[0].get('activityCode','A01'),0.733,0.530,0.05,0.015,6.3)
        fill_text_top(cv,acts[0]['epigraph'],0.790,0.530,0.06,0.015,6.3)
        for j,act in enumerate(acts[1:4], start=1):
            y=0.553+j*0.020
            fill_text_top(cv,act['description'],0.176,y,0.52,0.014,6.2)
            fill_text_top(cv,act.get('activityCode',f'A{j+1:02d}'),0.733,y,0.05,0.014,6.1)
            fill_text_top(cv,act['epigraph'],0.790,y,0.06,0.014,6.1)
    def header(cv):
        fill_text_top(cv,nif,0.205,0.142,0.13,0.014,6.5)
        fill_text_top(cv,name,0.357,0.142,0.42,0.014,6.4)
    def p2(cv):
        header(cv)
        fill_text_top(cv,d.get('outputBase','0,00'),0.520,0.300,0.12,0.014,6.3)
        fill_text_top(cv,d.get('outputVat','0,00'),0.742,0.300,0.12,0.014,6.3)
    def p6(cv):
        header(cv)
        fill_text_top(cv,d.get('intraDeliveries','0,00'),0.745,0.360,0.12,0.014,6.3)
        fill_text_top(cv,d.get('exports','0,00'),0.745,0.385,0.12,0.014,6.3)
    def p7(cv):
        header(cv)
        fill_text_top(cv,d.get('annualTurnover','0,00'),0.735,0.350,0.13,0.015,6.5)
    def p8(cv):
        header(cv)
        if d.get('prorata'):
            fill_text_top(cv,d['prorata'].get('percentage','75'),0.680,0.430,0.08,0.015,6.5)
            fill_text_top(cv,d['prorata'].get('sector','SECTOR 1'),0.200,0.430,0.35,0.015,6.4)
    overlays={1:p1,2:p2,3:header,4:header,5:header,6:p6,7:p7,8:p8,9:header}
    for i,b in enumerate(bgs,1): page_with_bg(c,f,i,b,overlays[i])


def build_111(c: canvas.Canvas, f: Fixture) -> None:
    d=f.expected_fields
    def ov(cv):
        fill_text_top(cv,d['fiscalYear'],0.723,0.130,0.075,0.017,7)
        fill_text_top(cv,d['period'],0.917,0.130,0.04,0.017,7)
        fill_text_top(cv,d['taxpayerNif'],0.059,0.240,0.18,0.017,7)
        fill_text_top(cv,d['taxpayerName'],0.254,0.240,0.67,0.017,6.8)
        rows=[
            (0.307,d.get('workRecipients','0'),d.get('workIncome','0,00'),d.get('workWithholdings','0,00')),
            (0.374,d.get('professionalRecipients','0'),d.get('professionalIncome','0,00'),d.get('professionalWithholdings','0,00')),
        ]
        for y,a,bv,cvv in rows:
            fill_text_top(cv,a,0.455,y,0.09,0.016,6.6)
            fill_text_top(cv,bv,0.620,y,0.14,0.016,6.6)
            fill_text_top(cv,cvv,0.825,y,0.14,0.016,6.6)
        fill_text_top(cv,d.get('totalWithholdings','0,00'),0.826,0.677,0.14,0.016,7,'Helvetica-Bold')
        fill_text_top(cv,d.get('result','0,00'),0.826,0.735,0.14,0.016,7,'Helvetica-Bold')
        if d.get('negative'): mark_top(cv,0.685,0.790)
        if d.get('complementary'):
            mark_top(cv,0.686,0.893)
            fill_text_top(cv,d.get('previousReceipt','1112026SYN00001'),0.756,0.958,0.19,0.016,6.4)
    page_with_bg(c,f,1,bg('model111.jpg'),ov)


def build_115(c: canvas.Canvas, f: Fixture) -> None:
    d=f.expected_fields
    def ov(cv):
        fill_text_top(cv,d['fiscalYear'],0.722,0.232,0.08,0.016,7)
        fill_text_top(cv,d['period'],0.925,0.232,0.05,0.016,7)
        fill_text_top(cv,d['taxpayerNif'],0.105,0.323,0.22,0.017,7)
        fill_text_top(cv,d['taxpayerName'],0.362,0.323,0.58,0.017,6.8)
        fill_text_top(cv,'CALLE SINTETICA 10',0.198,0.354,0.40,0.016,6.5)
        fill_text_top(cv,'MADRID',0.105,0.380,0.28,0.016,6.5)
        fill_text_top(cv,'MADRID',0.547,0.380,0.25,0.016,6.5)
        fill_text_top(cv,'28080',0.875,0.380,0.09,0.016,6.5)
        vals=[d['recipients'],d['base'],d['withholdings'],d.get('priorResult','0,00'),d['result']]
        ys=[0.456,0.482,0.507,0.532,0.558]
        for y,v in zip(ys,vals): fill_text_top(cv,v,0.756,y,0.19,0.016,6.8)
        if d.get('complementary'):
            mark_top(cv,0.207,0.648)
            fill_text_top(cv,d.get('previousReceipt','1152026SYN00001'),0.230,0.700,0.24,0.016,6.4)
    page_with_bg(c,f,1,bg('m115_p1.jpg'),ov)


def draw_portal_header(c: canvas.Canvas, title: str, subtitle: str, partial: bool=False) -> None:
    c.setFillColor(HexColor('#F4F5F7')); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(HexColor('#FFFFFF')); c.rect(0,H-78,W,78,fill=1,stroke=0)
    c.setFillColor(HexColor('#1B5E75')); c.rect(0,H-82,W,4,fill=1,stroke=0)
    c.setFillColor(HexColor('#163A4A')); c.setFont('Helvetica-Bold',18); c.drawString(30,H-42,'Agencia Tributaria')
    c.setFillColor(HexColor('#5B6670')); c.setFont('Helvetica',7.5); c.drawString(31,H-58,'SIMULACIÓN LOCAL DEL ÁREA PERSONAL · NO EMITIDA POR LA AEAT')
    c.setFillColor(HexColor('#172B4D')); c.setFont('Helvetica-Bold',17); c.drawString(40,H-120,title)
    c.setFillColor(HexColor('#5B6670')); c.setFont('Helvetica',9); c.drawString(40,H-140,subtitle)
    if partial:
        c.setFillColor(HexColor('#FFE0B2')); c.roundRect(W-180,H-142,140,26,6,fill=1,stroke=0)
        c.setFillColor(HexColor('#8A4B08')); c.setFont('Helvetica-Bold',9); c.drawCentredString(W-110,H-133,'CAPTURA PARCIAL')


def draw_card(c: canvas.Canvas, x: float, y: float, w: float, h: float, title: str) -> None:
    c.setFillColor(white); c.setStrokeColor(HexColor('#D8DEE5')); c.roundRect(x,y,w,h,7,fill=1,stroke=1)
    c.setFillColor(HexColor('#163A4A')); c.setFont('Helvetica-Bold',10); c.drawString(x+14,y+h-24,title)


def build_screen(c: canvas.Canvas, f: Fixture) -> None:
    d=f.expected_fields; st=d['screenType']; partial=d.get('partialCapture',False)
    title_map={
        'ACTIVITIES':'Mis actividades económicas',
        'TAX_STATUS':'Mi situación tributaria',
        'OBLIGATIONS':'Mis obligaciones tributarias',
    }
    subtitle_map={
        'ACTIVITIES':'Consulta de actividades y locales comunicados en el censo.',
        'TAX_STATUS':'Resumen de la situación tributaria vigente a la fecha indicada.',
        'OBLIGATIONS':'Relación de obligaciones periódicas, periodicidad y estado.',
    }
    draw_portal_header(c,title_map[st],subtitle_map[st],partial)
    c.setFillColor(HexColor('#455A64')); c.setFont('Helvetica',8)
    c.drawRightString(W-40,H-170,f"NIF {d['taxpayerNif']} · consulta {d['consultationDate']}")
    if st=='ACTIVITIES':
        y=H-220
        acts=d['activities']
        for idx,a in enumerate(acts):
            h=110
            draw_card(c,40,y-h,W-80,h,f"Actividad {idx+1} · {a['status']}")
            c.setFillColor(HexColor('#263238')); c.setFont('Helvetica-Bold',9)
            c.drawString(55,y-48,a['description'])
            c.setFont('Helvetica',8); c.setFillColor(HexColor('#5F6B75'))
            c.drawString(55,y-66,f"Epígrafe IAE: {a['epigraph']} · Inicio: {a['startDate']}" + (f" · Baja: {a['endDate']}" if a.get('endDate') else ''))
            c.drawString(55,y-82,f"Lugar: {a.get('place','Fuera de local determinado')}" )
            if a.get('premises'):
                c.drawString(55,y-96,f"Local: {a['premises']}")
            y-=h+18
        if partial:
            c.setFillColor(HexColor('#FDECEC')); c.roundRect(40,70,W-80,52,6,fill=1,stroke=0)
            c.setFillColor(HexColor('#8B1E1E')); c.setFont('Helvetica-Bold',8.5); c.drawString(55,100,'La imagen no acredita que esta sea la lista completa.')
            c.setFont('Helvetica',8); c.drawString(55,84,'El desplazamiento y el total de elementos no están visibles en esta captura sintética.')
    elif st=='TAX_STATUS':
        sections=[
            ('Impuesto sobre la Renta',d['irpf']),
            ('Impuesto sobre el Valor Añadido',d['vat']),
            ('Registros y opciones',d['registries']),
        ]
        y=H-220
        for title, rows in sections:
            h=82+18*len(rows)
            draw_card(c,40,y-h,W-80,h,title)
            yy=y-48
            for k,v in rows.items():
                c.setFillColor(HexColor('#5F6B75')); c.setFont('Helvetica',8); c.drawString(55,yy,k)
                c.setFillColor(HexColor('#263238')); c.setFont('Helvetica-Bold',8); c.drawRightString(W-58,yy,str(v))
                yy-=18
            y-=h+18
    else:
        obs=d['obligations']; y=H-220
        draw_card(c,40,145,W-80,y-145,'Obligaciones vigentes e históricas')
        headers=['Modelo','Descripción','Periodicidad','Estado','Alta','Baja']
        xs=[55,110,310,400,455,515]
        c.setFillColor(HexColor('#E9EEF2')); c.rect(52,y-52,W-104,24,fill=1,stroke=0)
        c.setFillColor(HexColor('#263238')); c.setFont('Helvetica-Bold',7.8)
        for x,hdr in zip(xs,headers): c.drawString(x,y-44,hdr)
        yy=y-76
        for row in obs:
            c.setFillColor(white if int((y-yy)/28)%2==0 else HexColor('#FAFBFC')); c.rect(52,yy-10,W-104,26,fill=1,stroke=0)
            vals=[row['model'],row['description'],row['periodicity'],row['status'],row['startDate'],row.get('endDate','—')]
            c.setFillColor(HexColor('#263238')); c.setFont('Helvetica',7.2)
            for x,v in zip(xs,vals): c.drawString(x,yy,str(v)[:30])
            yy-=28
    finish_page(c,f,1)


def write_pdf(f: Fixture) -> Path:
    path=PDF_DIR/f'{f.fixture_id}.pdf'
    c=canvas.Canvas(str(path),pagesize=A4,pageCompression=1)
    c.setTitle(f.display_name)
    c.setAuthor('OpenAI · corpus sintético para pruebas')
    c.setSubject('Fixture documental no válido para presentación')
    c.setKeywords('sintético, fixture, OCR, AEAT, no válido')
    f.build(c,f)
    c.save()
    return path


def write_manifest(f: Fixture, pdf_path: Path) -> Path:
    digest=hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    manifest={
        'schemaVersion':SCHEMA_VERSION,
        'generatorVersion':GENERATOR_VERSION,
        'fixtureId':f.fixture_id,
        'documentType':f.document_type,
        'displayName':f.display_name,
        'synthetic':True,
        'notValidForFiling':True,
        'containsRealPersonalData':False,
        'documentKind':f.document_kind,
        'fiscalYear':f.fiscal_year,
        'period':f.period,
        'expectedPages':f.expected_pages,
        'visualVariant':'NATIVE_PDF_WITH_SYNTHETIC_TEXT_LAYER',
        'sourceTemplate':f.source_template,
        'expectedFields':f.expected_fields,
        'expectedQuestionMappings':f.expected_question_mappings,
        'mustNotInfer':f.must_not_infer,
        'fieldEvidence':f.field_evidence,
        'notes':f.notes,
        'pdfFile':pdf_path.name,
        'sha256':digest,
    }
    path=MAN_DIR/f'{f.fixture_id}.json'
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2,sort_keys=False)+'\n',encoding='utf-8')
    return path


def base_evidence(nif: str, name: str, model: str|None, year: int|None, period: str|None) -> list[dict[str,Any]]:
    ev=[
        {'fieldId':'taxpayer.nif','page':1,'label':'NIF','value':nif},
        {'fieldId':'taxpayer.name','page':1,'label':'Apellidos y nombre / Razón social','value':name},
    ]
    if model: ev.append({'fieldId':'document.model','page':1,'label':'Modelo','value':model})
    if year: ev.append({'fieldId':'document.fiscalYear','page':1,'label':'Ejercicio','value':year})
    if period: ev.append({'fieldId':'document.period','page':1,'label':'Periodo','value':period})
    return ev

fixtures: list[Fixture]=[]
idx=0

def person() -> tuple[str,str]:
    global idx
    v=(NIFS[idx],NAMES[idx]); idx+=1; return v

# 036 variants
source036={'authority':'AEAT/BOE','reference':'Modelo 036 vigente, ejemplar para el interesado','templateStatus':'official-layout','validationStatus':'not server-validated'}
variants036=[
    ('m036_alta_persona_fisica_01','Alta inicial: profesional, estimación directa simplificada e IVA general',{
        'cause':'ALTA','modificationType':None,'activities':[{'description':'SERVICIOS DE PROGRAMACION','epigraph':'763','activityType':'PROFESIONAL','activityCode':'J6201','effectiveDate':'01/01/2026','municipality':'MADRID','province':'MADRID'}],
        'irpf':{'method':'DIRECT_SIMPLIFIED','paymentsModel':'130','effectiveDate':'01/01/2026'},
        'vat':{'taxableInSpain':True,'regimes':['GENERAL'],'effectiveDate':'01/01/2026','roi':'NO','redeme':False,'sii':False},
        'withholdings':{}
    }),
    ('m036_modificacion_actividad_local_02','Modificación: segunda actividad y nuevo local',{
        'cause':'MODIFICACION','modificationType':'ACTIVITY_CHANGE','activities':[{'description':'SERVICIOS DE DISENO GRAFICO','epigraph':'399','activityType':'PROFESIONAL','activityCode':'M7410','effectiveDate':'01/01/2025','municipality':'MADRID','province':'MADRID','premises':{'street':'CALLE SINTETICA','number':'10','postalCode':'28080','municipality':'MADRID','province':'MADRID','surface':'45'}},{'description':'FORMACION NO REGLADA','epigraph':'826','activityType':'PROFESIONAL','activityCode':'P8559','effectiveDate':'01/02/2026'}],
        'irpf':{'method':'DIRECT_SIMPLIFIED','paymentsModel':'130','effectiveDate':'01/01/2025'},
        'vat':{'taxableInSpain':True,'regimes':['GENERAL'],'effectiveDate':'01/01/2025','roi':'NO','redeme':False,'sii':False},
        'withholdings':{}
    }),
    ('m036_alta_roi_03','Modificación: alta en Registro de Operadores Intracomunitarios',{
        'cause':'MODIFICACION','modificationType':'ROI_REGISTRATION','activities':[{'description':'CONSULTORIA INFORMATICA','epigraph':'763','activityType':'PROFESIONAL','activityCode':'J6202','effectiveDate':'01/01/2025','municipality':'VALENCIA','province':'VALENCIA'}],
        'irpf':{'method':'DIRECT_SIMPLIFIED','paymentsModel':'130','effectiveDate':'01/01/2025'},
        'vat':{'taxableInSpain':True,'regimes':['GENERAL'],'effectiveDate':'01/01/2025','roi':'ALTA','roiEffectiveDate':'01/03/2026','redeme':False,'sii':False},
        'withholdings':{}
    }),
    ('m036_retenciones_111_115_04','Modificación: alta en retenciones modelos 111 y 115',{
        'cause':'MODIFICACION','modificationType':'WITHHOLDINGS_CHANGE','activities':[{'description':'SERVICIOS DE ARQUITECTURA','epigraph':'411','activityType':'PROFESIONAL','activityCode':'M7111','effectiveDate':'01/01/2024','municipality':'SEVILLA','province':'SEVILLA','premises':{'street':'AVENIDA DEMO','number':'22','postalCode':'41080','municipality':'SEVILLA','province':'SEVILLA','surface':'80'}}],
        'irpf':{'method':'DIRECT_NORMAL','paymentsModel':'130','effectiveDate':'01/01/2024'},
        'vat':{'taxableInSpain':True,'regimes':['GENERAL'],'effectiveDate':'01/01/2024','roi':'NO','redeme':False,'sii':False},
        'withholdings':{'model111':'ALTA','model115':'ALTA','model123':'NO','effectiveDate':'01/02/2026'}
    }),
    ('m036_baja_parcial_compleja_05','Modificación compleja: baja parcial de actividad y local',{
        'cause':'MODIFICACION','modificationType':'PARTIAL_CESSATION','activities':[{'description':'COMERCIO MENOR ARTICULOS HOGAR','epigraph':'653.2','activityType':'EMPRESARIAL','activityCode':'G4759','effectiveDate':'01/01/2023','municipality':'BILBAO','province':'BIZKAIA','premises':{'street':'CALLE EJEMPLO','number':'5','postalCode':'48080','municipality':'BILBAO','province':'BIZKAIA','surface':'70'}},{'description':'VENTA EN LINEA','epigraph':'665','activityType':'EMPRESARIAL','activityCode':'G4791','effectiveDate':'01/06/2024'}],
        'irpf':{'method':'DIRECT_SIMPLIFIED','paymentsModel':'130','effectiveDate':'01/01/2023'},
        'vat':{'taxableInSpain':True,'regimes':['RECHARGE_EQUIVALENCE','GENERAL'],'effectiveDate':'01/01/2023','roi':'BAJA','redeme':False,'sii':False},
        'withholdings':{'model111':'NO','model115':'BAJA','model123':'NO','effectiveDate':'31/03/2026'},
        'cessationReason':'BAJA PARCIAL DE ACTIVIDAD','effectiveDate':'31/03/2026'
    }),
]
for fid,title,extra in variants036:
    nif,name=person(); fields={'taxpayerNif':nif,'taxpayerName':name,'filingDate':'15/01/2026',**extra}
    fixtures.append(Fixture(fid,'AEAT_MODEL_036',title,2026,None,'SYNTHETIC_FILLED_OFFICIAL_LAYOUT',12,source036,fields,
        {'SUBJECT.TAXPAYER_TYPE':'PERSONA_FISICA','CENSUS.CURRENT_STATUS':'PROPOSED_FROM_CENSUS_EVENT','ACTIVITY.LIST':extra['activities'],'IRPF.METHOD':extra['irpf']['method'],'VAT.REGIMES':extra['vat']['regimes']},
        ['CURRENT_CENSUS_STATUS_WITHOUT_RECONCILIATION','FUTURE_OPERATIONS','ACTUAL_FILING_STATUS','VALID_AEAT_SUBMISSION'],
        base_evidence(nif,name,'036',2026,None)+[{'fieldId':'census.cause','page':1,'label':'Causa de presentación','value':extra['cause']},{'fieldId':'activity.list','page':4,'label':'Declaración de actividades económicas y locales','value':extra['activities']},{'fieldId':'irpf.method','page':6,'label':'Método de estimación en el IRPF','value':extra['irpf']['method']},{'fieldId':'vat.regimes','page':5,'label':'Regímenes aplicables','value':extra['vat']['regimes']}],
        ['El 036 representa un evento censal, no una fotografía completa salvo reconciliación con fuentes posteriores.'],build_036))

# 037 historical variants
source037={'authority':'BOE/AEAT','reference':'BOE-A-2023-26632, anexo II, modelo 037','templateStatus':'official-layout','historical':True}
variants037=[
    ('m037_historico_alta_01','037 histórico: alta simplificada',{'cause':'ALTA','irpfMethod':'DIRECT_SIMPLIFIED','vatRegime':'GENERAL','model111':'NO','model115':'NO','activityDescription':'SERVICIOS DE TRADUCCION','epigraph':'774','activityType':'PROFESIONAL','effectiveDate':'01/01/2024'}),
    ('m037_historico_modificacion_02','037 histórico: modificación de IVA y retenciones',{'cause':'MODIFICACION','modificationY':[0.454,0.472],'irpfMethod':'DIRECT_SIMPLIFIED','vatRegime':'GENERAL','model111':'ALTA','model115':'ALTA','activityDescription':'ASESORIA DE EMPRESAS','epigraph':'799','activityType':'PROFESIONAL','effectiveDate':'01/04/2024'}),
    ('m037_historico_baja_03','037 histórico: baja censal',{'cause':'BAJA','irpfMethod':'OBJECTIVE','vatRegime':'RECHARGE_EQUIVALENCE','model111':'NO','model115':'NO','activityDescription':'COMERCIO MENOR TEXTIL','epigraph':'651.2','activityType':'EMPRESARIAL','effectiveDate':'31/12/2024'}),
]
for fid,title,extra in variants037:
    nif,name=person(); fields={'taxpayerNif':nif,'taxpayerName':name,**extra}
    fixtures.append(Fixture(fid,'AEAT_MODEL_037_HISTORICAL',title,2024,None,'HISTORICAL_SYNTHETIC_FILLED_OFFICIAL_LAYOUT',4,source037,fields,
        {'CENSUS.HISTORICAL_EVENT':extra['cause'],'IRPF.METHOD_HISTORICAL':extra['irpfMethod'],'VAT.REGIME_HISTORICAL':extra['vatRegime']},
        ['CURRENT_CENSUS_STATUS','CURRENT_PERIODIC_OBLIGATIONS','VALID_CURRENT_037_FORM','VALID_AEAT_SUBMISSION'],
        base_evidence(nif,name,'037',2024,None)+[{'fieldId':'census.cause','page':1,'label':'Causas de presentación','value':extra['cause']},{'fieldId':'irpf.method','page':2,'label':'Método de estimación en el IRPF','value':extra['irpfMethod']},{'fieldId':'vat.regime','page':2,'label':'Regímenes aplicables','value':extra['vatRegime']},{'fieldId':'activity.description','page':3,'label':'Descripción de la actividad','value':extra['activityDescription']}],
        ['Documento histórico: el modelo 037 quedó suprimido en 2025.'],build_037))

# 130 variants
source130={'authority':'BOE/AEAT','reference':'BOE-A-2015-1656, anexo I, modelo 130','templateStatus':'official-layout'}
variants130=[
    ('m130_positivo_01','130 · resultado positivo a ingresar','1T',{'income':'12.500,00','expenses':'5.000,00','netIncome':'7.500,00','twentyPercent':'1.500,00','priorPayments':'0,00','withholdings':'200,00','quarterPayment':'1.300,00','result':'1.300,00'}),
    ('m130_negativo_02','130 · resultado negativo','2T',{'income':'8.000,00','expenses':'9.250,00','netIncome':'-1.250,00','twentyPercent':'0,00','priorPayments':'0,00','withholdings':'0,00','quarterPayment':'0,00','result':'0,00','negative':True}),
    ('m130_retenciones_03','130 · con retenciones soportadas','3T',{'income':'25.000,00','expenses':'9.000,00','netIncome':'16.000,00','twentyPercent':'3.200,00','priorPayments':'1.300,00','withholdings':'1.750,00','quarterPayment':'150,00','result':'150,00'}),
    ('m130_complementaria_04','130 · declaración complementaria','4T',{'income':'40.000,00','expenses':'15.000,00','netIncome':'25.000,00','twentyPercent':'5.000,00','priorPayments':'3.200,00','withholdings':'900,00','quarterPayment':'900,00','result':'250,00','complementary':True,'previousReceipt':'1302026SYN00004'}),
]
for fid,title,period,extra in variants130:
    nif,name=person(); fields={'taxpayerNif':nif,'taxpayerName':name,'fiscalYear':2026,'period':period,**extra}
    fixtures.append(Fixture(fid,'AEAT_MODEL_130',title,2026,period,'SYNTHETIC_FILLED_OFFICIAL_LAYOUT',1,source130,fields,
        {'IRPF.PRIOR_DIRECT_ESTIMATION_FILING':True,'IRPF.PERIOD':period,'IRPF.DECLARED_WITHHOLDINGS':extra.get('withholdings','0,00')},
        ['CURRENT_MODEL_130_CENSUS','FUTURE_MODEL_130_OBLIGATION','PROFESSIONAL_WITHHOLDING_RATIO','VALID_AEAT_SUBMISSION'],
        base_evidence(nif,name,'130',2026,period)+[{'fieldId':'irpf.income','page':1,'label':'Ingresos computables','value':extra['income']},{'fieldId':'irpf.expenses','page':1,'label':'Gastos fiscalmente deducibles','value':extra['expenses']},{'fieldId':'irpf.withholdings','page':1,'label':'Retenciones e ingresos a cuenta soportados','value':extra.get('withholdings','0,00')},{'fieldId':'filing.result','page':1,'label':'Resultado de la autoliquidación','value':extra['result']}],
        ['El importe de retenciones no permite calcular por sí solo el porcentaje de ingresos sometidos a retención.'],build_130))

# 303 variants
source303={'authority':'BOE/AEAT','reference':'BOE-A-2026-1761, anexo III, modelo 303','templateStatus':'official-layout'}
variants303=[
    ('m303_trimestral_ingresar_01','303 · trimestral a ingresar','1T',{'general':{'base21':'10.000,00','outputVat21':'2.100,00','deductible':'1.250,00','generalResult':'850,00'},'result':'850,00'}),
    ('m303_compensar_02','303 · resultado a compensar','2T',{'general':{'base21':'6.000,00','outputVat21':'1.260,00','deductible':'1.900,00','generalResult':'-640,00'},'result':'-640,00','priorCompensation':'0,00'}),
    ('m303_sin_actividad_03','303 · sin actividad','3T',{'general':{'base21':'0,00','outputVat21':'0,00','deductible':'0,00','generalResult':'0,00'},'result':'0,00','noActivity':True}),
    ('m303_intracomunitaria_04','303 · adquisición intracomunitaria e inversión del sujeto pasivo','4T',{'general':{'base21':'18.000,00','outputVat21':'3.780,00','intraBase':'2.500,00','intraVat':'525,00','reverseBase':'1.000,00','reverseVat':'210,00','deductible':'3.100,00','generalResult':'1.415,00'},'additionalInfo':{'intraDeliveries':'0,00','exports':'0,00','nonLocated':'0,00','reverseChargeOps':'1.000,00'},'result':'1.415,00'}),
    ('m303_mensual_rectificativa_05','303 · mensual rectificativa con varias operaciones','01',{'general':{'base21':'30.000,00','outputVat21':'6.300,00','deductible':'4.900,00','generalResult':'1.400,00'},'additionalInfo':{'intraDeliveries':'3.000,00','exports':'2.000,00','nonLocated':'1.500,00','reverseChargeOps':'750,00'},'result':'250,00','rectificative':True,'previousReceipt':'3032026SYN00005','redeme':True,'sii':True}),
]
for fid,title,period,extra in variants303:
    nif,name=person(); fields={'taxpayerNif':nif,'taxpayerName':name,'fiscalYear':2026,'period':period,**extra}
    fixtures.append(Fixture(fid,'AEAT_MODEL_303',title,2026,period,'SYNTHETIC_FILLED_OFFICIAL_LAYOUT',6,source303,fields,
        {'VAT.PRIOR_PERIODIC_FILING':True,'VAT.PERIODICITY_EVIDENCE':'MONTHLY' if period.isdigit() else 'QUARTERLY','VAT.DECLARED_OPERATIONS':extra.get('additionalInfo',{})},
        ['CURRENT_VAT_REGIME','CURRENT_ROI_STATUS','FUTURE_MODEL_303_OBLIGATION','MODEL_390_OBLIGATION','VALID_AEAT_SUBMISSION'],
        base_evidence(nif,name,'303',2026,period)+[{'fieldId':'vat.general','page':1,'label':'Régimen general','value':extra['general']},{'fieldId':'vat.additionalInfo','page':3,'label':'Información adicional','value':extra.get('additionalInfo',{})},{'fieldId':'filing.result','page':3,'label':'Resultado','value':extra['result']}],
        ['El modelo acredita operaciones declaradas en el periodo, no la situación censal actual.'],build_303))

# 390 variants
source390={'authority':'BOE/AEAT','reference':'BOE-A-2026-1761, anexo IV, modelo 390','templateStatus':'official-layout'}
variants390=[
    ('m390_una_actividad_01','390 · una actividad en régimen general',{'activities':[{'description':'SERVICIOS DE CONSULTORIA','epigraph':'763','activityCode':'A01'}],'outputBase':'48.000,00','outputVat':'10.080,00','annualTurnover':'48.000,00'}),
    ('m390_varias_actividades_02','390 · varias actividades',{'activities':[{'description':'DISENO GRAFICO','epigraph':'399','activityCode':'A01'},{'description':'FORMACION NO REGLADA','epigraph':'826','activityCode':'A02'}],'outputBase':'72.000,00','outputVat':'15.120,00','annualTurnover':'72.000,00'}),
    ('m390_intra_export_03','390 · operaciones intracomunitarias y exportaciones',{'activities':[{'description':'COMERCIO MAYORISTA','epigraph':'612.1','activityCode':'A01'}],'outputBase':'120.000,00','outputVat':'25.200,00','annualTurnover':'150.000,00','intraDeliveries':'20.000,00','exports':'10.000,00'}),
    ('m390_prorrata_sectores_04','390 · prorrata y sectores diferenciados',{'activities':[{'description':'SERVICIOS SANITARIOS MIXTOS','epigraph':'839','activityCode':'A01'},{'description':'FORMACION PROFESIONAL','epigraph':'826','activityCode':'A02'}],'outputBase':'90.000,00','outputVat':'12.600,00','annualTurnover':'130.000,00','prorata':{'percentage':'75','sector':'SECTOR DIFERENCIADO 1'}}),
]
for fid,title,extra in variants390:
    nif,name=person(); fields={'taxpayerNif':nif,'taxpayerName':name,'fiscalYear':2026,**extra}
    fixtures.append(Fixture(fid,'AEAT_MODEL_390',title,2026,'ANNUAL','SYNTHETIC_FILLED_OFFICIAL_LAYOUT',9,source390,fields,
        {'VAT.PRIOR_ANNUAL_PROFILE':True,'VAT.PRIOR_ACTIVITIES':extra['activities'],'VAT.PRIOR_TURNOVER':extra['annualTurnover']},
        ['CURRENT_VAT_REGIME','FUTURE_MODEL_390_OBLIGATION','CURRENT_ACTIVITY_STATUS','VALID_AEAT_SUBMISSION'],
        base_evidence(nif,name,'390',2026,'ANNUAL')+[{'fieldId':'activity.list','page':1,'label':'Datos estadísticos','value':extra['activities']},{'fieldId':'vat.annualTurnover','page':7,'label':'Volumen total de operaciones','value':extra['annualTurnover']}],
        ['Resumen anual histórico: requiere reconciliación con los 303 y con el censo.'],build_390))

# 111 variants
source111={'authority':'AEAT/BOE','reference':'Modelo 111, anexo oficial','templateStatus':'official-layout'}
variants111=[
    ('m111_solo_trabajadores_01','111 · solo rendimientos del trabajo','1T',{'workRecipients':'2','workIncome':'18.000,00','workWithholdings':'2.400,00','professionalRecipients':'0','professionalIncome':'0,00','professionalWithholdings':'0,00','totalWithholdings':'2.400,00','result':'2.400,00'}),
    ('m111_solo_profesionales_02','111 · solo profesionales','2T',{'workRecipients':'0','workIncome':'0,00','workWithholdings':'0,00','professionalRecipients':'3','professionalIncome':'7.500,00','professionalWithholdings':'1.125,00','totalWithholdings':'1.125,00','result':'1.125,00'}),
    ('m111_mixto_03','111 · trabajadores y profesionales','3T',{'workRecipients':'4','workIncome':'42.000,00','workWithholdings':'6.100,00','professionalRecipients':'2','professionalIncome':'5.000,00','professionalWithholdings':'750,00','totalWithholdings':'6.850,00','result':'6.850,00'}),
    ('m111_negativo_complementario_04','111 · negativa y complementaria','4T',{'workRecipients':'0','workIncome':'0,00','workWithholdings':'0,00','professionalRecipients':'0','professionalIncome':'0,00','professionalWithholdings':'0,00','totalWithholdings':'0,00','result':'0,00','negative':True,'complementary':True,'previousReceipt':'1112026SYN00004'}),
]
for fid,title,period,extra in variants111:
    nif,name=person(); fields={'taxpayerNif':nif,'taxpayerName':name,'fiscalYear':2026,'period':period,**extra}
    fixtures.append(Fixture(fid,'AEAT_MODEL_111',title,2026,period,'SYNTHETIC_FILLED_OFFICIAL_LAYOUT',1,source111,fields,
        {'WITHHOLDING.WORK_RECIPIENTS':int(extra['workRecipients'])>0,'WITHHOLDING.PROFESSIONALS_PAID':int(extra['professionalRecipients'])>0,'WITHHOLDING.PRIOR_MODEL_111_FILING':True},
        ['EMPLOYEES_FROM_WORK_ROW_ALONE','CURRENT_MODEL_111_CENSUS','FUTURE_MODEL_111_OBLIGATION','VALID_AEAT_SUBMISSION'],
        base_evidence(nif,name,'111',2026,period)+[{'fieldId':'withholding.workRecipients','page':1,'label':'Rendimientos del trabajo','value':extra['workRecipients']},{'fieldId':'withholding.professionalRecipients','page':1,'label':'Rendimientos de actividades económicas','value':extra['professionalRecipients']},{'fieldId':'filing.result','page':1,'label':'Resultado a ingresar','value':extra['result']}],
        ['El 111 no permite distinguir por sí solo trabajadores de todas las demás subclases anuales.'],build_111))

# 115 variants
source115={'authority':'BOE/AEAT','reference':'Modelo 115, anexo oficial','templateStatus':'official-layout'}
variants115=[
    ('m115_un_arrendador_01','115 · un arrendador','1T',{'recipients':'1','base':'3.000,00','withholdings':'570,00','result':'570,00'}),
    ('m115_varios_arrendadores_02','115 · varios arrendadores','2T',{'recipients':'3','base':'9.000,00','withholdings':'1.710,00','result':'1.710,00'}),
    ('m115_mensual_03','115 · presentación mensual','01',{'recipients':'2','base':'4.000,00','withholdings':'760,00','result':'760,00'}),
    ('m115_complementaria_04','115 · complementaria','4T',{'recipients':'1','base':'3.600,00','withholdings':'684,00','priorResult':'570,00','result':'114,00','complementary':True,'previousReceipt':'1152026SYN00004'}),
]
for fid,title,period,extra in variants115:
    nif,name=person(); fields={'taxpayerNif':nif,'taxpayerName':name,'fiscalYear':2026,'period':period,**extra}
    fixtures.append(Fixture(fid,'AEAT_MODEL_115',title,2026,period,'SYNTHETIC_FILLED_OFFICIAL_LAYOUT',1,source115,fields,
        {'WITHHOLDING.RENT':True,'WITHHOLDING.PRIOR_MODEL_115_FILING':True},
        ['CURRENT_RENTAL_CONTRACT','CURRENT_MODEL_115_CENSUS','FUTURE_MODEL_115_OBLIGATION','VALID_AEAT_SUBMISSION'],
        base_evidence(nif,name,'115',2026,period)+[{'fieldId':'rent.recipients','page':1,'label':'Número de perceptores','value':extra['recipients']},{'fieldId':'rent.base','page':1,'label':'Base de las retenciones','value':extra['base']},{'fieldId':'rent.withholdings','page':1,'label':'Retenciones e ingresos a cuenta','value':extra['withholdings']}],
        ['Una declaración anterior no acredita que el alquiler siga vigente.'],build_115))

# 12 portal screen variants: four each.
source_screen={'authority':'AEAT-inspired synthetic UI','reference':'Simulación de pantallas de Mis datos censales','templateStatus':'synthetic-interface','notOfficialScreenshot':True}
activity_variants=[
    ('pantalla_actividades_una_sin_local_01','Pantalla · una actividad activa sin local',{'activities':[{'description':'SERVICIOS DE PROGRAMACION','epigraph':'763','status':'ACTIVA','startDate':'01/01/2026','place':'Fuera de local determinado'}]}),
    ('pantalla_actividades_varias_02','Pantalla · varias actividades activas',{'activities':[{'description':'DISENO GRAFICO','epigraph':'399','status':'ACTIVA','startDate':'01/01/2025'},{'description':'FORMACION NO REGLADA','epigraph':'826','status':'ACTIVA','startDate':'01/03/2026'}]}),
    ('pantalla_actividades_locales_03','Pantalla · actividad con locales',{'activities':[{'description':'SERVICIOS DE ARQUITECTURA','epigraph':'411','status':'ACTIVA','startDate':'01/01/2024','place':'Local determinado','premises':'CALLE SINTETICA 10, 28080 MADRID · 80 m²'}]}),
    ('pantalla_actividades_parcial_baja_04','Pantalla · captura parcial con actividad de baja',{'partialCapture':True,'activities':[{'description':'COMERCIO MENOR TEXTIL','epigraph':'651.2','status':'BAJA','startDate':'01/01/2022','endDate':'31/12/2025'}]}),
]
for fid,title,extra in activity_variants:
    nif,name=person(); fields={'screenType':'ACTIVITIES','taxpayerNif':nif,'taxpayerName':name,'consultationDate':'14/07/2026',**extra}
    fixtures.append(Fixture(fid,'AEAT_SCREEN_ECONOMIC_ACTIVITIES',title,2026,None,'SYNTHETIC_PORTAL_SCREEN',1,source_screen,fields,
        {'ACTIVITY.LIST':extra['activities'],'ACTIVITY.SOURCE_COMPLETENESS':'PARTIAL' if extra.get('partialCapture') else 'COMPLETE_SYNTHETIC_VIEW'},
        ['VALID_OFFICIAL_CERTIFICATE','CURRENT_STATUS_BEYOND_CONSULTATION_DATE']+(['ABSENCE_OF_OTHER_ACTIVITIES'] if extra.get('partialCapture') else []),
        base_evidence(nif,name,None,2026,None)+[{'fieldId':'activity.list','page':1,'label':'Mis actividades económicas','value':extra['activities']}],
        ['Pantalla sintética; no es una captura oficial ni contiene autenticación.'],build_screen))

status_variants=[
    ('pantalla_situacion_directa_general_01','Pantalla · estimación directa e IVA general',{'irpf':{'Método':'Estimación directa simplificada','Pagos fraccionados':'Modelo 130'},'vat':{'Régimen':'General','Periodicidad':'Trimestral'},'registries':{'ROI':'No','REDEME':'No','SII':'No'}}),
    ('pantalla_situacion_modulos_02','Pantalla · módulos e IVA simplificado',{'irpf':{'Método':'Estimación objetiva','Pagos fraccionados':'Modelo 131'},'vat':{'Régimen':'Simplificado','Periodicidad':'Trimestral'},'registries':{'ROI':'No','REDEME':'No','SII':'No'}}),
    ('pantalla_situacion_recargo_exenta_03','Pantalla · recargo de equivalencia y actividad exenta',{'irpf':{'Método':'Estimación directa simplificada','Pagos fraccionados':'Modelo 130'},'vat':{'Régimen actividad 1':'Recargo de equivalencia','Régimen actividad 2':'Exenta sin 303 periódico'},'registries':{'ROI':'No','REDEME':'No','SII':'No'}}),
    ('pantalla_situacion_registros_04','Pantalla · ROI, REDEME y SII',{'irpf':{'Método':'Estimación directa normal','Pagos fraccionados':'Modelo 130'},'vat':{'Régimen':'General','Periodicidad':'Mensual'},'registries':{'ROI':'Alta 01/02/2026','REDEME':'Alta 01/01/2026','SII':'Incluido'}}),
]
for fid,title,extra in status_variants:
    nif,name=person(); fields={'screenType':'TAX_STATUS','taxpayerNif':nif,'taxpayerName':name,'consultationDate':'14/07/2026',**extra}
    fixtures.append(Fixture(fid,'AEAT_SCREEN_TAX_STATUS',title,2026,None,'SYNTHETIC_PORTAL_SCREEN',1,source_screen,fields,
        {'IRPF.STATUS':extra['irpf'],'VAT.STATUS':extra['vat'],'REGISTRIES.STATUS':extra['registries']},
        ['VALID_OFFICIAL_CERTIFICATE','CHANGES_AFTER_CONSULTATION_DATE','VALID_AEAT_SUBMISSION'],
        base_evidence(nif,name,None,2026,None)+[{'fieldId':'irpf.status','page':1,'label':'Impuesto sobre la Renta','value':extra['irpf']},{'fieldId':'vat.status','page':1,'label':'Impuesto sobre el Valor Añadido','value':extra['vat']},{'fieldId':'registries.status','page':1,'label':'Registros y opciones','value':extra['registries']}],
        ['Pantalla sintética inspirada en la estructura funcional descrita por la AEAT.'],build_screen))

obligation_variants=[
    ('pantalla_obligaciones_130_303_01','Pantalla · modelos 130 y 303 trimestrales',{'obligations':[{'model':'130','description':'Pago fraccionado IRPF','periodicity':'Trimestral','status':'ACTIVA','startDate':'01/01/2026'},{'model':'303','description':'Autoliquidación IVA','periodicity':'Trimestral','status':'ACTIVA','startDate':'01/01/2026'}]}),
    ('pantalla_obligaciones_303_111_115_02','Pantalla · modelos 303, 111 y 115',{'obligations':[{'model':'303','description':'Autoliquidación IVA','periodicity':'Trimestral','status':'ACTIVA','startDate':'01/01/2025'},{'model':'111','description':'Retenciones trabajo/profesionales','periodicity':'Trimestral','status':'ACTIVA','startDate':'01/02/2026'},{'model':'115','description':'Retenciones arrendamientos','periodicity':'Trimestral','status':'ACTIVA','startDate':'01/02/2026'}]}),
    ('pantalla_obligaciones_altas_bajas_03','Pantalla · obligaciones activas e inactivas',{'obligations':[{'model':'130','description':'Pago fraccionado IRPF','periodicity':'Trimestral','status':'ACTIVA','startDate':'01/01/2024'},{'model':'115','description':'Retenciones arrendamientos','periodicity':'Trimestral','status':'BAJA','startDate':'01/01/2024','endDate':'31/03/2026'},{'model':'349','description':'Operaciones intracomunitarias','periodicity':'Variable','status':'ACTIVA','startDate':'01/03/2026'}]}),
    ('pantalla_obligaciones_mensuales_04','Pantalla · obligaciones mensuales mixtas',{'obligations':[{'model':'303','description':'Autoliquidación IVA','periodicity':'Mensual','status':'ACTIVA','startDate':'01/01/2026'},{'model':'111','description':'Retenciones trabajo/profesionales','periodicity':'Mensual','status':'ACTIVA','startDate':'01/01/2026'},{'model':'115','description':'Retenciones arrendamientos','periodicity':'Mensual','status':'ACTIVA','startDate':'01/01/2026'},{'model':'349','description':'Operaciones intracomunitarias','periodicity':'Mensual','status':'ACTIVA','startDate':'01/02/2026'}]}),
]
for fid,title,extra in obligation_variants:
    nif,name=person(); fields={'screenType':'OBLIGATIONS','taxpayerNif':nif,'taxpayerName':name,'consultationDate':'14/07/2026',**extra}
    fixtures.append(Fixture(fid,'AEAT_SCREEN_PERIODIC_OBLIGATIONS',title,2026,None,'SYNTHETIC_PORTAL_SCREEN',1,source_screen,fields,
        {'CENSUS.PERIODIC_OBLIGATIONS':extra['obligations']},
        ['ACTUAL_FILING_COMPLIANCE','FUTURE_OPERATIONS','VALID_OFFICIAL_CERTIFICATE','CHANGES_AFTER_CONSULTATION_DATE'],
        base_evidence(nif,name,None,2026,None)+[{'fieldId':'census.periodicObligations','page':1,'label':'Mis obligaciones tributarias','value':extra['obligations']}],
        ['La pantalla indica obligaciones censadas, no confirma que todas las declaraciones se hayan presentado.'],build_screen))

if len(fixtures)!=41:
    raise RuntimeError(f'Expected 41 fixtures, got {len(fixtures)}')

inventory=[]
for num,f in enumerate(fixtures, start=1):
    pdf=write_pdf(f)
    man=write_manifest(f,pdf)
    inventory.append({
        'n':num,'fixtureId':f.fixture_id,'documentType':f.document_type,'displayName':f.display_name,
        'fiscalYear':f.fiscal_year,'period':f.period or '', 'pages':f.expected_pages,
        'pdf':str(pdf.relative_to(ROOT)),'manifest':str(man.relative_to(ROOT)),
        'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(), 'bytes':pdf.stat().st_size
    })
    print(f'[{num:02d}/41] {f.fixture_id}: {pdf.stat().st_size/1024:.1f} KB')

(ROOT/'corpus-manifest.json').write_text(json.dumps({
    'schemaVersion':SCHEMA_VERSION,
    'generatorVersion':GENERATOR_VERSION,
    'title':'Corpus sintético base para extractores del perfil fiscal del autónomo',
    'status':'GENERATED_PENDING_VALIDATION',
    'totalFixtures':len(inventory),
    'synthetic':True,
    'notValidForFiling':True,
    'fixtures':inventory
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

with (ROOT/'corpus-inventory.csv').open('w',encoding='utf-8',newline='') as fh:
    writer=csv.DictWriter(fh,fieldnames=list(inventory[0].keys()))
    writer.writeheader(); writer.writerows(inventory)

readme='''# Corpus sintético de documentos para el motor de perfil fiscal\n\nEste paquete contiene **41 PDF base sintéticos** y sus manifiestos JSON.\n\n## Advertencia\n\n- Ningún PDF es una declaración real ni ha sido validado o presentado ante la AEAT.\n- Todos llevan la marca visible **DOCUMENTO SINTÉTICO · SIN VALIDEZ**.\n- Los NIF, nombres, importes, fechas y referencias se han generado exclusivamente para pruebas.\n- Las pantallas de “Mis datos censales” son simulaciones funcionales, no capturas oficiales.\n- Los formularios utilizan layouts oficiales publicados por AEAT/BOE como fondo cuando se dispone de ellos; la capa cumplimentada es sintética.\n\n## Contenido\n\n- 5 variantes del modelo 036.\n- 3 variantes históricas del modelo 037.\n- 4 variantes del modelo 130.\n- 5 variantes del modelo 303.\n- 4 variantes del modelo 390.\n- 4 variantes del modelo 111.\n- 4 variantes del modelo 115.\n- 4 simulaciones de “Mis actividades económicas”.\n- 4 simulaciones de “Mi situación tributaria”.\n- 4 simulaciones de “Mis obligaciones tributarias”.\n\n## Estructura\n\n- `pdfs/`: documentos base.\n- `manifests/`: verdad esperada, evidencias y prohibiciones de inferencia.\n- `corpus-manifest.json`: inventario completo y huellas SHA-256.\n- `corpus-inventory.csv`: inventario tabular.\n- `VALIDATION_REPORT.md`: resultado del validador.\n\n## Uso recomendado\n\n1. Clasificar el PDF.\n2. Extraer los campos.\n3. Compararlos con `expectedFields` y `fieldEvidence`.\n4. Comprobar `mustNotInfer`.\n5. Generar degradaciones visuales a partir del PDF base para pruebas OCR.\n\n## Alcance\n\nEl corpus sirve para desarrollo, regresión y contraste inicial. No sustituye la validación posterior con documentos reales debidamente autorizados y anonimizados.\n'''
(ROOT/'README.md').write_text(readme,encoding='utf-8')
print('Generated',len(fixtures),'fixtures')
