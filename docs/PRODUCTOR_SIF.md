# Guía del productor del SIF (tú como creador del software)

Esta guía es para **quien desarrolla y comercializa** Factura Autónomo, no para el autónomo que lo usa para facturar.

## ¿Hay que registrarse en Hacienda?

**No.** No existe un registro oficial de “software homologado”. El mecanismo es la **declaración responsable** (autocertificación) del **productor**, según:

- [RD 1007/2023](https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840) — Reglamento de requisitos de sistemas de facturación
- [Orden HAC/1177/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138) — Especificaciones técnicas
- [FAQ AEAT — Declaración responsable](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/certificacion-sistemas-informaticos-declaracion-responsable.html)

Hacienda **no aprueba** el programa de antemano. Tú declaras que cumple; Hacienda **verifica después** (QR, remisiones, inspecciones).

## ¿Tienes que ser una empresa (SL)?

**No obligatoriamente.** Puede ser:

- **Autónomo** (persona física con NIF y actividad de desarrollo/comercialización)
- **Sociedad** (SL, SA…) — habitual si vendes SaaS a escala

Lo necesario: **NIF/CIF**, domicilio, y asumir la **responsabilidad legal** como productor.

## Qué debes hacer como productor

### 1. Figura legal y fiscal

- [ ] Alta como autónomo o constitución de sociedad
- [ ] Epígrafe/ actividad coherente (desarrollo software, SaaS, comercio electrónico)
- [ ] Capacidad de facturar licencias/suscripciones a clientes

### 2. Identificación en el software (verificación in situ)

Configura en **Vercel** (o `.env.local`):

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_NIF` | **Sí** | Tu NIF/CIF como productor |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_NAME` | **Sí** | Tu nombre o razón social |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_ADDRESS` | **Sí** | Dirección postal (art. 15.j) |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_CITY` | **Sí** | Localidad (art. 15.l) |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_COUNTRY` | No | Default: España |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL` | Recomendado | Contacto (anexo art. 15.2.a) |
| `NEXT_PUBLIC_APP_URL` | Recomendado | URL del producto (anexo art. 15.2.b) |
| `NEXT_PUBLIC_VERIFACTU_SYSTEM_ID` | No | Código corto del SIF (default: `FA`) |
| `NEXT_PUBLIC_VERIFACTU_INSTALLATION_ID` | **Sí** | Identificador estable de instalación del SIF |
| `NEXT_PUBLIC_APP_VERSION` | **Sí** | Versión mostrada en declaración |

Visible para el usuario en **Configuración → Veri*Factu** y en `/legal/declaracion-responsable`.

### 3. Declaración responsable (art. 15)

Debe incluir, **en este orden**, los apartados **a–l**:

| Letra | Contenido |
|-------|-----------|
| a | Nombre del sistema |
| b | Código identificador (`FA`) |
| c | Versión completa |
| d | Componentes HW/SW y funcionalidades |
| e | ¿Solo VERI*FACTU exclusivo? |
| f | ¿Varios obligados tributarios? |
| g | Tipos de firma (si no VERI*FACTU) |
| h | Nombre/razón social productor |
| i | NIF productor |
| j | Dirección postal productor |
| k | Texto de cumplimiento LGT + RD 1007/2023 + HAC/1177/2024 |
| l | Fecha y lugar |

La app genera este documento en:

- **UI:** `/legal/declaracion-responsable`
- **API:** `GET /api/verifactu/declaration`

Debe estar **dentro del producto**, accesible de forma rápida e intuitiva, y disponible al adquirir/usar el software.

### 4. Cumplimiento técnico VERI*FACTU

| Requisito | Estado en Factura Autónomo |
|-----------|----------------------------|
| Huella SHA-256 spec AEAT v0.1.2 | ✅ Implementado + tests vectores oficiales |
| QR tributario en factura | ✅ Implementado |
| Registro encadenado | ✅ Implementado |
| TipoFactura F1/R1/R4 | ✅ Implementado |
| Encabezado emisor congelado al emitir | ✅ Implementado |
| Sin borrado de facturas emitidas | ✅ Implementado |
| Verificación in situ | ✅ Parcial (falta NIF real en prod) |
| XML registro según XSD AEAT | ⚠️ Aproximado; falta alineación XSD completa |
| Remisión real a AEAT | ⚠️ Simulada sin certificado |
| Registro de eventos | ❌ Pendiente |
| Comprobación de cadena bajo demanda | ✅ En Configuración → Veri*Factu |

Detalle técnico: `docs/VERIFACTU.md`.

### 5. Pruebas antes de comercializar

- [ ] Configurar **todas** las variables de productor (no dejar `PENDIENTE-NIF`)
- [ ] Emitir factura de prueba y validar QR en https://prewww2.aeat.es
- [ ] Revisar declaración responsable generada (campos a–l completos)
- [ ] (Opcional) Certificado FNMT o sello + remisión en prewww10
- [ ] Asesoría fiscal si vendes a terceros (responsabilidad art. 201.bis LGT)

### 6. Comercialización

Si **vendes** el software (no solo lo usas tú):

- Desde **28 julio 2025**, el comercializador debe asegurarse de que el SIF tiene declaración responsable del fabricante
- Debes **actualizar la declaración** en cada versión relevante del producto
- Proporcionar el documento al cliente en la adquisición (onboarding, email, o enlace en la app)

## Cómo “lo da por bueno” Hacienda

```text
Tú implementas + declaras  →  Usuario factura  →  Hacienda verifica (QR, datos, inspección)
                                                      ↓
                                            Si falla: responsabilidad productor/usuario
```

No hay sello previo. La conformidad se demuestra con:

1. Declaración responsable correcta y accesible
2. Comportamiento técnico alineado (hash, QR, trazabilidad, remisión si aplica)
3. Pruebas en entornos oficiales AEAT

## Enlaces oficiales

| Recurso | URL |
|---------|-----|
| Portal desarrolladores | https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU.html |
| FAQ declaración responsable | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/certificacion-sistemas-informaticos-declaracion-responsable.html |
| Spec huella v0.1.2 | https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf |
| Orden HAC/1177/2024 (BOE) | https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138 |

## Checklist rápido antes de producción comercial

1. Tu NIF/CIF y domicilio en variables de entorno
2. Declaración responsable revisada en `/legal/declaracion-responsable`
3. Tests `npm test` en verde (incl. vectores huella AEAT)
4. QR validado en preproducción AEAT
5. Textos legales (`/legal/terminos`, `/legal/privacidad`) revisados con asesoría
6. Plan de cierre de gaps (eventos, remisión real, XSD)
