# Veri*Factu — guía de despliegue

## Qué incluye la app

- Registro encadenado (huella SHA-256 **spec AEAT v0.1.2**) por factura emitida
- QR tributario en PDF según especificación AEAT
- XML `RegFactuSistemaFacturacion` con `RegistroAlta` / `RegistroAnulacion`
- API `/api/verifactu/register` (con cuenta Supabase)
- Transporte SOAP/mTLS preparado para pruebas AEAT con certificado del obligado
- Estado del borrador de declaración en `/legal/declaracion-responsable`; el borrador interno no es válido ni se publica
- Pantalla de verificación in situ en **Configuración → Veri*Factu**

## Si eres el creador del software (productor SIF)

Guía completa para comercializar el SIF: **`docs/PRODUCTOR_SIF.md`** (declaración responsable art. 15, variables de entorno, checklist legal).

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

Si la tabla `verifactu_chain_state` ya existe, aplica además la migración:

```sql
alter table public.verifactu_chain_state
  add column if not exists last_numserie text,
  add column if not exists last_fecha_expedicion text;
```

Estos campos son necesarios para enviar a AEAT el identificador del registro anterior: huella, número y fecha de expedición.

## Variables de entorno (Vercel)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_NIF` | Sí (producción) | NIF del productor del SIF |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_NAME` | Sí | Nombre o razón social del productor |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_ADDRESS` | Sí | Dirección postal (art. 15.j) |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_CITY` | Sí | Localidad (art. 15.l) |
| `NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL` | Recomendado | Email de contacto del productor |
| `NEXT_PUBLIC_VERIFACTU_SYSTEM_ID` | No | Código corto del SIF (default: `FA`) |
| `NEXT_PUBLIC_VERIFACTU_INSTALLATION_ID` | Sí (remisión real) | Número/identificador estable de instalación |
| `VERIFACTU_ENVIRONMENT` | No | `test` (default) o `production` |
| `VERIFACTU_AEAT_SUBMIT` | No | `true` para intentar remisión real |
| `VERIFACTU_AEAT_CERT_CHANNEL` | No | `personal` para certificado del usuario; `sello` para apoderamiento futuro |
| `VERIFACTU_AEAT_ENDPOINT_URL` | No | Override técnico; vacío usa endpoint oficial |
| `VERIFACTU_CERT_P12_BASE64` | Solo remisión real | Certificado P12 en base64 |
| `VERIFACTU_CERT_PASSWORD` | Solo remisión real | Contraseña del P12 |

Sin certificado o con `VERIFACTU_AEAT_SUBMIT=false`, la app genera registros en **modo pruebas simulado** (QR apunta a `prewww2.aeat.es`) sin enviar a AEAT.

### Estado de envío fail-closed

`GET /api/verifactu/status` requiere un Bearer verificado y responde únicamente
`submissionMode: "unknown"`. No infiere el entorno desde
`VERIFACTU_ENVIRONMENT` ni publica configuración, certificado o identidad. La
interfaz muestra el estado como no verificado o no disponible, sin convertir
fallos de sesión, límite, red o JSON en un supuesto modo simulado.

La confirmación de un modo real queda bloqueada hasta que el entorno consumido
por `/api/verifactu/register` sea propiedad exclusiva del servidor
(`AUD-P1-15`).

## Preflight de prueba AEAT

Antes de activar un certificado real, la prueba automatizada `src/lib/verifactu/clean-invoice-preflight.test.ts` cubre el caso mínimo:

- emisor con NIF español;
- cliente con NIF español;
- una línea de 100,00 €;
- IVA 21 %;
- total 121,00 €;
- XML `RegFactuSistemaFacturacion`;
- sobre SOAP;
- bloqueo explícito si `VERIFACTU_AEAT_SUBMIT=true` pero falta certificado.

Cuando exista certificado `.p12` / `.pfx`, la primera prueba manual debe usar una factura igual de simple y el entorno `test`.

## Certificado recomendado

- **Opción A:** certificado `.p12` / `.pfx` del autónomo o empresa obligada, con `VERIFACTU_AEAT_CERT_CHANNEL=personal`.
- **Opción B futura:** certificado/sello del proveedor del software con apoderamiento AEAT, usando `VERIFACTU_AEAT_CERT_CHANNEL=sello`.

## Entornos AEAT

- Validación QR pruebas: https://prewww2.aeat.es
- Web Services pruebas con certificado personal: https://prewww1.aeat.es
- Web Services pruebas con sello/apoderamiento: https://prewww10.aeat.es
- Portal preproducción: https://preportal.aeat.es

## Renovación certificados AEAT (nov 2025)

Si integras remisión real, revisa que tu servidor confíe en las nuevas CA ROOT de `*.aeat.es`.
