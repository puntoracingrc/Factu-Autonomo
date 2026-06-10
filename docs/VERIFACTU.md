# Veri*Factu — guía de despliegue

## Qué incluye la app

- Registro encadenado (huella SHA-256 **spec AEAT v0.1.2**) por factura emitida
- QR tributario en PDF según especificación AEAT
- XML de registro de facturación (alta / anulación)
- API `/api/verifactu/register` (con cuenta Supabase)
- Declaración responsable en `/legal/declaracion-responsable`
- Pantalla de verificación in situ en **Configuración → Veri*Factu**

## Documentación oficial AEAT (desarrolladores)

| Recurso | URL |
|---------|-----|
| Portal Veri\*Factu / SIF | https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU.html |
| Spec huella hash **v0.1.2** (PDF) | https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf |
| FAQ huella hash | https://www3.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/huella-hash.html |
| FAQ procedimientos facturación (F1, R1, R4…) | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/procedimientos-facturacion.html |
| FAQ empresas de desarrollo (dic 2025) | Portal desarrolladores → documentación Veri\*Factu |

## Algoritmo de huella (v0.1.2)

**Registro de alta** — campos concatenados en orden:

`IDEmisorFactura`, `NumSerieFactura`, `FechaExpedicionFactura`, `TipoFactura`, `CuotaTotal`, `ImporteTotal`, `Huella` (anterior), `FechaHoraHusoGenRegistro`

**Registro de anulación** — campos distintos:

`IDEmisorFacturaAnulada`, `NumSerieFacturaAnulada`, `FechaExpedicionFacturaAnulada`, `Huella`, `FechaHoraHusoGenRegistro`

Reglas: SHA-256 → hex **mayúsculas** (64 caracteres); formato `campo=valor&campo2=valor2`; trim en valores; huella anterior vacía → `Huella=`; UTF-8 sin BOM.

Los tests unitarios validan los **tres vectores oficiales** del Anexo II de la spec.

### TipoFactura en esta app

| Documento | Código |
|-----------|--------|
| Factura ordinaria | F1 |
| Rectificativa por anulación (art. 80) | R1 |
| Otras rectificativas | R4 |

Las rectificativas se registran como **alta** (no como `RegistroAnulacion`). El registro de anulación AEAT es para revocar un registro ya remitido al SIF.

## SQL en Supabase

Ejecuta `supabase/verifactu.sql` en el SQL Editor (después de `schema.sql`).

## Variables de entorno (Vercel)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_NIF` | Sí (producción) | NIF del productor del SIF |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_NAME` | No | Nombre del productor (default: Factura Autónomo) |
| `VERIFACTU_ENVIRONMENT` | No | `test` (default) o `production` |
| `VERIFACTU_AEAT_SUBMIT` | No | `true` para intentar remisión real |
| `VERIFACTU_CERT_P12_BASE64` | Solo remisión real | Certificado P12 en base64 |
| `VERIFACTU_CERT_PASSWORD` | Solo remisión real | Contraseña del P12 |

Sin certificado, la app genera registros en **modo pruebas** (QR apunta a `prewww2.aeat.es`).

## Certificado recomendado

- **Autónomo:** certificado de persona física FNMT (gratis)
- **Automático en servidor:** certificado de sello de empresa (Camerfirma ~250 €/año)

## Entornos AEAT

- Validación QR pruebas: https://prewww2.aeat.es
- Web Services pruebas: https://prewww10.aeat.es
- Portal preproducción: https://preportal.aeat.es

## Renovación certificados AEAT (nov 2025)

Si integras remisión real, revisa que tu servidor confíe en las nuevas CA ROOT de `*.aeat.es`.
