# Veri*Factu — guía de despliegue

## Qué incluye la app

- Registro encadenado (huella SHA-256) por factura emitida
- QR tributario en PDF según especificación AEAT
- XML de registro de facturación
- API `/api/verifactu/register` (con cuenta Supabase)
- Declaración responsable en `/legal/declaracion-responsable`
- Pantalla de verificación in situ en **Configuración → Veri*Factu**

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
