from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import random
import shutil
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

import fitz
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    LongTable,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path('/mnt/data/tax_profile_corpus_pending29_v1')
BASE_DIR = ROOT / 'pdfs' / 'native'
SCAN_DIR = ROOT / 'pdfs' / 'scan_compressed'
ROT_DIR = ROOT / 'pdfs' / 'rotated_capture'
MAN_DIR = ROOT / 'manifests'
TOOLS_DIR = ROOT / 'tools'
QA_DIR = ROOT / 'qa'
for d in (BASE_DIR, SCAN_DIR, ROT_DIR, MAN_DIR, TOOLS_DIR, QA_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Clear generated outputs only when RESET=1; normal runs resume safely.
if os.getenv('RESET') == '1':
    for d in (BASE_DIR, SCAN_DIR, ROT_DIR, MAN_DIR, QA_DIR):
        for p in d.iterdir():
            if p.is_file() or p.is_symlink():
                p.unlink()
            elif p.is_dir():
                shutil.rmtree(p)

SCHEMA_VERSION = '2.0'
GENERATOR_VERSION = 'tax-profile-pending29-generator/1.0.0'
RNG = random.Random(20260715)
DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'


def valid_dni(number: int) -> str:
    n = number % 100_000_000
    return f'{n:08d}{DNI_LETTERS[n % 23]}'


def valid_cif(index: int, prefix: str = 'B') -> str:
    digits = f'{(index * 7919 + 1234567) % 10_000_000:07d}'
    s_even = sum(int(digits[i]) for i in (1, 3, 5))
    s_odd = 0
    for i in (0, 2, 4, 6):
        v = int(digits[i]) * 2
        s_odd += v // 10 + v % 10
    control = (10 - ((s_even + s_odd) % 10)) % 10
    return f'{prefix}{digits}{control}'


def money(value: float) -> str:
    s = f'{value:,.2f}'
    return s.replace(',', 'X').replace('.', ',').replace('X', '.')


def flatten_expected(pages: list[dict[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for page in pages:
        for section in page.get('sections', []):
            for fld in section.get('fields', []):
                out[fld['fieldId']] = fld.get('value')
            if section.get('table'):
                out[section['table']['fieldId']] = section['table']['rows']
    return out


def field(field_id: str, label: str, value: Any, sensitive: bool = False) -> dict[str, Any]:
    return {'fieldId': field_id, 'label': label, 'value': value, 'sensitive': sensitive}


def section(title: str, fields: list[dict[str, Any]] | None = None,
            table: dict[str, Any] | None = None, note: str | None = None) -> dict[str, Any]:
    return {'title': title, 'fields': fields or [], 'table': table, 'note': note}


def table(field_id: str, title: str, headers: list[str], rows: list[list[Any]]) -> dict[str, Any]:
    return {'fieldId': field_id, 'title': title, 'headers': headers, 'rows': rows}


FAMILIES: dict[str, dict[str, Any]] = {
    'AEAT_FORM_035': {
        'code': '035', 'authority': 'AEAT',
        'title': 'Registro censal de los regímenes especiales OSS/IOSS',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G333.shtml',
            'https://sede.agenciatributaria.gob.es/Sede/Ayuda/035.html',
        ],
    },
    'AEAT_MODEL_100': {
        'code': '100', 'authority': 'AEAT',
        'title': 'Impuesto sobre la Renta de las Personas Físicas',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G229.shtml',
            'https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100.html',
        ],
    },
    'AEAT_MODEL_123': {
        'code': '123', 'authority': 'AEAT',
        'title': 'Retenciones sobre determinados rendimientos del capital mobiliario',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH04.shtml'],
    },
    'AEAT_MODEL_131': {
        'code': '131', 'authority': 'AEAT',
        'title': 'Pago fraccionado de IRPF en estimación objetiva',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/tramitacion/G602.shtml',
            'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta-pagos-fraccionados/pagos-fraccionados/modelo-131.html',
        ],
    },
    'AEAT_MODEL_151': {
        'code': '151', 'authority': 'AEAT',
        'title': 'IRPF del régimen especial de personas desplazadas a España',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G615.shtml',
            'https://sede.agenciatributaria.gob.es/Sede/irpf/tengo-que-presentar-declaracion/regimen-fiscal-aplicable-trabajadores-desplazados/gestiones-destacadas-regimen-fiscal-trabajadores-desplazados.html',
        ],
    },
    'AEAT_MODEL_180': {
        'code': '180', 'authority': 'AEAT',
        'title': 'Resumen anual de retenciones por arrendamiento de inmuebles urbanos',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta-pagos-fraccionados/retenciones-ingresos-cuenta/modelo-180.html',
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI00.shtml',
        ],
    },
    'AEAT_MODEL_184': {
        'code': '184', 'authority': 'AEAT',
        'title': 'Entidades en régimen de atribución de rentas',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI04.shtml'],
    },
    'AEAT_MODEL_190': {
        'code': '190', 'authority': 'AEAT',
        'title': 'Resumen anual de retenciones del trabajo y actividades económicas',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI10.shtml',
            'https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_25/DISENOS_LOGICOS_190_2025.pdf',
        ],
    },
    'AEAT_MODEL_193': {
        'code': '193', 'authority': 'AEAT',
        'title': 'Resumen anual de retenciones sobre capital mobiliario',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI12.shtml',
            'https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_193_2025.pdf',
        ],
    },
    'AEAT_MODEL_200': {
        'code': '200', 'authority': 'AEAT',
        'title': 'Impuesto sobre Sociedades',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE04.shtml',
            'https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades/campana-sociedades.html',
        ],
    },
    'AEAT_MODEL_202': {
        'code': '202', 'authority': 'AEAT',
        'title': 'Pago fraccionado del Impuesto sobre Sociedades',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE00.shtml'],
    },
    'AEAT_MODEL_216': {
        'code': '216', 'authority': 'AEAT',
        'title': 'Retenciones de rentas obtenidas por no residentes sin establecimiento permanente',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF05.shtml'],
    },
    'AEAT_MODEL_296': {
        'code': '296', 'authority': 'AEAT',
        'title': 'Resumen anual de retenciones de no residentes',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI22.shtml'],
    },
    'AEAT_MODEL_308': {
        'code': '308', 'authority': 'AEAT',
        'title': 'Solicitud de devolución en supuestos especiales de IVA',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G403.shtml'],
    },
    'AEAT_MODEL_309': {
        'code': '309', 'authority': 'AEAT',
        'title': 'IVA - liquidación no periódica',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G404.shtml',
            'https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-309-iva-declaracion-liquidacion-periodica_/instrucciones-modelo-309.html',
        ],
    },
    'AEAT_MODEL_341': {
        'code': '341', 'authority': 'AEAT',
        'title': 'Reintegro de compensaciones del régimen especial agrario',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ10.shtml'],
    },
    'AEAT_MODEL_347': {
        'code': '347', 'authority': 'AEAT',
        'title': 'Declaración anual de operaciones con terceras personas',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI27.shtml'],
    },
    'AEAT_MODEL_349': {
        'code': '349', 'authority': 'AEAT',
        'title': 'Declaración recapitulativa de operaciones intracomunitarias',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI28.shtml'],
    },
    'AEAT_MODEL_369': {
        'code': '369', 'authority': 'AEAT',
        'title': 'IVA de los regímenes de ventanilla única OSS/IOSS',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G420.shtml',
            'https://sede.agenciatributaria.gob.es/Sede/iva/iva-comercio-electronico/presentacion-autoliquidaciones-periodicas-modelo-369.html',
        ],
    },
    'AEAT_MODEL_714': {
        'code': '714', 'authority': 'AEAT',
        'title': 'Impuesto sobre el Patrimonio',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G611.shtml',
            'https://sede.agenciatributaria.gob.es/static_files/Sede/Biblioteca/Manual/Practicos/Patrimonio/Patrimonio-2025/ManualPatrimonio2025_es_es.pdf',
        ],
    },
    'AEAT_MODEL_720': {
        'code': '720', 'authority': 'AEAT',
        'title': 'Bienes y derechos situados en el extranjero',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI34.shtml'],
    },
    'AEAT_MODEL_721': {
        'code': '721', 'authority': 'AEAT',
        'title': 'Monedas virtuales situadas en el extranjero',
        'sources': ['https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI55.shtml'],
    },
    'AEAT_MODEL_840': {
        'code': '840', 'authority': 'AEAT',
        'title': 'Declaración de alta, baja o variación en el IAE',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G323.shtml',
            'https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G323/mod840e_es_es.pdf',
        ],
    },
    'AEAT_CERT_CURRENT_CENSUS_STATUS': {
        'code': 'CERT-CENSO', 'authority': 'AEAT',
        'title': 'Certificado tributario de situación censal',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/certificaciones/censales/certificados-trib_____de-certificados-tributarios-situacion-censal/que-certifica.html',
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G313.shtml',
        ],
    },
    'TGSS_REPORT_CURRENT_STATUS': {
        'code': 'TGSS-ACTUAL', 'authority': 'TGSS',
        'title': 'Informe de situación actual del trabajador',
        'sources': ['https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida%2Blaboral%2Be%2Binformes/Informes%2Bsobre%2Btu%2Bsituacion%2Blaboral/Informe%2Bde%2Bsituacion%2Blaboral%2Bactual'],
    },
    'TGSS_REPORT_EMPLOYMENT_HISTORY': {
        'code': 'TGSS-VIDA', 'authority': 'TGSS',
        'title': 'Informe de vida laboral',
        'sources': ['https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida%2Blaboral%2Be%2Binformes/Informes%2Bsobre%2Btu%2Bsituacion%2Blaboral/Informe%2Bde%2Btu%2Bvida%2Blaboral'],
    },
    'TGSS_REPORT_SELF_EMPLOYED_ACTIVITIES': {
        'code': 'TGSS-ACT-AUT', 'authority': 'TGSS',
        'title': 'Informe de actividades de trabajo autónomo',
        'sources': ['https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida%2Blaboral%2Be%2Binformes/Informes%2Bsobre%2Btu%2Bsituacion%2Blaboral/Infor_Act_Autonomo'],
    },
    'AEAT_CERT_ROI': {
        'code': 'CERT-ROI', 'authority': 'AEAT',
        'title': 'Certificado de operador intracomunitario',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/iva/iva-quiero-certificado-IVA.html',
            'https://sede.agenciatributaria.gob.es/Sede/certificaciones/censales.html',
        ],
    },
    'AEAT_CERT_LANDLORD_WITHHOLDING_EXEMPTION': {
        'code': 'CERT-ARREND', 'authority': 'AEAT',
        'title': 'Certificado de exoneración de retención del arrendador',
        'sources': [
            'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G312.shtml',
            'https://sede.agenciatributaria.gob.es/Sede/certificaciones/censales.html',
        ],
    },
}

PERSON_FAMILIES = {
    'AEAT_MODEL_100', 'AEAT_MODEL_123', 'AEAT_MODEL_131', 'AEAT_MODEL_151',
    'AEAT_MODEL_216', 'AEAT_MODEL_308', 'AEAT_MODEL_309', 'AEAT_MODEL_341',
    'AEAT_MODEL_714', 'AEAT_MODEL_720', 'AEAT_MODEL_721',
    'TGSS_REPORT_CURRENT_STATUS', 'TGSS_REPORT_EMPLOYMENT_HISTORY',
    'TGSS_REPORT_SELF_EMPLOYED_ACTIVITIES', 'AEAT_CERT_CURRENT_CENSUS_STATUS',
    'AEAT_CERT_ROI',
}

SCENARIOS = ['habitual', 'negative_zero', 'complex', 'incomplete_ambiguous']
VISUALS = ['native', 'scan_compressed', 'rotated_capture']


def identity_for(family_id: str, base_number: int) -> tuple[str, str]:
    if family_id in PERSON_FAMILIES:
        nif = valid_dni(12_000_000 + base_number * 113)
        return nif, f'PERSONA SINTÉTICA {base_number:03d}'
    nif = valid_cif(base_number + 50)
    return nif, f'ENTIDAD SINTÉTICA {base_number:03d} S.L.'


def common_must_not_infer(family_id: str) -> list[str]:
    common = ['VALID_OFFICIAL_SUBMISSION', 'FUTURE_OBLIGATION_WITHOUT_CURRENT_EVIDENCE']
    historical = {
        'AEAT_MODEL_100', 'AEAT_MODEL_123', 'AEAT_MODEL_131', 'AEAT_MODEL_151',
        'AEAT_MODEL_180', 'AEAT_MODEL_184', 'AEAT_MODEL_190', 'AEAT_MODEL_193',
        'AEAT_MODEL_200', 'AEAT_MODEL_202', 'AEAT_MODEL_216', 'AEAT_MODEL_296',
        'AEAT_MODEL_308', 'AEAT_MODEL_309', 'AEAT_MODEL_341', 'AEAT_MODEL_347',
        'AEAT_MODEL_349', 'AEAT_MODEL_369', 'AEAT_MODEL_714', 'AEAT_MODEL_720',
        'AEAT_MODEL_721',
    }
    if family_id in historical:
        common += ['CURRENT_CENSUS_STATUS', 'CURRENT_ACTIVITY_STATUS']
    if family_id == 'AEAT_MODEL_349':
        common += ['CURRENT_ROI_STATUS']
    if family_id == 'AEAT_FORM_035':
        common += ['ACTUAL_OSS_IOSS_OPERATIONS']
    if family_id in {'AEAT_CERT_ROI'}:
        common += ['ACTUAL_INTRACOMMUNITY_OPERATIONS']
    if family_id in {'TGSS_REPORT_CURRENT_STATUS'}:
        common += ['FULL_RETA_HISTORY']
    if family_id == 'TGSS_REPORT_SELF_EMPLOYED_ACTIVITIES':
        common += ['AEAT_CENSUS_ACTIVITY_EQUIVALENCE']
    if family_id == 'AEAT_CERT_LANDLORD_WITHHOLDING_EXEMPTION':
        common += ['EXEMPTION_FOR_OTHER_LANDLORDS_OR_PERIODS']
    return common


def content_for(family_id: str, scenario: str, base_number: int, nif: str, name: str) -> dict[str, Any]:
    fam = FAMILIES[family_id]
    year = 2025 if family_id in {
        'AEAT_MODEL_100', 'AEAT_MODEL_180', 'AEAT_MODEL_184', 'AEAT_MODEL_190',
        'AEAT_MODEL_193', 'AEAT_MODEL_200', 'AEAT_MODEL_296', 'AEAT_MODEL_347',
        'AEAT_MODEL_714', 'AEAT_MODEL_720', 'AEAT_MODEL_721'
    } else 2026
    period: str | None = None
    kind = 'SYNTHETIC_FILED_COPY'
    temporal = 'TARGET_FISCAL_YEAR'
    disposition = 'ACCEPT_WITH_SYNTHETIC_LIMITATION'
    complete = True
    notes: list[str] = []
    qm: dict[str, Any] = {}
    pages: list[dict[str, Any]] = []

    # Scenario flags.
    is_neg = scenario == 'negative_zero'
    is_complex = scenario == 'complex'
    is_incomplete = scenario == 'incomplete_ambiguous'
    if is_complex:
        kind = 'SYNTHETIC_COMPLEMENTARY_OR_MULTI_RECORD'
    if is_incomplete:
        kind = 'SYNTHETIC_INCOMPLETE_OR_AMBIGUOUS_COPY'
        disposition = 'REVIEW_OR_REJECT'
        complete = False
        notes.append('Documento deliberadamente incompleto o ambiguo para comprobar que el lector no cierre preguntas críticas.')

    # 035
    if family_id == 'AEAT_FORM_035':
        temporal = 'CURRENT_AS_OF_EFFECTIVE_DATE'
        if scenario == 'habitual':
            fields1 = [
                field('oss.action', 'Tipo de declaración', 'ALTA'),
                field('oss.regime', 'Régimen', 'RÉGIMEN DE LA UNIÓN'),
                field('oss.memberStateIdentification', 'Estado miembro de identificación', 'ESPAÑA'),
                field('oss.effectiveDate', 'Fecha de efectos', '01/07/2026'),
                field('oss.registrationNumber', 'Número de identificación', 'EU-ES-SYN-0001'),
            ]
            fields2 = [
                field('oss.webSite', 'Sitio web', 'https://tienda-sintetica.example'),
                field('oss.contactEmail', 'Correo de contacto', 'fiscal@sintetica.example'),
                field('oss.fixedEstablishments', 'Establecimientos permanentes en otros Estados', 'NINGUNO'),
            ]
            qm = {'ECOMMERCE.OSS_IOSS_REGISTRATION': 'REGISTERED', 'ECOMMERCE.OSS_IOSS_REGIME': 'UNION'}
        elif is_neg:
            fields1 = [
                field('oss.action', 'Tipo de declaración', 'BAJA'),
                field('oss.regime', 'Régimen', 'RÉGIMEN DE LA UNIÓN'),
                field('oss.effectiveDate', 'Fecha de efectos', '31/03/2026'),
                field('oss.cessationReason', 'Motivo', 'CESE VOLUNTARIO'),
            ]
            fields2 = [field('oss.fixedEstablishments', 'Establecimientos permanentes', 'NINGUNO')]
            qm = {'ECOMMERCE.OSS_IOSS_REGISTRATION': 'DEREGISTERED'}
        elif is_complex:
            fields1 = [
                field('oss.action', 'Tipo de declaración', 'MODIFICACIÓN'),
                field('oss.regime', 'Régimen', 'RÉGIMEN DE IMPORTACIÓN - INTERMEDIARIO'),
                field('oss.memberStateIdentification', 'Estado miembro de identificación', 'ESPAÑA'),
                field('oss.effectiveDate', 'Fecha de efectos', '15/09/2026'),
                field('oss.registrationNumber', 'Número IOSS', 'IM276SYN00099'),
                field('oss.intermediaryNif', 'NIF del intermediario', valid_cif(base_number + 900)),
            ]
            fields2 = [
                field('oss.fixedEstablishments', 'Establecimientos permanentes', 'FRANCIA; PORTUGAL'),
                field('oss.previousRegistrations', 'Registros anteriores', 'DE / NL'),
            ]
            qm = {'ECOMMERCE.OSS_IOSS_REGISTRATION': 'MODIFIED', 'ECOMMERCE.OSS_IOSS_REGIME': 'IMPORT_INTERMEDIARY'}
        else:
            fields1 = [
                field('oss.action', 'Tipo de declaración', 'ALTA'),
                field('oss.regime', 'Régimen', '[CAMPO PARCIALMENTE ILEGIBLE]'),
                field('oss.effectiveDate', 'Fecha de efectos', '[NO VISIBLE]'),
            ]
            fields2 = [field('oss.registrationNumber', 'Número de identificación', '[PÁGINA AUSENTE]')]
            qm = {'ECOMMERCE.OSS_IOSS_REGISTRATION': 'NEEDS_CONFIRMATION'}
        period = None
        pages = [
            {'pageTitle': 'Identificación y opción censal', 'sections': [section('Registro OSS/IOSS', fields1)]},
            {'pageTitle': 'Información complementaria', 'sections': [section('Datos adicionales', fields2)]},
        ]

    # 100
    elif family_id == 'AEAT_MODEL_100':
        period = 'ANUAL'
        if scenario == 'habitual':
            activities = [['A01', 'Consultoría informática', 'DIRECTA SIMPLIFICADA', money(48000), money(16500), money(31500), money(4100)]]
            result = money(950)
            fields = [field('irpf.filingType', 'Tipo de declaración', 'INDIVIDUAL'), field('irpf.result', 'Resultado', result)]
            qm = {'IRPF.PRIOR_ANNUAL_FILING': True, 'IRPF.METHOD': 'DIRECT_SIMPLIFIED', 'ACTIVITY.LIST': ['Consultoría informática']}
        elif is_neg:
            activities = [['A01', 'Diseño gráfico', 'DIRECTA SIMPLIFICADA', money(0), money(3200), money(-3200), money(0)]]
            result = money(-120)
            fields = [field('irpf.filingType', 'Tipo de declaración', 'INDIVIDUAL'), field('irpf.result', 'Resultado', result), field('irpf.zeroIncome', 'Ingresos de actividad', money(0))]
            qm = {'IRPF.PRIOR_ANNUAL_FILING': True, 'IRPF.METHOD': 'DIRECT_SIMPLIFIED'}
        elif is_complex:
            activities = [
                ['A01', 'Arquitectura', 'DIRECTA NORMAL', money(125000), money(62000), money(63000), money(10500)],
                ['A02', 'Alquiler de local', 'CAPITAL INMOBILIARIO', money(18000), money(4200), money(13800), money(3420)],
            ]
            result = money(4200)
            fields = [
                field('irpf.filingType', 'Tipo de declaración', 'CONJUNTA'),
                field('irpf.attributedIncome', 'Rentas atribuidas', money(7400)),
                field('irpf.capitalGains', 'Ganancias patrimoniales', money(12800)),
                field('irpf.result', 'Resultado', result),
            ]
            qm = {'IRPF.PRIOR_ANNUAL_FILING': True, 'IRPF.METHOD': ['DIRECT_NORMAL'], 'ENTITY.INCOME_ATTRIBUTION': True}
        else:
            activities = [['A01', '[ANEXO DE ACTIVIDAD AUSENTE]', '[NO VISIBLE]', '[NO VISIBLE]', '[NO VISIBLE]', '[NO VISIBLE]', '[NO VISIBLE]']]
            fields = [field('irpf.filingType', 'Tipo de declaración', 'INDIVIDUAL'), field('irpf.result', 'Resultado', '[PÁGINA FINAL AUSENTE]')]
            qm = {'IRPF.PRIOR_ANNUAL_FILING': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Resumen de la declaración', 'sections': [section('Datos generales', fields), section('Actividad económica', table=table('irpf.activities', 'Actividades', ['Clave', 'Actividad', 'Método', 'Ingresos', 'Gastos', 'Rendimiento', 'Retenciones'], activities))]},
            {'pageTitle': 'Liquidación', 'sections': [section('Resultado', [field('irpf.totalResult', 'Cuota diferencial / resultado', result if not is_incomplete else '[NO VISIBLE]')])]},
        ]

    # 123
    elif family_id == 'AEAT_MODEL_123':
        period = '2T' if not is_complex else '4T'
        if scenario == 'habitual':
            flds = [field('withholding.recipients', 'Número de perceptores', 2), field('withholding.base', 'Base', money(6000)), field('withholding.amount', 'Retenciones', money(1140)), field('filing.result', 'Resultado a ingresar', money(1140))]
            qm = {'WITHHOLDING.CAPITAL': True, 'WITHHOLDING.MODEL_123_PERIOD': period}
        elif is_neg:
            flds = [field('withholding.recipients', 'Número de perceptores', 0), field('withholding.base', 'Base', money(0)), field('withholding.amount', 'Retenciones', money(0)), field('filing.result', 'Resultado', money(0))]
            qm = {'WITHHOLDING.CAPITAL': False}
        elif is_complex:
            flds = [field('filing.complementary', 'Declaración complementaria', 'SÍ'), field('withholding.recipients', 'Número de perceptores', 5), field('withholding.base', 'Base', money(28750)), field('withholding.amount', 'Retenciones', money(5462.5)), field('filing.previousResult', 'Resultado anterior', money(4800)), field('filing.result', 'Resultado complementario', money(662.5))]
            qm = {'WITHHOLDING.CAPITAL': True, 'WITHHOLDING.MODEL_123_PERIOD': period}
        else:
            flds = [field('withholding.recipients', 'Número de perceptores', '[ILEGIBLE]'), field('withholding.base', 'Base', money(9000)), field('withholding.amount', 'Retenciones', '[BORROSO]'), field('filing.result', 'Resultado', '[NO VISIBLE]')]
            qm = {'WITHHOLDING.CAPITAL': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Autoliquidación', 'sections': [section('Retenciones e ingresos a cuenta', flds)]}]

    # 131
    elif family_id == 'AEAT_MODEL_131':
        period = '1T' if not is_complex else '4T'
        if scenario == 'habitual':
            flds = [field('irpf.method', 'Método', 'ESTIMACIÓN OBJETIVA'), field('modules.activity', 'Actividad', 'Comercio menor de pan'), field('modules.netYield', 'Rendimiento neto por módulos', money(12800)), field('modules.percentage', 'Porcentaje', '4%'), field('filing.result', 'Resultado', money(512))]
            qm = {'IRPF.METHOD': 'OBJECTIVE_ESTIMATION', 'IRPF.PRIOR_MODEL_131_FILING': True}
        elif is_neg:
            flds = [field('irpf.method', 'Método', 'ESTIMACIÓN OBJETIVA'), field('modules.activity', 'Actividad', 'Taxi'), field('modules.netYield', 'Rendimiento neto por módulos', money(0)), field('filing.result', 'Resultado', money(0))]
            qm = {'IRPF.METHOD': 'OBJECTIVE_ESTIMATION', 'IRPF.PRIOR_MODEL_131_FILING': True}
        elif is_complex:
            flds = [field('filing.complementary', 'Complementaria', 'SÍ'), field('irpf.method', 'Método', 'ESTIMACIÓN OBJETIVA'), field('modules.activities', 'Actividades', 'Restaurante + comercio menor'), field('modules.netYield', 'Rendimiento conjunto', money(43600)), field('withholding.amount', 'Retenciones soportadas', money(250)), field('filing.previousPayments', 'Pagos anteriores', money(1400)), field('filing.result', 'Resultado', money(94))]
            qm = {'IRPF.METHOD': 'OBJECTIVE_ESTIMATION', 'IRPF.PRIOR_MODEL_131_FILING': True}
        else:
            flds = [field('irpf.method', 'Método', 'ESTIMACIÓN OBJETIVA'), field('modules.activity', 'Actividad', '[PÁGINA DE MÓDULOS AUSENTE]'), field('filing.result', 'Resultado', '[ILEGIBLE]')]
            qm = {'IRPF.METHOD': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Pago fraccionado', 'sections': [section('Cálculo por módulos', flds)]}]

    # 151
    elif family_id == 'AEAT_MODEL_151':
        period = 'ANUAL'
        if scenario == 'habitual':
            flds = [field('specialRegime.article93', 'Régimen especial', 'ARTÍCULO 93 LIRPF'), field('residence.startDate', 'Fecha de desplazamiento', '01/02/2025'), field('income.work', 'Rendimientos del trabajo', money(92000)), field('withholding.amount', 'Retenciones', money(22000)), field('filing.result', 'Resultado', money(1400))]
            qm = {'PERSONAL.SPECIAL_ARTICLE_93': True, 'IRPF.PRIOR_SPECIAL_REGIME_FILING': True}
        elif is_neg:
            flds = [field('specialRegime.article93', 'Régimen especial', 'ARTÍCULO 93 LIRPF'), field('income.work', 'Rendimientos del trabajo', money(45000)), field('withholding.amount', 'Retenciones', money(10800)), field('filing.result', 'Resultado', money(0))]
            qm = {'PERSONAL.SPECIAL_ARTICLE_93': True}
        elif is_complex:
            flds = [field('specialRegime.article93', 'Régimen especial', 'ARTÍCULO 93 LIRPF'), field('income.work', 'Rendimientos del trabajo', money(180000)), field('income.capitalGains', 'Ganancias patrimoniales', money(22000)), field('income.foreign', 'Rentas extranjeras declaradas', money(31000)), field('withholding.amount', 'Retenciones', money(48000)), field('filing.result', 'Resultado', money(7200))]
            qm = {'PERSONAL.SPECIAL_ARTICLE_93': True, 'IRPF.PRIOR_SPECIAL_REGIME_FILING': True}
        else:
            flds = [field('specialRegime.article93', 'Régimen especial', '[CASILLA NO VISIBLE]'), field('income.work', 'Rendimientos del trabajo', money(75000)), field('filing.result', 'Resultado', '[PÁGINA AUSENTE]')]
            qm = {'PERSONAL.SPECIAL_ARTICLE_93': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Declaración del régimen especial', 'sections': [section('Rentas y liquidación', flds)]}]

    # 180
    elif family_id == 'AEAT_MODEL_180':
        period = 'ANUAL'
        if scenario == 'habitual':
            records = [[valid_cif(base_number + 300), 'ARRENDADOR SINTÉTICO UNO S.L.', 'CL PRUEBA 10, MADRID', 'RC-SYN-0001', money(18000), money(3420)]]
            summary = [field('rent.recipients', 'Perceptores', 1), field('rent.totalBase', 'Base total', money(18000)), field('rent.totalWithholding', 'Retenciones', money(3420))]
            qm = {'WITHHOLDING.RENT': True, 'RENT.PRIOR_ANNUAL_SUMMARY': True}
        elif is_neg:
            records = []
            summary = [field('rent.recipients', 'Perceptores', 0), field('rent.totalBase', 'Base total', money(0)), field('rent.totalWithholding', 'Retenciones', money(0))]
            qm = {'WITHHOLDING.RENT': False}
        elif is_complex:
            records = [
                [valid_cif(base_number + 301), 'ARRENDADOR A S.L.', 'AV DEMO 2, MADRID', 'RC-SYN-0101', money(24000), money(4560)],
                [valid_dni(20_000_000 + base_number), 'ARRENDADOR PERSONA B', 'CL ENSAYO 8, TOLEDO', 'RC-SYN-0102', money(9600), money(1824)],
                [valid_cif(base_number + 302), 'ARRENDADOR C S.L.', 'PZ MUESTRA 1, MADRID', 'RC-SYN-0103', money(7200), money(1368)],
            ]
            summary = [field('filing.substitute', 'Sustitutiva', 'SÍ'), field('rent.recipients', 'Perceptores', 3), field('rent.totalBase', 'Base total', money(40800)), field('rent.totalWithholding', 'Retenciones', money(7752))]
            qm = {'WITHHOLDING.RENT': True, 'RENT.PRIOR_ANNUAL_SUMMARY': True}
        else:
            records = [['[ANEXO AUSENTE]', '[ANEXO AUSENTE]', '[NO VISIBLE]', '[NO VISIBLE]', '[NO VISIBLE]', '[NO VISIBLE]']]
            summary = [field('rent.recipients', 'Perceptores', 2), field('rent.totalBase', 'Base total', money(26400)), field('rent.totalWithholding', 'Retenciones', money(5016))]
            qm = {'WITHHOLDING.RENT': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Resumen anual', 'sections': [section('Resumen', summary)]},
            {'pageTitle': 'Relación de perceptores e inmuebles', 'sections': [section('Detalle', table=table('rent.records', 'Arrendadores e inmuebles', ['NIF', 'Perceptor', 'Inmueble', 'Referencia', 'Base', 'Retención'], records))]},
        ]

    # 184
    elif family_id == 'AEAT_MODEL_184':
        period = 'ANUAL'
        if scenario == 'habitual':
            members = [[valid_dni(21_000_000 + base_number), 'COMUNERO UNO', '50,00%', money(22000), money(1800)], [valid_dni(22_000_000 + base_number), 'COMUNERO DOS', '50,00%', money(22000), money(1800)]]
            flds = [field('entity.type', 'Tipo de entidad', 'COMUNIDAD DE BIENES'), field('entity.activity', 'Actividad', 'Alquiler de local comercial'), field('entity.totalIncome', 'Renta atribuible', money(44000))]
            qm = {'ENTITY.INCOME_ATTRIBUTION': True, 'ENTITY.MEMBERS': 2}
        elif is_neg:
            members = [[valid_dni(23_000_000 + base_number), 'COMUNERO ÚNICO A EFECTOS DE PRUEBA', '100,00%', money(0), money(0)]]
            flds = [field('entity.type', 'Tipo de entidad', 'HERENCIA YACENTE'), field('entity.activity', 'Actividad', 'Sin actividad económica en el ejercicio'), field('entity.totalIncome', 'Renta atribuible', money(0))]
            qm = {'ENTITY.INCOME_ATTRIBUTION': True, 'ENTITY.MEMBERS': 1}
        elif is_complex:
            members = [
                [valid_dni(24_000_000 + base_number), 'SOCIO A', '40,00%', money(36000), money(4200)],
                [valid_dni(25_000_000 + base_number), 'SOCIO B', '35,00%', money(31500), money(3675)],
                [valid_dni(26_000_000 + base_number), 'SOCIO C', '25,00%', money(22500), money(2625)],
            ]
            flds = [field('filing.complementary', 'Complementaria', 'SÍ'), field('entity.type', 'Tipo de entidad', 'SOCIEDAD CIVIL EN ATRIBUCIÓN'), field('entity.activities', 'Actividades', 'Consultoría + arrendamiento'), field('entity.totalIncome', 'Renta atribuible', money(90000)), field('entity.totalWithholding', 'Retenciones atribuibles', money(10500))]
            qm = {'ENTITY.INCOME_ATTRIBUTION': True, 'ENTITY.MEMBERS': 3}
        else:
            members = [['[PÁGINA AUSENTE]', '[PÁGINA AUSENTE]', '[NO VISIBLE]', '[NO VISIBLE]', '[NO VISIBLE]']]
            flds = [field('entity.type', 'Tipo de entidad', 'COMUNIDAD DE BIENES'), field('entity.totalIncome', 'Renta atribuible', money(38000))]
            qm = {'ENTITY.INCOME_ATTRIBUTION': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Datos de la entidad', 'sections': [section('Entidad y actividad', flds)]},
            {'pageTitle': 'Miembros y rentas atribuidas', 'sections': [section('Detalle de miembros', table=table('entity.members', 'Socios, herederos, comuneros o partícipes', ['NIF', 'Miembro', 'Participación', 'Renta', 'Retenciones'], members))]},
        ]

    # 190
    elif family_id == 'AEAT_MODEL_190':
        period = 'ANUAL'
        if scenario == 'habitual':
            records = [[valid_dni(30_000_000 + base_number), 'TRABAJADOR UNO', 'A', '01', money(28000), money(3100)], [valid_dni(31_000_000 + base_number), 'TRABAJADOR DOS', 'A', '01', money(24000), money(2450)]]
            flds = [field('withholding.recipients', 'Perceptores', 2), field('withholding.totalIncome', 'Percepciones', money(52000)), field('withholding.total', 'Retenciones', money(5550))]
            qm = {'WITHHOLDING.EMPLOYEES': True, 'WITHHOLDING.PROFESSIONALS_PAID': False}
        elif is_neg:
            records = []
            flds = [field('withholding.recipients', 'Perceptores', 0), field('withholding.totalIncome', 'Percepciones', money(0)), field('withholding.total', 'Retenciones', money(0))]
            qm = {'WITHHOLDING.EMPLOYEES': False, 'WITHHOLDING.PROFESSIONALS_PAID': False}
        elif is_complex:
            records = [
                [valid_dni(32_000_000 + base_number), 'TRABAJADOR A', 'A', '01', money(35000), money(4200)],
                [valid_dni(33_000_000 + base_number), 'PROFESIONAL B', 'G', '01', money(18000), money(2700)],
                [valid_dni(34_000_000 + base_number), 'ADMINISTRADOR C', 'E', '01', money(30000), money(5700)],
            ]
            flds = [field('filing.complementary', 'Complementaria', 'SÍ'), field('withholding.recipients', 'Perceptores', 3), field('withholding.totalIncome', 'Percepciones', money(83000)), field('withholding.total', 'Retenciones', money(12600))]
            qm = {'WITHHOLDING.EMPLOYEES': True, 'WITHHOLDING.PROFESSIONALS_PAID': True, 'WITHHOLDING.ADMINISTRATORS': True}
        else:
            records = [['[DETALLE AUSENTE]', '[DETALLE AUSENTE]', '[?]', '[?]', '[NO VISIBLE]', '[NO VISIBLE]']]
            flds = [field('withholding.recipients', 'Perceptores', 3), field('withholding.totalIncome', 'Percepciones', money(61000)), field('withholding.total', 'Retenciones', money(8900))]
            qm = {'WITHHOLDING.EMPLOYEES': 'NEEDS_KEY_SUBKEY_DETAIL', 'WITHHOLDING.PROFESSIONALS_PAID': 'NEEDS_KEY_SUBKEY_DETAIL'}
        pages = [
            {'pageTitle': 'Resumen anual', 'sections': [section('Totales', flds)]},
            {'pageTitle': 'Perceptores', 'sections': [section('Detalle por clave y subclave', table=table('withholding.records', 'Perceptores', ['NIF', 'Perceptor', 'Clave', 'Subclave', 'Percepción', 'Retención'], records))]},
        ]

    # 193
    elif family_id == 'AEAT_MODEL_193':
        period = 'ANUAL'
        if scenario == 'habitual':
            records = [[valid_dni(35_000_000 + base_number), 'PERCEPTOR INTERESES', 'B', '01', money(5000), money(950)]]
            flds = [field('capital.recipients', 'Perceptores', 1), field('capital.totalIncome', 'Rendimientos', money(5000)), field('capital.totalWithholding', 'Retenciones', money(950))]
            qm = {'WITHHOLDING.CAPITAL': True}
        elif is_neg:
            records = []
            flds = [field('capital.recipients', 'Perceptores', 0), field('capital.totalIncome', 'Rendimientos', money(0)), field('capital.totalWithholding', 'Retenciones', money(0))]
            qm = {'WITHHOLDING.CAPITAL': False}
        elif is_complex:
            records = [
                [valid_dni(36_000_000 + base_number), 'PERCEPTOR A', 'B', '01', money(12000), money(2280)],
                [valid_cif(base_number + 450), 'ENTIDAD PERCEPTORA B', 'D', '02', money(24000), money(4560)],
                [valid_dni(37_000_000 + base_number), 'PERCEPTOR EN ESPECIE C', 'A', '03', money(6500), money(1235)],
            ]
            flds = [field('filing.substitute', 'Sustitutiva', 'SÍ'), field('capital.recipients', 'Perceptores', 3), field('capital.totalIncome', 'Rendimientos', money(42500)), field('capital.totalWithholding', 'Retenciones', money(8075))]
            qm = {'WITHHOLDING.CAPITAL': True}
        else:
            records = [['[ANEXO AUSENTE]', '[ANEXO AUSENTE]', '[?]', '[?]', '[NO VISIBLE]', '[NO VISIBLE]']]
            flds = [field('capital.recipients', 'Perceptores', 2), field('capital.totalIncome', 'Rendimientos', money(16000)), field('capital.totalWithholding', 'Retenciones', money(3040))]
            qm = {'WITHHOLDING.CAPITAL': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Resumen anual', 'sections': [section('Totales', flds)]},
            {'pageTitle': 'Perceptores', 'sections': [section('Detalle', table=table('capital.records', 'Perceptores de capital mobiliario', ['NIF', 'Perceptor', 'Clave', 'Naturaleza', 'Importe', 'Retención'], records))]},
        ]

    # 200
    elif family_id == 'AEAT_MODEL_200':
        period = 'ANUAL'
        if scenario == 'habitual':
            flds1 = [field('company.cnae', 'CNAE', '6202'), field('company.activity', 'Actividad principal', 'Consultoría informática'), field('company.turnover', 'Importe neto cifra de negocios', money(285000))]
            flds2 = [field('company.accountingResult', 'Resultado contable', money(54000)), field('company.taxBase', 'Base imponible', money(52000)), field('company.taxRate', 'Tipo de gravamen', '23%'), field('company.taxDue', 'Cuota íntegra', money(11960)), field('filing.result', 'Resultado a ingresar', money(3400))]
            qm = {'COMPANY.CORPORATE_TAX': True, 'COMPANY.PRIOR_MODEL_200_FILING': True}
        elif is_neg:
            flds1 = [field('company.cnae', 'CNAE', '7022'), field('company.activity', 'Actividad principal', 'Consultoría empresarial'), field('company.turnover', 'Importe neto cifra de negocios', money(90000))]
            flds2 = [field('company.accountingResult', 'Resultado contable', money(-22000)), field('company.taxBase', 'Base imponible', money(0)), field('company.taxDue', 'Cuota íntegra', money(0)), field('filing.result', 'Resultado', money(0))]
            qm = {'COMPANY.CORPORATE_TAX': True, 'COMPANY.PRIOR_MODEL_200_FILING': True}
        elif is_complex:
            flds1 = [field('filing.complementary', 'Rectificativa', 'SÍ'), field('company.cnae', 'CNAE', '6810 / 6201'), field('company.activities', 'Actividades', 'Inmobiliaria + software'), field('company.turnover', 'Importe neto cifra de negocios', money(1_450_000))]
            flds2 = [field('company.accountingResult', 'Resultado contable', money(310000)), field('company.permanentDifferences', 'Correcciones permanentes', money(42000)), field('company.temporaryDifferences', 'Correcciones temporarias', money(-18000)), field('company.taxBase', 'Base imponible', money(334000)), field('company.taxRate', 'Tipo de gravamen', '25%'), field('company.taxDue', 'Cuota íntegra', money(83500)), field('company.prepayments', 'Pagos fraccionados', money(72000)), field('filing.result', 'Resultado', money(11500))]
            qm = {'COMPANY.CORPORATE_TAX': True, 'COMPANY.PRIOR_MODEL_200_FILING': True}
        else:
            flds1 = [field('company.cnae', 'CNAE', '6202'), field('company.activity', 'Actividad principal', 'Consultoría informática'), field('company.turnover', 'Importe neto cifra de negocios', money(180000))]
            flds2 = [field('company.taxBase', 'Base imponible', '[PÁGINA DE LIQUIDACIÓN AUSENTE]'), field('filing.result', 'Resultado', '[NO VISIBLE]')]
            qm = {'COMPANY.CORPORATE_TAX': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Identificación y actividad', 'sections': [section('Entidad', flds1)]},
            {'pageTitle': 'Liquidación', 'sections': [section('Resultado fiscal', flds2)]},
        ]

    # 202
    elif family_id == 'AEAT_MODEL_202':
        period = '2P' if not is_complex else '3P'
        if scenario == 'habitual':
            flds = [field('company.paymentMethod', 'Modalidad', 'ARTÍCULO 40.2 LIS'), field('company.lastTaxDue', 'Cuota último periodo', money(18000)), field('company.percentage', 'Porcentaje', '18%'), field('filing.result', 'Pago fraccionado', money(3240))]
            qm = {'COMPANY.PRIOR_MODEL_202_FILING': True}
        elif is_neg:
            flds = [field('company.paymentMethod', 'Modalidad', 'ARTÍCULO 40.2 LIS'), field('company.lastTaxDue', 'Cuota último periodo', money(0)), field('filing.result', 'Pago fraccionado', money(0))]
            qm = {'COMPANY.PRIOR_MODEL_202_FILING': True}
        elif is_complex:
            flds = [field('company.paymentMethod', 'Modalidad', 'ARTÍCULO 40.3 LIS'), field('company.currentTaxBase', 'Base imponible del periodo', money(420000)), field('company.percentage', 'Porcentaje', '17%'), field('company.bonuses', 'Bonificaciones y retenciones', money(8500)), field('company.previousPayments', 'Pagos anteriores', money(42000)), field('filing.result', 'Pago fraccionado', money(20900))]
            qm = {'COMPANY.PRIOR_MODEL_202_FILING': True}
        else:
            flds = [field('company.paymentMethod', 'Modalidad', '[NO VISIBLE]'), field('company.currentTaxBase', 'Base imponible', '[PÁGINA DE DATOS ADICIONALES AUSENTE]'), field('filing.result', 'Resultado', money(6600))]
            qm = {'COMPANY.PRIOR_MODEL_202_FILING': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Pago fraccionado', 'sections': [section('Cálculo', flds)]}]

    # 216
    elif family_id == 'AEAT_MODEL_216':
        period = '3T' if not is_complex else '12'
        if scenario == 'habitual':
            flds = [field('nonresident.recipients', 'Número de rentas', 1), field('nonresident.incomeType', 'Tipo de renta', 'CÁNONES'), field('nonresident.country', 'País', 'FRANCIA'), field('nonresident.base', 'Base', money(10000)), field('nonresident.withholding', 'Retención', money(1900)), field('filing.result', 'Resultado', money(1900))]
            qm = {'WITHHOLDING.NON_RESIDENTS': True}
        elif is_neg:
            flds = [field('nonresident.recipients', 'Número de rentas', 0), field('nonresident.base', 'Base', money(0)), field('nonresident.withholding', 'Retención', money(0)), field('filing.result', 'Resultado', money(0))]
            qm = {'WITHHOLDING.NON_RESIDENTS': False}
        elif is_complex:
            flds = [field('nonresident.recipients', 'Número de rentas', 4), field('nonresident.incomeTypes', 'Tipos de renta', 'Cánones; servicios; intereses'), field('nonresident.countries', 'Países', 'FR; DE; US'), field('nonresident.exemptBase', 'Rentas exentas', money(12000)), field('nonresident.taxableBase', 'Rentas sujetas', money(35000)), field('nonresident.withholding', 'Retención', money(4375)), field('filing.result', 'Resultado', money(4375))]
            qm = {'WITHHOLDING.NON_RESIDENTS': True}
        else:
            flds = [field('nonresident.recipients', 'Número de rentas', 2), field('nonresident.incomeType', 'Tipo de renta', '[ILEGIBLE]'), field('nonresident.country', 'País', '[NO VISIBLE]'), field('nonresident.base', 'Base', money(14000)), field('filing.result', 'Resultado', '[BORROSO]')]
            qm = {'WITHHOLDING.NON_RESIDENTS': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Retenciones de no residentes', 'sections': [section('Rentas y retenciones', flds)]}]

    # 296
    elif family_id == 'AEAT_MODEL_296':
        period = 'ANUAL'
        if scenario == 'habitual':
            records = [['FR', 'FRSYN00001', 'PERCEPTOR FRANCÉS', 'CÁNONES', money(10000), '19%', money(1900)]]
            flds = [field('nonresident.recipients', 'Perceptores', 1), field('nonresident.totalBase', 'Base total', money(10000)), field('nonresident.totalWithholding', 'Retenciones', money(1900))]
            qm = {'WITHHOLDING.NON_RESIDENTS': True}
        elif is_neg:
            records = []
            flds = [field('nonresident.recipients', 'Perceptores', 0), field('nonresident.totalBase', 'Base total', money(0)), field('nonresident.totalWithholding', 'Retenciones', money(0))]
            qm = {'WITHHOLDING.NON_RESIDENTS': False}
        elif is_complex:
            records = [
                ['FR', 'FRSYN00002', 'PERCEPTOR A', 'CÁNONES', money(22000), '19%', money(4180)],
                ['DE', 'DESYN00003', 'PERCEPTOR B', 'INTERESES EXENTOS', money(15000), '0%', money(0)],
                ['US', 'USSYN00004', 'PERCEPTOR C', 'SERVICIOS', money(30000), '10%', money(3000)],
            ]
            flds = [field('filing.complementary', 'Complementaria', 'SÍ'), field('nonresident.recipients', 'Perceptores', 3), field('nonresident.totalBase', 'Base total', money(67000)), field('nonresident.totalWithholding', 'Retenciones', money(7180))]
            qm = {'WITHHOLDING.NON_RESIDENTS': True}
        else:
            records = [['[PAÍS ILEGIBLE]', '[NIF AUSENTE]', '[ANEXO AUSENTE]', '[TIPO NO VISIBLE]', money(18000), '[?]', '[?]']]
            flds = [field('nonresident.recipients', 'Perceptores', 2), field('nonresident.totalBase', 'Base total', money(35000)), field('nonresident.totalWithholding', 'Retenciones', money(3800))]
            qm = {'WITHHOLDING.NON_RESIDENTS': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Resumen anual', 'sections': [section('Totales', flds)]},
            {'pageTitle': 'Perceptores no residentes', 'sections': [section('Detalle', table=table('nonresident.records', 'Perceptores', ['País', 'NIF', 'Perceptor', 'Renta', 'Base', 'Tipo', 'Retención'], records))]},
        ]

    # 308
    elif family_id == 'AEAT_MODEL_308':
        period = '2T'
        if scenario == 'habitual':
            flds = [field('vat.refundReason', 'Motivo de devolución', 'RECARGO DE EQUIVALENCIA - VENTAS A VIAJEROS'), field('vat.operations', 'Operaciones', 3), field('vat.refundRequested', 'Devolución solicitada', money(860)), field('bank.ibanMasked', 'Cuenta de abono', 'ES** **** **** **** 0012')]
            qm = {'VAT.SPECIAL_REFUND_308': True}
        elif is_neg:
            flds = [field('vat.refundReason', 'Motivo de devolución', 'SUJETO PASIVO OCASIONAL'), field('vat.operations', 'Operaciones', 0), field('vat.refundRequested', 'Devolución solicitada', money(0))]
            qm = {'VAT.SPECIAL_REFUND_308': True}
        elif is_complex:
            flds = [field('vat.refundReason', 'Motivo de devolución', 'RECARGO DE EQUIVALENCIA + ARTÍCULO 30 BIS'), field('vat.operations', 'Operaciones', 8), field('vat.taxableBase', 'Base acreditada', money(18500)), field('vat.refundRequested', 'Devolución solicitada', money(2380)), field('bank.ibanMasked', 'Cuenta de abono', 'ES** **** **** **** 1299'), field('filing.complementary', 'Rectificativa', 'SÍ')]
            qm = {'VAT.SPECIAL_REFUND_308': True}
        else:
            flds = [field('vat.refundReason', 'Motivo de devolución', '[NO VISIBLE]'), field('vat.operations', 'Operaciones', 4), field('vat.refundRequested', 'Devolución solicitada', money(1250)), field('bank.ibanMasked', 'Cuenta de abono', '[PÁGINA AUSENTE]')]
            qm = {'VAT.SPECIAL_REFUND_308': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Solicitud de devolución', 'sections': [section('Operación y devolución', flds)]}]

    # 309
    elif family_id == 'AEAT_MODEL_309':
        period = '3T'
        if scenario == 'habitual':
            flds = [field('vat.nonPeriodicReason', 'Supuesto', 'ADQUISICIÓN INTRACOMUNITARIA EN RECARGO DE EQUIVALENCIA'), field('eu.supplierVat', 'NIF-IVA proveedor', 'DE000000001'), field('vat.taxableBase', 'Base', money(12000)), field('vat.rate', 'Tipo', '21%'), field('vat.taxDue', 'Cuota', money(2520)), field('filing.result', 'Resultado', money(2520))]
            qm = {'VAT.NON_PERIODIC_309': True, 'EU.OPERATIONS': True}
        elif is_neg:
            flds = [field('vat.nonPeriodicReason', 'Supuesto', 'LIQUIDACIÓN NO PERIÓDICA'), field('vat.taxableBase', 'Base', money(0)), field('vat.taxDue', 'Cuota', money(0)), field('filing.result', 'Resultado', money(0))]
            qm = {'VAT.NON_PERIODIC_309': True}
        elif is_complex:
            flds = [field('vat.nonPeriodicReason', 'Supuestos', 'INVERSIÓN DEL SUJETO PASIVO + ADQUISICIÓN INTRACOMUNITARIA'), field('eu.supplierVat', 'NIF-IVA proveedor', 'FR000000002'), field('vat.intraBase', 'Base intracomunitaria', money(22000)), field('vat.reverseChargeBase', 'Base inversión sujeto pasivo', money(18000)), field('vat.taxDue', 'Cuota total', money(8400)), field('filing.result', 'Resultado', money(8400))]
            qm = {'VAT.NON_PERIODIC_309': True, 'EU.OPERATIONS': True, 'VAT.REVERSE_CHARGE': True}
        else:
            flds = [field('vat.nonPeriodicReason', 'Supuesto', '[CASILLA ILEGIBLE]'), field('vat.taxableBase', 'Base', money(14500)), field('vat.taxDue', 'Cuota', money(3045)), field('filing.result', 'Resultado', '[NO VISIBLE]')]
            qm = {'VAT.NON_PERIODIC_309': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'IVA no periódico', 'sections': [section('Operación', flds)]}]

    # 341
    elif family_id == 'AEAT_MODEL_341':
        period = '2T'
        if scenario == 'habitual':
            records = [['COMPRADOR AGRARIO A', valid_cif(base_number + 600), 'PRODUCTOS HORTÍCOLAS', money(18000), '12%', money(2160)]]
            flds = [field('agriculture.operations', 'Operaciones', 1), field('agriculture.totalCompensation', 'Compensación solicitada', money(2160))]
            qm = {'VAT.AGRICULTURE_COMPENSATION_REFUND': True, 'ACTIVITY.NATURE': 'AGRICULTURAL'}
        elif is_neg:
            records = []
            flds = [field('agriculture.operations', 'Operaciones', 0), field('agriculture.totalCompensation', 'Compensación solicitada', money(0))]
            qm = {'VAT.AGRICULTURE_COMPENSATION_REFUND': True}
        elif is_complex:
            records = [
                ['COMPRADOR A', valid_cif(base_number + 601), 'GANADO', money(32000), '10,5%', money(3360)],
                ['COMPRADOR B', valid_cif(base_number + 602), 'CEREAL', money(27000), '12%', money(3240)],
                ['COMPRADOR C', valid_cif(base_number + 603), 'PESCA', money(14500), '10,5%', money(1522.5)],
            ]
            flds = [field('agriculture.operations', 'Operaciones', 3), field('agriculture.totalCompensation', 'Compensación solicitada', money(8122.5)), field('filing.complementary', 'Rectificativa', 'SÍ')]
            qm = {'VAT.AGRICULTURE_COMPENSATION_REFUND': True, 'ACTIVITY.NATURE': ['AGRICULTURAL', 'LIVESTOCK', 'FISHING']}
        else:
            records = [['[COMPRADOR AUSENTE]', '[NIF AUSENTE]', 'CEREAL', money(21000), '12%', '[NO VISIBLE]']]
            flds = [field('agriculture.operations', 'Operaciones', 1), field('agriculture.totalCompensation', 'Compensación solicitada', '[BORROSO]')]
            qm = {'VAT.AGRICULTURE_COMPENSATION_REFUND': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Solicitud de reintegro', 'sections': [section('Resumen', flds)]},
            {'pageTitle': 'Operaciones', 'sections': [section('Detalle', table=table('agriculture.records', 'Adquirentes y productos', ['Adquirente', 'NIF', 'Producto', 'Base', '%', 'Compensación'], records))]},
        ]

    # 347
    elif family_id == 'AEAT_MODEL_347':
        period = 'ANUAL'
        if scenario == 'habitual':
            records = [[valid_cif(base_number + 700), 'CLIENTE PRINCIPAL S.L.', 'B', money(12500), money(3000), money(3500), money(3000), money(3000), 'NO']]
            flds = [field('thirdParties.records', 'Número de terceros', 1), field('thirdParties.total', 'Importe anual declarado', money(12500))]
            qm = {'THIRD_PARTIES.MODEL_347_CANDIDATE': True}
        elif is_neg:
            records = []
            flds = [field('thirdParties.records', 'Número de terceros', 0), field('thirdParties.total', 'Importe anual declarado', money(0))]
            qm = {'THIRD_PARTIES.MODEL_347_CANDIDATE': False}
        elif is_complex:
            records = [
                [valid_cif(base_number + 701), 'CLIENTE A S.L.', 'B', money(48000), money(12000), money(12000), money(12000), money(12000), 'SÍ'],
                [valid_cif(base_number + 702), 'PROVEEDOR B S.A.', 'A', money(33000), money(8000), money(9000), money(7000), money(9000), 'NO'],
                [valid_dni(40_000_000 + base_number), 'ARRENDADOR C', 'B', money(18000), money(4500), money(4500), money(4500), money(4500), 'INMUEBLE'],
            ]
            flds = [field('filing.complementary', 'Sustitutiva', 'SÍ'), field('thirdParties.records', 'Número de terceros', 3), field('thirdParties.total', 'Importe anual declarado', money(99000)), field('thirdParties.cashCollections', 'Cobros en metálico', money(7200))]
            qm = {'THIRD_PARTIES.MODEL_347_CANDIDATE': True}
        else:
            records = [['[DETALLE AUSENTE]', '[DETALLE AUSENTE]', '[?]', money(8800), '[NO VISIBLE]', '[NO VISIBLE]', '[NO VISIBLE]', '[NO VISIBLE]', '[?]']]
            flds = [field('thirdParties.records', 'Número de terceros', 2), field('thirdParties.total', 'Importe anual declarado', money(17300))]
            qm = {'THIRD_PARTIES.MODEL_347_CANDIDATE': 'NEEDS_COMPLETE_BOOKS_AND_EXCLUSIONS'}
        pages = [
            {'pageTitle': 'Resumen anual', 'sections': [section('Totales', flds)]},
            {'pageTitle': 'Operaciones con terceros', 'sections': [section('Detalle', table=table('thirdParties.detail', 'Terceros', ['NIF', 'Tercero', 'Clave', 'Anual', '1T', '2T', '3T', '4T', 'Especial'], records))]},
        ]

    # 349
    elif family_id == 'AEAT_MODEL_349':
        period = '2T' if not is_complex else '3T'
        if scenario == 'habitual':
            records = [['FR000000001', 'CLIENTE FRANCÉS', 'S', money(14000), '', '']]
            flds = [field('eu.operators', 'Operadores', 1), field('eu.total', 'Importe total', money(14000))]
            qm = {'EU.OPERATIONS': [{'type': 'SERVICES_SUPPLIED', 'country': 'FR'}]}
        elif is_neg:
            records = []
            flds = [field('eu.operators', 'Operadores', 0), field('eu.total', 'Importe total', money(0))]
            qm = {'EU.OPERATIONS': []}
        elif is_complex:
            records = [
                ['DE000000001', 'PROVEEDOR ALEMÁN', 'A', money(21000), '', ''],
                ['PT000000002', 'CLIENTE PORTUGUÉS', 'S', money(18500), '', ''],
                ['FR000000003', 'CLIENTE RECTIFICADO', 'S', money(-3500), '2025', '4T'],
            ]
            flds = [field('filing.rectifications', 'Rectificaciones', 'SÍ'), field('eu.operators', 'Operadores', 3), field('eu.total', 'Importe total', money(36000))]
            qm = {'EU.OPERATIONS': ['GOODS_ACQUIRED', 'SERVICES_SUPPLIED', 'RECTIFICATION']}
        else:
            records = [['[NIF-IVA ILEGIBLE]', 'OPERADOR UE', '[CLAVE AUSENTE]', money(9200), '', '']]
            flds = [field('eu.operators', 'Operadores', 1), field('eu.total', 'Importe total', money(9200))]
            qm = {'EU.OPERATIONS': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Resumen recapitulativo', 'sections': [section('Totales', flds)]},
            {'pageTitle': 'Operadores intracomunitarios', 'sections': [section('Detalle', table=table('eu.records', 'Operaciones', ['NIF-IVA', 'Operador', 'Clave', 'Importe', 'Ejercicio rect.', 'Periodo rect.'], records))]},
        ]

    # 369
    elif family_id == 'AEAT_MODEL_369':
        period = '2T' if not is_complex else '3T'
        if scenario == 'habitual':
            records = [['FR', 'SERVICIOS ELECTRÓNICOS', money(10000), '20%', money(2000)], ['DE', 'SERVICIOS ELECTRÓNICOS', money(8000), '19%', money(1520)]]
            flds = [field('oss.regime', 'Régimen', 'RÉGIMEN DE LA UNIÓN'), field('oss.countries', 'Estados de consumo', 2), field('oss.totalVat', 'IVA total', money(3520))]
            qm = {'ECOMMERCE.OSS_IOSS_OPERATIONS': True, 'ECOMMERCE.OSS_IOSS_REGIME': 'UNION'}
        elif is_neg:
            records = []
            flds = [field('oss.regime', 'Régimen', 'RÉGIMEN DE LA UNIÓN'), field('oss.countries', 'Estados de consumo', 0), field('oss.totalVat', 'IVA total', money(0)), field('filing.noOperations', 'Sin operaciones', 'SÍ')]
            qm = {'ECOMMERCE.OSS_IOSS_OPERATIONS': False}
        elif is_complex:
            records = [
                ['FR', 'VENTAS A DISTANCIA DE BIENES', money(32000), '20%', money(6400)],
                ['DE', 'SERVICIOS DIGITALES', money(24000), '19%', money(4560)],
                ['IT', 'VENTAS A DISTANCIA DE BIENES', money(18000), '22%', money(3960)],
                ['PT', 'CORRECCIÓN PERIODO ANTERIOR', money(-4000), '23%', money(-920)],
            ]
            flds = [field('oss.regime', 'Régimen', 'RÉGIMEN DE LA UNIÓN'), field('oss.countries', 'Estados de consumo', 4), field('oss.corrections', 'Correcciones', 'SÍ'), field('oss.totalVat', 'IVA total', money(14000))]
            qm = {'ECOMMERCE.OSS_IOSS_OPERATIONS': True, 'ECOMMERCE.OSS_IOSS_REGIME': 'UNION'}
        else:
            records = [['[PAÍS AUSENTE]', 'SERVICIOS DIGITALES', money(12000), '[TIPO ILEGIBLE]', '[CUOTA ILEGIBLE]']]
            flds = [field('oss.regime', 'Régimen', '[NO VISIBLE]'), field('oss.countries', 'Estados de consumo', 1), field('oss.totalVat', 'IVA total', '[BORROSO]')]
            qm = {'ECOMMERCE.OSS_IOSS_OPERATIONS': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Autoliquidación OSS/IOSS', 'sections': [section('Régimen y totales', flds)]},
            {'pageTitle': 'Operaciones por Estado miembro', 'sections': [section('Detalle', table=table('oss.records', 'Estados de consumo', ['País', 'Operación', 'Base', 'Tipo', 'Cuota'], records))]},
        ]

    # 714
    elif family_id == 'AEAT_MODEL_714':
        period = 'ANUAL'
        if scenario == 'habitual':
            assets = [['Inmuebles', money(650000), money(200000), money(450000)], ['Cuentas y depósitos', money(180000), money(0), money(180000)], ['Valores', money(240000), money(0), money(240000)]]
            flds = [field('wealth.totalAssets', 'Patrimonio bruto', money(1_070_000)), field('wealth.debts', 'Deudas deducibles', money(200000)), field('wealth.taxableBase', 'Base imponible', money(870000)), field('filing.result', 'Cuota a ingresar', money(1450))]
            qm = {'PERSONAL.WEALTH_TAX': True}
        elif is_neg:
            assets = [['Inmuebles', money(400000), money(150000), money(250000)], ['Cuentas', money(120000), money(0), money(120000)]]
            flds = [field('wealth.totalAssets', 'Patrimonio bruto', money(520000)), field('wealth.debts', 'Deudas deducibles', money(150000)), field('wealth.taxableBase', 'Base imponible', money(370000)), field('filing.result', 'Cuota a ingresar', money(0))]
            qm = {'PERSONAL.WEALTH_TAX': True}
        elif is_complex:
            assets = [
                ['Inmuebles', money(1_800_000), money(400000), money(1_400_000)],
                ['Empresa familiar exenta', money(950000), money(950000), money(0)],
                ['Valores', money(1_200_000), money(0), money(1_200_000)],
                ['Seguros y rentas', money(380000), money(0), money(380000)],
            ]
            flds = [field('wealth.totalAssets', 'Patrimonio bruto', money(4_330_000)), field('wealth.exemptAssets', 'Bienes exentos', money(950000)), field('wealth.debts', 'Deudas deducibles', money(400000)), field('wealth.taxableBase', 'Base imponible', money(2_980_000)), field('filing.result', 'Cuota a ingresar', money(19500))]
            qm = {'PERSONAL.WEALTH_TAX': True}
        else:
            assets = [['[ANEXO AUSENTE]', '[NO VISIBLE]', '[NO VISIBLE]', '[NO VISIBLE]']]
            flds = [field('wealth.totalAssets', 'Patrimonio bruto', money(1_240_000)), field('wealth.taxableBase', 'Base imponible', '[NO VISIBLE]'), field('filing.result', 'Cuota', '[PÁGINA AUSENTE]')]
            qm = {'PERSONAL.WEALTH_TAX': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Resumen patrimonial', 'sections': [section('Liquidación', flds)]},
            {'pageTitle': 'Categorías de bienes', 'sections': [section('Detalle', table=table('wealth.assets', 'Bienes y derechos', ['Categoría', 'Valor', 'Exento/deuda', 'Computable'], assets))]},
        ]

    # 720
    elif family_id == 'AEAT_MODEL_720':
        period = 'ANUAL'
        if scenario == 'habitual':
            records = [['C', 'FR', 'BANCO SINTÉTICO FR', 'TITULAR', '31/12/2025', money(86000), 'ALTA']]
            flds = [field('foreignAssets.records', 'Registros', 1), field('foreignAssets.categories', 'Categorías', 'CUENTAS'), field('foreignAssets.totalValue', 'Valor total informado', money(86000))]
            qm = {'PERSONAL.FOREIGN_ASSETS': True}
        elif is_neg:
            kind = 'SYNTHETIC_EMPTY_DRAFT'
            disposition = 'REVIEW_OR_REJECT'
            records = []
            flds = [field('foreignAssets.records', 'Registros', 0), field('filing.status', 'Estado', 'BORRADOR VACÍO')]
            qm = {'PERSONAL.FOREIGN_ASSETS': 'DO_NOT_INFER_FALSE_FROM_EMPTY_DRAFT'}
        elif is_complex:
            records = [
                ['C', 'FR', 'BANCO A', 'TITULAR', '31/12/2025', money(120000), 'ALTA'],
                ['V', 'LU', 'BROKER B', 'TITULAR REAL', '31/12/2025', money(240000), 'ALTA'],
                ['I', 'PT', 'INMUEBLE C', 'COPROPIETARIO 50%', '15/08/2025', money(180000), 'ALTA'],
                ['C', 'DE', 'BANCO D', 'AUTORIZADO', '30/06/2025', money(54000), 'CANCELACIÓN'],
            ]
            flds = [field('filing.complementary', 'Complementaria', 'SÍ'), field('foreignAssets.records', 'Registros', 4), field('foreignAssets.categories', 'Categorías', 'CUENTAS; VALORES; INMUEBLES'), field('foreignAssets.totalValue', 'Valor total informado', money(594000))]
            qm = {'PERSONAL.FOREIGN_ASSETS': True}
        else:
            records = [['C', '[PAÍS AUSENTE]', 'BANCO EXTRANJERO', 'TITULAR', '[FECHA ILEGIBLE]', '[VALOR ILEGIBLE]', 'ALTA']]
            flds = [field('foreignAssets.records', 'Registros', 1), field('foreignAssets.categories', 'Categorías', 'CUENTAS')]
            qm = {'PERSONAL.FOREIGN_ASSETS': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Resumen informativo', 'sections': [section('Totales', flds)]},
            {'pageTitle': 'Bienes y derechos en el extranjero', 'sections': [section('Detalle', table=table('foreignAssets.detail', 'Registros', ['Clave', 'País', 'Entidad/bien', 'Condición', 'Fecha', 'Valor', 'Estado'], records))]},
        ]

    # 721
    elif family_id == 'AEAT_MODEL_721':
        period = 'ANUAL'
        if scenario == 'habitual':
            records = [['BTC', 'SINTÉTIC EXCHANGE AG', 'CH', 'TITULAR', '1,25000000', money(72500)]]
            flds = [field('foreignCrypto.records', 'Registros', 1), field('foreignCrypto.totalValue', 'Valor total', money(72500))]
            qm = {'PERSONAL.FOREIGN_CRYPTO': True}
        elif is_neg:
            kind = 'SYNTHETIC_EMPTY_DRAFT'
            disposition = 'REVIEW_OR_REJECT'
            records = []
            flds = [field('foreignCrypto.records', 'Registros', 0), field('filing.status', 'Estado', 'BORRADOR VACÍO')]
            qm = {'PERSONAL.FOREIGN_CRYPTO': 'DO_NOT_INFER_FALSE_FROM_EMPTY_DRAFT'}
        elif is_complex:
            records = [
                ['BTC', 'EXCHANGE A', 'CH', 'TITULAR', '2,40000000', money(139000)],
                ['ETH', 'CUSTODIO B', 'US', 'BENEFICIARIO', '18,00000000', money(54000)],
                ['USDC', 'CUSTODIO C', 'SG', 'TITULAR REAL', '35000,00000000', money(35000)],
            ]
            flds = [field('filing.complementary', 'Complementaria', 'SÍ'), field('foreignCrypto.records', 'Registros', 3), field('foreignCrypto.totalValue', 'Valor total', money(228000))]
            qm = {'PERSONAL.FOREIGN_CRYPTO': True}
        else:
            records = [['BTC', '[CUSTODIO AUSENTE]', '[PAÍS AUSENTE]', 'TITULAR', '0,85000000', '[VALOR ILEGIBLE]']]
            flds = [field('foreignCrypto.records', 'Registros', 1)]
            qm = {'PERSONAL.FOREIGN_CRYPTO': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Resumen informativo', 'sections': [section('Totales', flds)]},
            {'pageTitle': 'Monedas virtuales en el extranjero', 'sections': [section('Detalle', table=table('foreignCrypto.detail', 'Registros', ['Moneda', 'Custodio', 'País', 'Condición', 'Unidades', 'Valor'], records))]},
        ]

    # 840
    elif family_id == 'AEAT_MODEL_840':
        temporal = 'CURRENT_AS_OF_EFFECTIVE_DATE'
        period = None
        if scenario == 'habitual':
            flds = [field('iae.action', 'Tipo de declaración', 'ALTA'), field('iae.epigraph', 'Grupo o epígrafe', '849.7'), field('iae.activity', 'Actividad', 'Servicios de gestión administrativa'), field('iae.quotaType', 'Tipo de cuota', 'MUNICIPAL'), field('iae.municipality', 'Municipio', 'MADRID'), field('iae.effectiveDate', 'Fecha de efectos', '01/01/2026')]
            qm = {'IAE.STATUS': 'REGISTERED', 'ACTIVITY.LIST': ['849.7']}
        elif is_neg:
            flds = [field('iae.action', 'Tipo de declaración', 'BAJA'), field('iae.epigraph', 'Grupo o epígrafe', '653.2'), field('iae.activity', 'Actividad', 'Comercio menor de aparatos'), field('iae.effectiveDate', 'Fecha de efectos', '31/03/2026'), field('iae.reason', 'Motivo', 'CESE')]
            qm = {'IAE.STATUS': 'DEREGISTERED'}
        elif is_complex:
            flds = [field('iae.action', 'Tipo de declaración', 'VARIACIÓN'), field('iae.epigraph', 'Grupo o epígrafe', '765'), field('iae.activity', 'Actividad', 'Espectáculos y servicios audiovisuales'), field('iae.quotaType', 'Tipo de cuota', 'PROVINCIAL'), field('iae.effectiveDate', 'Fecha de efectos', '15/06/2026'), field('iae.premises', 'Locales', 3), field('iae.surface', 'Superficie computable', '365 m²')]
            qm = {'IAE.STATUS': 'MODIFIED', 'ACTIVITY.PREMISES': 3}
        else:
            flds = [field('iae.action', 'Tipo de declaración', 'ALTA'), field('iae.epigraph', 'Grupo o epígrafe', '[ILEGIBLE]'), field('iae.activity', 'Actividad', '[PÁGINA ANEXA AUSENTE]'), field('iae.effectiveDate', 'Fecha de efectos', '[NO VISIBLE]')]
            qm = {'IAE.STATUS': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Declaración de IAE', 'sections': [section('Actividad y efectos', flds)]}]
        if is_complex:
            pages.append({'pageTitle': 'Anexo de locales', 'sections': [section('Locales', table=table('iae.premisesDetail', 'Relación de locales', ['Dirección', 'Municipio', 'Superficie'], [['CL SINTÉTICA 1', 'MADRID', '120 m²'], ['CL SINTÉTICA 2', 'ALCALÁ', '95 m²'], ['AV SINTÉTICA 3', 'GETAFE', '150 m²']]))]})

    # Current census certificate
    elif family_id == 'AEAT_CERT_CURRENT_CENSUS_STATUS':
        temporal = 'CURRENT_AS_OF_DATE'
        period = None
        if scenario == 'habitual':
            flds = [field('certificate.issueDate', 'Fecha de expedición', '10/07/2026'), field('census.status', 'Situación', 'ALTA'), field('census.activities', 'Actividades', 'Consultoría informática - IAE 763'), field('irpf.method', 'IRPF', 'ESTIMACIÓN DIRECTA SIMPLIFICADA'), field('vat.regime', 'IVA', 'RÉGIMEN GENERAL'), field('census.periodicObligations', 'Obligaciones periódicas', '130 TRIMESTRAL; 303 TRIMESTRAL'), field('certificate.csv', 'CSV', 'CSV-SYN-CENSO-0001')]
            qm = {'CENSUS.CURRENT_STATUS': 'ACTIVE', 'IRPF.METHOD': 'DIRECT_SIMPLIFIED', 'VAT.REGIMES': ['GENERAL'], 'CENSUS.PERIODIC_OBLIGATIONS': ['130', '303']}
        elif is_neg:
            flds = [field('certificate.issueDate', 'Fecha de expedición', '10/07/2026'), field('census.status', 'Situación', 'SIN ALTA EN ACTIVIDADES ECONÓMICAS'), field('census.activities', 'Actividades', 'NINGUNA'), field('census.periodicObligations', 'Obligaciones periódicas', 'NINGUNA'), field('certificate.csv', 'CSV', 'CSV-SYN-CENSO-0002')]
            qm = {'CENSUS.CURRENT_STATUS': 'INACTIVE', 'CENSUS.PERIODIC_OBLIGATIONS': []}
        elif is_complex:
            flds = [field('certificate.issueDate', 'Fecha de expedición', '11/07/2026'), field('census.status', 'Situación', 'ALTA'), field('census.activities', 'Actividades', 'Arquitectura IAE 411; comercio electrónico IAE 665'), field('activity.premises', 'Locales', '2 locales afectos'), field('irpf.method', 'IRPF', 'DIRECTA NORMAL'), field('vat.regime', 'IVA', 'GENERAL + RECARGO DE EQUIVALENCIA'), field('eu.roi', 'ROI', 'ALTA DESDE 15/02/2026'), field('vat.sii', 'SII', 'INCLUIDO'), field('census.periodicObligations', 'Obligaciones periódicas', '130; 303 MENSUAL; 111; 115'), field('certificate.csv', 'CSV', 'CSV-SYN-CENSO-0003')]
            qm = {'CENSUS.CURRENT_STATUS': 'ACTIVE', 'ACTIVITY.LIST': ['411', '665'], 'VAT.REGIMES': ['GENERAL', 'RECHARGE_EQUIVALENCE'], 'EU.ROI': 'REGISTERED', 'VAT.SII': True, 'CENSUS.PERIODIC_OBLIGATIONS': ['130', '303', '111', '115']}
        else:
            flds = [field('certificate.issueDate', 'Fecha de expedición', '12/07/2026'), field('census.status', 'Situación', 'ALTA'), field('census.activities', 'Actividades', '[SEGUNDA PÁGINA AUSENTE]'), field('census.periodicObligations', 'Obligaciones periódicas', '[NO VISIBLE]'), field('certificate.csv', 'CSV', '[RECORTADO]')]
            qm = {'CENSUS.CURRENT_STATUS': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Certificación de situación censal', 'sections': [section('Datos certificados', flds)]}]

    # TGSS current status
    elif family_id == 'TGSS_REPORT_CURRENT_STATUS':
        temporal = 'CURRENT_AS_OF_DATE'
        period = None
        nuss = f'28/{base_number:08d}/99'
        if scenario == 'habitual':
            flds = [field('tgss.issueDate', 'Fecha de emisión', '10/07/2026'), field('tgss.nussMasked', 'NUSS/NAF', nuss, True), field('tgss.regime', 'Régimen', 'RETA'), field('tgss.status', 'Situación actual', 'ALTA'), field('tgss.startDate', 'Fecha de alta', '01/03/2024')]
            qm = {'IRPF.RETA_PERIODS': [{'from': '01/03/2024', 'to': None}], 'RETA.CURRENT_STATUS': 'ACTIVE'}
        elif is_neg:
            flds = [field('tgss.issueDate', 'Fecha de emisión', '10/07/2026'), field('tgss.nussMasked', 'NUSS/NAF', nuss, True), field('tgss.regime', 'Régimen', 'RETA'), field('tgss.status', 'Situación actual', 'BAJA'), field('tgss.endDate', 'Fecha de baja', '30/04/2026')]
            qm = {'RETA.CURRENT_STATUS': 'INACTIVE'}
        elif is_complex:
            flds = [field('tgss.issueDate', 'Fecha de emisión', '11/07/2026'), field('tgss.nussMasked', 'NUSS/NAF', nuss, True), field('tgss.status', 'Situaciones actuales', 'RETA ALTA + RÉGIMEN GENERAL ALTA'), field('tgss.retaStart', 'Alta RETA', '15/01/2023'), field('tgss.generalStart', 'Alta régimen general', '01/06/2026')]
            qm = {'RETA.CURRENT_STATUS': 'ACTIVE', 'IRPF.RETA_PERIODS': [{'from': '15/01/2023', 'to': None}]}
        else:
            flds = [field('tgss.issueDate', 'Fecha de emisión', '[NO VISIBLE]'), field('tgss.nussMasked', 'NUSS/NAF', nuss, True), field('tgss.regime', 'Régimen', 'RETA'), field('tgss.status', 'Situación actual', '[BORROSO]')]
            qm = {'RETA.CURRENT_STATUS': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Situación laboral actual', 'sections': [section('Datos de afiliación', flds)]}]

    # Vida laboral
    elif family_id == 'TGSS_REPORT_EMPLOYMENT_HISTORY':
        temporal = 'HISTORICAL_AND_CURRENT'
        period = None
        if scenario == 'habitual':
            records = [['RETA', 'TRABAJO AUTÓNOMO', '01/02/2023', '', '1.261'], ['GENERAL', 'EMPRESA SINTÉTICA A', '01/01/2018', '31/01/2023', '1.856']]
            flds = [field('tgss.issueDate', 'Fecha de emisión', '10/07/2026'), field('tgss.totalDays', 'Días totales de alta', '3.117')]
            qm = {'IRPF.RETA_PERIODS': [{'from': '01/02/2023', 'to': None}]}
        elif is_neg:
            records = [['GENERAL', 'EMPRESA SINTÉTICA B', '01/05/2020', '', '2.263']]
            flds = [field('tgss.issueDate', 'Fecha de emisión', '10/07/2026'), field('tgss.totalDays', 'Días totales de alta', '2.263')]
            qm = {'IRPF.RETA_PERIODS': []}
        elif is_complex:
            records = [
                ['GENERAL', 'EMPRESA A', '01/01/2016', '31/12/2019', '1.461'],
                ['RETA', 'TRABAJO AUTÓNOMO', '01/01/2020', '30/06/2021', '547'],
                ['GENERAL', 'EMPRESA B', '15/06/2021', '31/12/2022', '565'],
                ['RETA', 'TRABAJO AUTÓNOMO', '01/01/2023', '', '1.288'],
            ]
            flds = [field('tgss.issueDate', 'Fecha de emisión', '11/07/2026'), field('tgss.totalDays', 'Días totales de alta', '3.861'), field('tgss.overlap', 'Solapamiento', '15/06/2021 - 30/06/2021')]
            qm = {'IRPF.RETA_PERIODS': [{'from': '01/01/2020', 'to': '30/06/2021'}, {'from': '01/01/2023', 'to': None}]}
        else:
            records = [['RETA', 'TRABAJO AUTÓNOMO', '01/01/2025', '[ÚLTIMA PÁGINA AUSENTE]', '[NO VISIBLE]']]
            flds = [field('tgss.issueDate', 'Fecha de emisión', '12/07/2026'), field('tgss.totalDays', 'Días totales de alta', '[NO VISIBLE]')]
            qm = {'IRPF.RETA_PERIODS': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Resumen de vida laboral', 'sections': [section('Resumen', flds)]},
            {'pageTitle': 'Situaciones de alta y baja', 'sections': [section('Periodos', table=table('tgss.periods', 'Vida laboral', ['Régimen', 'Empresa/situación', 'Alta', 'Baja', 'Días'], records))]},
        ]

    # TGSS activities
    elif family_id == 'TGSS_REPORT_SELF_EMPLOYED_ACTIVITIES':
        temporal = 'CURRENT_AS_OF_DATE'
        period = None
        if scenario == 'habitual':
            records = [['6202', 'Actividades de consultoría informática', '01/03/2024', 'ACTIVA']]
            flds = [field('tgss.issueDate', 'Fecha de emisión', '10/07/2026'), field('tgss.activityCount', 'Actividades comunicadas', 1)]
            qm = {'ACTIVITY.LIST_TGSS': ['6202']}
        elif is_neg:
            records = []
            flds = [field('tgss.issueDate', 'Fecha de emisión', '10/07/2026'), field('tgss.activityCount', 'Actividades comunicadas', 0), field('tgss.status', 'Situación', 'SIN ACTIVIDADES ACTUALES')]
            qm = {'ACTIVITY.LIST_TGSS': []}
        elif is_complex:
            records = [['6201', 'Programación informática', '01/01/2023', 'ACTIVA'], ['4791', 'Comercio por Internet', '15/02/2026', 'ACTIVA'], ['7022', 'Consultoría de gestión', '01/06/2024', 'ACTIVA']]
            flds = [field('tgss.issueDate', 'Fecha de emisión', '11/07/2026'), field('tgss.activityCount', 'Actividades comunicadas', 3)]
            qm = {'ACTIVITY.LIST_TGSS': ['6201', '4791', '7022']}
        else:
            records = [['[CÓDIGO RECORTADO]', 'Comercio electrónico', '[NO VISIBLE]', 'ACTIVA']]
            flds = [field('tgss.issueDate', 'Fecha de emisión', '12/07/2026'), field('tgss.activityCount', 'Actividades comunicadas', '[CAPTURA PARCIAL]')]
            qm = {'ACTIVITY.LIST_TGSS': 'NEEDS_CONFIRMATION'}
        pages = [
            {'pageTitle': 'Actividades comunicadas en trabajo autónomo', 'sections': [section('Resumen', flds), section('Actividades', table=table('tgss.activities', 'Actividades', ['Código', 'Descripción', 'Inicio', 'Estado'], records))]},
        ]

    # ROI cert
    elif family_id == 'AEAT_CERT_ROI':
        temporal = 'CURRENT_AS_OF_DATE'
        period = None
        if scenario == 'habitual':
            flds = [field('certificate.issueDate', 'Fecha de expedición', '10/07/2026'), field('roi.status', 'Situación en ROI', 'INSCRITO'), field('roi.startDate', 'Fecha de alta', '15/02/2024'), field('roi.vatNumber', 'NIF-IVA', f'ES{nif}'), field('certificate.csv', 'CSV', 'CSV-SYN-ROI-0001')]
            qm = {'EU.ROI': 'REGISTERED'}
        elif is_neg:
            flds = [field('certificate.issueDate', 'Fecha de expedición', '10/07/2026'), field('roi.status', 'Situación en ROI', 'NO INSCRITO'), field('certificate.csv', 'CSV', 'CSV-SYN-ROI-0002')]
            qm = {'EU.ROI': 'NOT_REGISTERED'}
        elif is_complex:
            flds = [field('certificate.issueDate', 'Fecha de expedición', '11/07/2026'), field('roi.status', 'Situación en ROI', 'BAJA ACTUAL'), field('roi.startDate', 'Fecha de alta histórica', '01/06/2022'), field('roi.endDate', 'Fecha de baja', '31/03/2026'), field('roi.vatNumber', 'NIF-IVA', f'ES{nif}'), field('certificate.csv', 'CSV', 'CSV-SYN-ROI-0003')]
            qm = {'EU.ROI': 'HISTORICAL_DEREGISTERED'}
        else:
            flds = [field('certificate.issueDate', 'Fecha de expedición', '[NO VISIBLE]'), field('roi.status', 'Situación en ROI', 'INSCRITO'), field('roi.startDate', 'Fecha de alta', '[BORROSO]'), field('certificate.csv', 'CSV', '[RECORTADO]')]
            qm = {'EU.ROI': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Certificación de operador intracomunitario', 'sections': [section('Datos certificados', flds)]}]

    # landlord exemption certificate
    elif family_id == 'AEAT_CERT_LANDLORD_WITHHOLDING_EXEMPTION':
        temporal = 'CURRENT_AS_OF_DATE_OR_PERIOD'
        period = None
        if scenario == 'habitual':
            flds = [field('certificate.issueDate', 'Fecha de expedición', '10/07/2026'), field('rentExemption.status', 'Exoneración de retención', 'ACREDITADA'), field('rentExemption.validForYear', 'Ejercicio de validez', '2026'), field('rentExemption.scope', 'Alcance', 'ARRENDAMIENTO DE INMUEBLES URBANOS'), field('certificate.csv', 'CSV', 'CSV-SYN-ARR-0001')]
            qm = {'WITHHOLDING.RENT.EXEMPTION': True}
        elif is_neg:
            flds = [field('certificate.issueDate', 'Fecha de expedición', '10/07/2026'), field('rentExemption.status', 'Exoneración de retención', 'NO ACREDITADA'), field('rentExemption.validForYear', 'Ejercicio consultado', '2026'), field('certificate.csv', 'CSV', 'CSV-SYN-ARR-0002')]
            qm = {'WITHHOLDING.RENT.EXEMPTION': False}
        elif is_complex:
            flds = [field('certificate.issueDate', 'Fecha de expedición', '11/07/2026'), field('rentExemption.status', 'Exoneración de retención', 'ACREDITADA'), field('rentExemption.validFrom', 'Validez desde', '01/01/2026'), field('rentExemption.validTo', 'Validez hasta', '31/12/2026'), field('rentExemption.scope', 'Alcance', 'IAE GRUPO 861 - INMUEBLES URBANOS'), field('rentExemption.observations', 'Observaciones', 'Válida para el arrendador identificado; comprobar coincidencia del NIF'), field('certificate.csv', 'CSV', 'CSV-SYN-ARR-0003')]
            qm = {'WITHHOLDING.RENT.EXEMPTION': True}
        else:
            flds = [field('certificate.issueDate', 'Fecha de expedición', '12/07/2026'), field('rentExemption.status', 'Exoneración de retención', 'ACREDITADA'), field('rentExemption.validForYear', 'Ejercicio de validez', '[NO VISIBLE]'), field('certificate.csv', 'CSV', '[RECORTADO]')]
            qm = {'WITHHOLDING.RENT.EXEMPTION': 'NEEDS_CONFIRMATION'}
        pages = [{'pageTitle': 'Certificación de exoneración', 'sections': [section('Datos certificados', flds)]}]

    else:
        raise KeyError(family_id)

    # Incomplete documents intentionally remove the final page for multi-page families,
    # unless the content is already single-page. The missing-page condition is reflected
    # in the fields and manifest; we keep at least one page so classification remains possible.
    if is_incomplete and len(pages) > 1:
        pages = pages[:-1]

    return {
        'fiscalYear': year,
        'period': period,
        'documentKind': kind,
        'temporalScope': temporal,
        'expectedDisposition': disposition,
        'complete': complete,
        'questionMappings': qm,
        'mustNotInfer': common_must_not_infer(family_id),
        'notes': notes,
        'pages': pages,
    }


# --- PDF rendering ---------------------------------------------------------
PAGE_W, PAGE_H = A4
MARGIN_X = 16 * mm
TOP_MARGIN = 34 * mm
BOTTOM_MARGIN = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN_X
CONTENT_H = PAGE_H - TOP_MARGIN - BOTTOM_MARGIN

styles = getSampleStyleSheet()
STYLE_PAGE_TITLE = ParagraphStyle('PageTitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=13, leading=15, textColor=colors.HexColor('#333333'), spaceAfter=6)
STYLE_SECTION = ParagraphStyle('SectionTitle', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=8.5, leading=10, textColor=colors.HexColor('#7A1F1F'), spaceBefore=4, spaceAfter=3)
STYLE_CELL = ParagraphStyle('Cell', parent=styles['BodyText'], fontName='Helvetica', fontSize=6.6, leading=8, alignment=TA_LEFT)
STYLE_CELL_BOLD = ParagraphStyle('CellBold', parent=STYLE_CELL, fontName='Helvetica-Bold')
STYLE_NOTE = ParagraphStyle('Note', parent=styles['BodyText'], fontName='Helvetica-Oblique', fontSize=6.4, leading=8, textColor=colors.HexColor('#555555'))
STYLE_META = ParagraphStyle('Meta', parent=STYLE_CELL, fontSize=6.8, leading=8)


def ptext(value: Any, bold: bool = False) -> Paragraph:
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    text = escape(str(value)).replace('\n', '<br/>')
    return Paragraph(text, STYLE_CELL_BOLD if bold else STYLE_CELL)


def draw_header_footer(c, doc, fixture: dict[str, Any]) -> None:
    c.saveState()
    authority = fixture['authority']
    if authority == 'TGSS':
        primary = colors.HexColor('#155A8A')
        secondary = colors.HexColor('#E8F2F8')
        authority_name = 'TESORERÍA GENERAL DE LA SEGURIDAD SOCIAL'
    else:
        primary = colors.HexColor('#8B1E1E')
        secondary = colors.HexColor('#F5EAEA')
        authority_name = 'AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA'
    c.setFillColor(primary)
    c.rect(0, PAGE_H - 20 * mm, PAGE_W, 20 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(MARGIN_X, PAGE_H - 8 * mm, authority_name)
    c.setFont('Helvetica-Bold', 16)
    c.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 9 * mm, fixture['code'])
    c.setFont('Helvetica', 6.8)
    c.drawString(MARGIN_X, PAGE_H - 14 * mm, fixture['familyTitle'])
    c.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 14 * mm, f"Página {c.getPageNumber()}")

    # Synthetic banner.
    c.setFillColor(secondary)
    c.rect(0, PAGE_H - 25 * mm, PAGE_W, 5 * mm, fill=1, stroke=0)
    c.setFillColor(primary)
    c.setFont('Helvetica-Bold', 7)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 23.2 * mm, 'FACSIMIL SINTÉTICO - SIN VALIDEZ - NO PRESENTABLE')

    # Diagonal watermark.
    c.saveState()
    try:
        c.setFillAlpha(0.09)
    except Exception:
        pass
    c.setFillColor(colors.HexColor('#C62828'))
    c.translate(PAGE_W / 2, PAGE_H / 2)
    c.rotate(32)
    c.setFont('Helvetica-Bold', 30)
    c.drawCentredString(0, 0, 'DOCUMENTO SINTÉTICO')
    c.restoreState()

    # Footer.
    c.setStrokeColor(colors.HexColor('#AAAAAA'))
    c.line(MARGIN_X, 12 * mm, PAGE_W - MARGIN_X, 12 * mm)
    c.setFillColor(colors.HexColor('#555555'))
    c.setFont('Helvetica', 5.8)
    c.drawString(MARGIN_X, 8 * mm, f"{fixture['fixtureId']} - NO PRESENTABLE - datos totalmente sintéticos")
    c.drawRightString(PAGE_W - MARGIN_X, 8 * mm, fixture['visualVariant'])
    c.restoreState()


def render_native_pdf(fixture: dict[str, Any], out_path: Path) -> None:
    frame = Frame(MARGIN_X, BOTTOM_MARGIN, CONTENT_W, CONTENT_H, id='normal')
    doc = BaseDocTemplate(str(out_path), pagesize=A4, leftMargin=MARGIN_X, rightMargin=MARGIN_X,
                          topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
                          title=fixture['displayName'], author='Corpus sintético')
    doc.addPageTemplates([PageTemplate(id='main', frames=[frame], onPage=lambda c, d: draw_header_footer(c, d, fixture))])

    story: list[Any] = []
    for page_idx, page in enumerate(fixture['pages'], start=1):
        story.append(Paragraph(escape(page['pageTitle']), STYLE_PAGE_TITLE))
        if page_idx == 1:
            meta_rows = [
                [ptext('NIF', True), ptext(fixture['taxpayerNif']), ptext('Titular / entidad', True), ptext(fixture['taxpayerName'])],
                [ptext('Ejercicio', True), ptext(fixture['fiscalYear'] if fixture['fiscalYear'] is not None else 'N/A'), ptext('Periodo', True), ptext(fixture['period'] or 'N/A')],
                [ptext('Tipo documental', True), ptext(fixture['documentKind']), ptext('Estado esperado', True), ptext(fixture['expectedDisposition'])],
            ]
            mt = Table(meta_rows, colWidths=[25*mm, 35*mm, 31*mm, CONTENT_W-91*mm])
            mt.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#999999')),
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F2F2F2')),
                ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#F2F2F2')),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 3), ('RIGHTPADDING', (0,0), (-1,-1), 3),
                ('TOPPADDING', (0,0), (-1,-1), 3), ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ]))
            story += [mt, Spacer(1, 5)]
        for sec in page.get('sections', []):
            story.append(Paragraph(escape(sec['title']), STYLE_SECTION))
            if sec.get('fields'):
                rows = []
                for fld in sec['fields']:
                    rows.append([ptext(fld['label'], True), ptext(fld.get('value'))])
                ft = Table(rows, colWidths=[55*mm, CONTENT_W-55*mm], repeatRows=0)
                ft.setStyle(TableStyle([
                    ('GRID', (0,0), (-1,-1), 0.35, colors.HexColor('#AFAFAF')),
                    ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F7F7F7')),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('LEFTPADDING', (0,0), (-1,-1), 3), ('RIGHTPADDING', (0,0), (-1,-1), 3),
                    ('TOPPADDING', (0,0), (-1,-1), 2.5), ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
                ]))
                story += [ft, Spacer(1, 4)]
            if sec.get('table'):
                tbl = sec['table']
                data = [[ptext(h, True) for h in tbl['headers']]]
                for row in tbl['rows']:
                    data.append([ptext(v) for v in row])
                ncols = max(1, len(tbl['headers']))
                col_widths = [CONTENT_W / ncols] * ncols
                lt = LongTable(data, colWidths=col_widths, repeatRows=1)
                lt.setStyle(TableStyle([
                    ('GRID', (0,0), (-1,-1), 0.35, colors.HexColor('#999999')),
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EDEDED')),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('LEFTPADDING', (0,0), (-1,-1), 2), ('RIGHTPADDING', (0,0), (-1,-1), 2),
                    ('TOPPADDING', (0,0), (-1,-1), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                ]))
                story += [lt, Spacer(1, 4)]
            if sec.get('note'):
                story.append(Paragraph(escape(sec['note']), STYLE_NOTE))
        if page_idx < len(fixture['pages']):
            story.append(PageBreak())
    doc.build(story)


def pdf_to_page_images(pdf_path: Path, dpi: int = 120) -> list[Image.Image]:
    doc = fitz.open(pdf_path)
    images: list[Image.Image] = []
    matrix = fitz.Matrix(dpi / 72.0, dpi / 72.0)
    for page in doc:
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        images.append(img)
    doc.close()
    return images


def image_pages_to_pdf(images: list[Image.Image], out_path: Path, quality: int = 60) -> None:
    # Save via Pillow to preserve page images; each page is raster-only.
    rgb = [im.convert('RGB') for im in images]
    rgb[0].save(out_path, 'PDF', resolution=120.0, save_all=True, append_images=rgb[1:], quality=quality)


def make_scan_variant(native_pdf: Path, out_path: Path, seed: int) -> None:
    rnd = random.Random(seed)
    pages = pdf_to_page_images(native_pdf, dpi=118)
    out: list[Image.Image] = []
    for img in pages:
        gray = ImageOps.grayscale(img)
        gray = ImageEnhance.Contrast(gray).enhance(0.92)
        gray = gray.filter(ImageFilter.GaussianBlur(radius=0.35))
        arr = np.array(gray).astype(np.int16)
        noise = np.random.default_rng(seed + len(out)).normal(0, 2.2, arr.shape)
        arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
        noisy = Image.fromarray(arr, mode='L').convert('RGB')
        # Simulate faint scanner edge.
        draw = ImageDraw.Draw(noisy)
        if rnd.random() < 0.7:
            x = rnd.randint(0, 5)
            draw.line([(x, 0), (x, noisy.height)], fill=(205,205,205), width=2)
        out.append(noisy)
    image_pages_to_pdf(out, out_path, quality=52)


def make_rotated_variant(native_pdf: Path, out_path: Path, seed: int) -> None:
    rnd = random.Random(seed)
    pages = pdf_to_page_images(native_pdf, dpi=112)
    out: list[Image.Image] = []
    for img in pages:
        angle = rnd.choice([-1.7, -1.2, 1.1, 1.6])
        canvas_img = Image.new('RGB', img.size, 'white')
        rotated = img.rotate(angle, resample=Image.Resampling.BICUBIC, expand=False, fillcolor='white')
        # Small crop/shift resembling a phone capture.
        dx = rnd.randint(-10, 10); dy = rnd.randint(-8, 8)
        canvas_img.paste(rotated, (dx, dy))
        canvas_img = ImageEnhance.Contrast(canvas_img).enhance(0.96)
        canvas_img = canvas_img.filter(ImageFilter.GaussianBlur(radius=0.15))
        out.append(canvas_img)
    image_pages_to_pdf(out, out_path, quality=64)


def build_field_evidence(fixture: dict[str, Any]) -> list[dict[str, Any]]:
    evidence = [
        {'fieldId': 'taxpayer.nif', 'page': 1, 'label': 'NIF', 'value': fixture['taxpayerNif']},
        {'fieldId': 'taxpayer.name', 'page': 1, 'label': 'Titular / entidad', 'value': fixture['taxpayerName']},
        {'fieldId': 'document.type', 'page': 1, 'label': 'Tipo documental', 'value': fixture['documentType']},
        {'fieldId': 'document.code', 'page': 1, 'label': 'Código / modelo', 'value': fixture['code']},
    ]
    for pno, page in enumerate(fixture['pages'], start=1):
        for sec in page.get('sections', []):
            for fld in sec.get('fields', []):
                evidence.append({'fieldId': fld['fieldId'], 'page': pno, 'label': fld['label'], 'value': fld.get('value')})
            if sec.get('table'):
                tbl = sec['table']
                evidence.append({'fieldId': tbl['fieldId'], 'page': pno, 'label': tbl['title'], 'value': tbl['rows']})
    return evidence


def write_manifest(fixture: dict[str, Any], pdf_rel: str, sha: str, expected_pages: int) -> dict[str, Any]:
    expected_fields = {
        'taxpayer.nif': fixture['taxpayerNif'],
        'taxpayer.name': fixture['taxpayerName'],
        'document.code': fixture['code'],
        'document.fiscalYear': fixture['fiscalYear'],
        'document.period': fixture['period'],
    }
    expected_fields.update(flatten_expected(fixture['pages']))
    manifest = {
        'schemaVersion': SCHEMA_VERSION,
        'generatorVersion': GENERATOR_VERSION,
        'fixtureId': fixture['fixtureId'],
        'baseFixtureId': fixture['baseFixtureId'],
        'semanticScenario': fixture['semanticScenario'],
        'documentType': fixture['documentType'],
        'displayName': fixture['displayName'],
        'synthetic': True,
        'notValidForFiling': True,
        'containsRealPersonalData': False,
        'documentKind': fixture['documentKind'],
        'fiscalYear': fixture['fiscalYear'],
        'period': fixture['period'],
        'expectedPages': expected_pages,
        'visualVariant': fixture['visualVariant'],
        'temporalScope': fixture['temporalScope'],
        'completeDocument': fixture['complete'],
        'expectedDisposition': fixture['expectedDisposition'],
        'expectedFields': expected_fields,
        'expectedQuestionMappings': fixture['questionMappings'],
        'mustNotInfer': fixture['mustNotInfer'],
        'fieldEvidence': build_field_evidence(fixture),
        'missingOrAmbiguousFields': [e['fieldId'] for e in build_field_evidence(fixture) if isinstance(e.get('value'), str) and any(tok in e['value'] for tok in ('AUSENTE','ILEGIBLE','NO VISIBLE','BORROSO','RECORTADO','PARCIAL'))],
        'sourceTemplate': {
            'authority': fixture['authority'],
            'templateStatus': 'synthetic-facsimile-based-on-official-fields-and-instructions',
            'officialSources': fixture['officialSources'],
            'liveServiceGenerated': False,
        },
        'notes': fixture['notes'] + [
            'El documento es un facsímil sintético y no una salida validada por el servicio oficial.',
            'Las variantes visuales derivan del mismo caso semántico y comparten verdad esperada.',
        ],
        'pdfFile': pdf_rel,
        'sha256': sha,
    }
    return manifest



def valid_existing_pdf(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 1000:
        return False
    try:
        d = fitz.open(path)
        ok = d.page_count > 0
        d.close()
        return ok
    except Exception:
        return False

def generate_all() -> list[dict[str, Any]]:
    inventory: list[dict[str, Any]] = []
    base_counter = 0
    for family_id, fam in FAMILIES.items():
        for scenario in SCENARIOS:
            base_counter += 1
            nif, name = identity_for(family_id, base_counter)
            content = content_for(family_id, scenario, base_counter, nif, name)
            base_fixture_id = f"{family_id.lower()}_{scenario}_{base_counter:03d}"
            base_fixture_id = base_fixture_id.replace('aeat_', '').replace('tgss_', '')
            base_fixture_id = base_fixture_id.replace('__', '_')
            fixture_common = {
                'baseFixtureId': base_fixture_id,
                'semanticScenario': scenario,
                'documentType': family_id,
                'displayName': f"{fam['code']} - {fam['title']} - {scenario}",
                'authority': fam['authority'],
                'code': fam['code'],
                'familyTitle': fam['title'],
                'officialSources': fam['sources'],
                'taxpayerNif': nif,
                'taxpayerName': name,
                **content,
            }

            # Native base.
            native_id = f'{base_fixture_id}__native'
            native_path = BASE_DIR / f'{native_id}.pdf'
            native_fixture = {**fixture_common, 'fixtureId': native_id, 'visualVariant': 'NATIVE_TEXT_PDF'}
            if not valid_existing_pdf(native_path):
                render_native_pdf(native_fixture, native_path)
            ndoc = fitz.open(native_path); native_pages = ndoc.page_count; ndoc.close()
            nsha = hashlib.sha256(native_path.read_bytes()).hexdigest()
            nman = write_manifest(native_fixture, str(native_path.relative_to(ROOT)), nsha, native_pages)
            (MAN_DIR / f'{native_id}.json').write_text(json.dumps(nman, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            inventory.append(nman)

            # Scanned/compressed variant.
            scan_id = f'{base_fixture_id}__scan_compressed'
            scan_path = SCAN_DIR / f'{scan_id}.pdf'
            if not valid_existing_pdf(scan_path):
                if scan_path.exists(): scan_path.unlink()
                make_scan_variant(native_path, scan_path, base_counter * 17)
            sdoc = fitz.open(scan_path); scan_pages = sdoc.page_count; sdoc.close()
            ssha = hashlib.sha256(scan_path.read_bytes()).hexdigest()
            scan_fixture = {**fixture_common, 'fixtureId': scan_id, 'visualVariant': 'RASTER_SCAN_COMPRESSED'}
            sman = write_manifest(scan_fixture, str(scan_path.relative_to(ROOT)), ssha, scan_pages)
            (MAN_DIR / f'{scan_id}.json').write_text(json.dumps(sman, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            inventory.append(sman)

            # Rotated capture variant.
            rot_id = f'{base_fixture_id}__rotated_capture'
            rot_path = ROT_DIR / f'{rot_id}.pdf'
            if not valid_existing_pdf(rot_path):
                if rot_path.exists(): rot_path.unlink()
                make_rotated_variant(native_path, rot_path, base_counter * 29)
            rdoc = fitz.open(rot_path); rot_pages = rdoc.page_count; rdoc.close()
            rsha = hashlib.sha256(rot_path.read_bytes()).hexdigest()
            rot_fixture = {**fixture_common, 'fixtureId': rot_id, 'visualVariant': 'RASTER_ROTATED_CAPTURE'}
            rman = write_manifest(rot_fixture, str(rot_path.relative_to(ROOT)), rsha, rot_pages)
            (MAN_DIR / f'{rot_id}.json').write_text(json.dumps(rman, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            inventory.append(rman)

    return inventory


def make_montage(inventory: list[dict[str, Any]]) -> None:
    selected = [m for m in inventory if m['semanticScenario'] == 'habitual' and m['visualVariant'] == 'NATIVE_TEXT_PDF']
    thumbs = []
    for man in selected:
        pdf = ROOT / man['pdfFile']
        doc = fitz.open(pdf)
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(0.75, 0.75), alpha=False)
        img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        doc.close()
        img.thumbnail((240, 340))
        card = Image.new('RGB', (260, 385), 'white')
        card.paste(img, ((260-img.width)//2, 8))
        draw = ImageDraw.Draw(card)
        label = man['documentType'].replace('AEAT_', '').replace('TGSS_', '')
        draw.text((8, 352), label[:36], fill='black')
        draw.text((8, 368), man['fixtureId'][:38], fill='black')
        thumbs.append(card)
    cols = 5
    rows = math.ceil(len(thumbs) / cols)
    montage = Image.new('RGB', (cols*260, rows*385), (230,230,230))
    for i, im in enumerate(thumbs):
        montage.paste(im, ((i%cols)*260, (i//cols)*385))
    montage.save(QA_DIR / 'QA_MONTAGE_29_FAMILIES.jpg', quality=88)


def write_indexes(inventory: list[dict[str, Any]]) -> None:
    corpus = {
        'schemaVersion': SCHEMA_VERSION,
        'generatorVersion': GENERATOR_VERSION,
        'createdAt': '2026-07-15',
        'status': 'GENERATED_PENDING_VALIDATION',
        'scope': '29 pending families for the autonomous tax-profile document reader',
        'families': len(FAMILIES),
        'semanticBaseFixtures': len(FAMILIES) * len(SCENARIOS),
        'visualVariantsPerBase': len(VISUALS),
        'totalPdfFixtures': len(inventory),
        'fixtures': [
            {
                'fixtureId': m['fixtureId'],
                'baseFixtureId': m['baseFixtureId'],
                'documentType': m['documentType'],
                'semanticScenario': m['semanticScenario'],
                'visualVariant': m['visualVariant'],
                'pdf': m['pdfFile'],
                'manifest': f"manifests/{m['fixtureId']}.json",
                'sha256': m['sha256'],
                'expectedDisposition': m['expectedDisposition'],
            }
            for m in inventory
        ],
    }
    (ROOT / 'corpus-manifest.json').write_text(json.dumps(corpus, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    cols = ['fixtureId','baseFixtureId','documentType','semanticScenario','visualVariant','fiscalYear','period','expectedPages','expectedDisposition','completeDocument','pdfFile','sha256']
    with (ROOT / 'corpus-inventory.csv').open('w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for m in inventory:
            w.writerow({k: m.get(k) for k in cols})

    with (ROOT / 'family-coverage.csv').open('w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['documentType','code','authority','semanticCases','visualVariants','expectedPdfCount','officialSources'])
        for fid, fam in FAMILIES.items():
            w.writerow([fid, fam['code'], fam['authority'], ';'.join(SCENARIOS), ';'.join(VISUALS), len(SCENARIOS)*len(VISUALS), ' | '.join(fam['sources'])])


def write_docs() -> None:
    readme = f"""# Corpus sintético ampliado - 29 familias pendientes

Este paquete amplía el corpus del motor de perfil fiscal con las **29 familias que no estaban cubiertas**.

## Volumen

- Familias: **{len(FAMILIES)}**
- Casos semánticos por familia: **4**
- PDF base nativos: **{len(FAMILIES)*4}**
- Variantes visuales por base: **2** adicionales
- PDF totales: **{len(FAMILIES)*4*3}**

Cada familia contiene:

1. Caso habitual positivo.
2. Caso negativo, vacío o de resultado cero.
3. Caso complejo, complementario o con varios registros.
4. Caso incompleto o ambiguo que debe pasar a revisión o rechazo.

Cada caso semántico se entrega como:

- PDF con capa de texto nativa.
- Escaneo rasterizado y comprimido.
- Captura rasterizada ligeramente girada.

## Advertencias

- Ningún documento procede de un contribuyente real.
- Ningún PDF ha sido presentado, validado o generado por el servicio vivo de la AEAT o la TGSS.
- Son facsímiles sintéticos basados en nombres de campos, instrucciones, diseños de registro y descripciones oficiales.
- Todos muestran la marca **DOCUMENTO SINTÉTICO - SIN VALIDEZ - NO PRESENTABLE**.
- Los casos vacíos de modelos como 720 y 721 están etiquetados como borradores; no permiten inferir que no existe obligación.

## Estructura

- `pdfs/native/`: {len(FAMILIES)*4} PDF base con texto nativo.
- `pdfs/scan_compressed/`: degradaciones OCR rasterizadas.
- `pdfs/rotated_capture/`: capturas rasterizadas y giradas.
- `manifests/`: verdad esperada individual para los {len(FAMILIES)*4*3} PDF.
- `corpus-manifest.json`: índice completo.
- `corpus-inventory.csv`: inventario tabular.
- `family-coverage.csv`: matriz de cobertura.
- `VALIDATION_REPORT.md`: validación estructural y visual.
- `qa/QA_MONTAGE_29_FAMILIES.jpg`: control visual de una muestra por familia.
- `tools/`: generador y validador reproducibles.

## Integración

El campo `expectedDisposition` diferencia:

- `ACCEPT_WITH_SYNTHETIC_LIMITATION`: el lector debe poder clasificar y extraer los campos esperados.
- `REVIEW_OR_REJECT`: el lector debe detectar que faltan datos o páginas y no cerrar preguntas críticas.

`mustNotInfer` contiene las conclusiones que el sistema tiene prohibido producir a partir del documento.
"""
    (ROOT / 'README.md').write_text(readme, encoding='utf-8')

    limitations = """# Fuentes y limitaciones

## Naturaleza del corpus

Los PDF son facsímiles sintéticos. Reproducen títulos, campos y estructuras funcionales necesarias para probar clasificación, extracción, normalización, mapeo al test e inferencias prohibidas.

No reproducen necesariamente con exactitud milimétrica la salida de todos los servicios web oficiales. Las salidas reales anonimizadas de AEAT/TGSS deben incorporarse después como una capa adicional de validación.

## Fuentes

Cada manifiesto incluye `sourceTemplate.officialSources` con páginas oficiales de AEAT, TGSS o documentos de diseño/instrucciones.

## Privacidad

Los nombres, NIF, referencias, importes y cuentas son sintéticos. Los documentos no contienen datos personales reales ni deben utilizarse para presentación.
"""
    (ROOT / 'SOURCE_AND_LIMITATIONS.md').write_text(limitations, encoding='utf-8')

    guide = """# Guía de importación para Codex

1. Importa primero `corpus-manifest.json`.
2. Registra cada `documentType` como familia ya conocida por el extractor.
3. Ejecuta clasificación sobre los 348 PDF.
4. Para PDF nativos, compara `expectedFields` y `fieldEvidence`.
5. Para variantes rasterizadas, ejecuta OCR y compara la misma verdad semántica.
6. Los casos `REVIEW_OR_REJECT` no deben generar respuestas seguras ni omitir preguntas del test.
7. Valida `mustNotInfer` como pruebas negativas obligatorias.
8. No ajustes un extractor para un fixture sin añadir una prueba de regresión para las otras variantes de la familia.

La ruta del PDF está en `pdfFile`; la relación entre visuales se realiza mediante `baseFixtureId`.
"""
    (ROOT / 'IMPORT_GUIDE_CODEX.md').write_text(guide, encoding='utf-8')


if __name__ == '__main__':
    inventory = generate_all()
    write_indexes(inventory)
    write_docs()
    make_montage(inventory)
    print(f'Generated {len(inventory)} PDFs across {len(FAMILIES)} families in {ROOT}')
