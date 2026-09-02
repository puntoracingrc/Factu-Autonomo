# Veri*Factu — guía de despliegue

## Qué incluye la app

- Registro encadenado (huella SHA-256 **spec AEAT v0.1.2**) por factura emitida
- QR tributario en PDF según especificación AEAT
- XML `RegFactuSistemaFacturacion` con `RegistroAlta` / `RegistroAnulacion`
- Validación estructural offline contra los XSD oficiales fijados por SHA-256
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

La ruta nueva depende de las migraciones versionadas del proyecto. En
particular, `20260902182313_verifactu_certificate_bindings.sql` crea el almacén
privado de certificados y `20260902183813_verifactu_central_submission_ledger.sql`
crea la cadena, los registros inmutables y los intentos de transporte. No se
deben ejecutar fragmentos SQL manuales ni usar las tablas locales antiguas para
una remisión.

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
| `VERIFACTU_ENVIRONMENT` | Sí para la prueba | Debe ser exactamente `test` |
| `VERIFACTU_CERTIFICATE_KEK_BASE64` | Sí | Clave AES de 32 bytes en base64; solo servidor |
| `VERIFACTU_AEAT_PREPRODUCTION_ENABLED` | Sí | `true` únicamente durante la prueba aprobada |
| `VERIFACTU_AEAT_PREPRODUCTION_KILL_SWITCH` | Sí | `true` cierra cualquier envío; valor normal |
| `VERIFACTU_AEAT_PREPRODUCTION_USER_IDS` | Sí | Exactamente un UUID de usuario |
| `VERIFACTU_AEAT_PREPRODUCTION_DOCUMENT_IDS` | Sí | Exactamente un ID local de factura central |

No existen variables para guardar un P12 o su contraseña. El certificado se
cifra antes de entrar en el bucket privado, se vincula a usuario, NIF y entorno
test, y se vuelve a comprobar al usarlo (huella, vigencia y NIF del sujeto).

### Estado de envío fail-closed

`GET /api/verifactu/status` requiere un Bearer verificado y responde únicamente
`submissionMode: "unknown"`. No infiere el entorno desde
`VERIFACTU_ENVIRONMENT` ni publica configuración, certificado o identidad. La
interfaz muestra el estado como no verificado o no disponible, sin convertir
fallos de sesión, límite, red o JSON en un supuesto modo simulado.

`POST /api/verifactu/register` acepta solamente `localDocumentId`. Exige sesión
confirmada y dispositivo vinculado. El documento, identidad fiscal, importes,
cadena, XML y certificado se recuperan o construyen en el servidor.

## Preflight de prueba AEAT

Antes de activar un certificado real, las pruebas
`src/lib/verifactu/xml-official-xsd.test.ts` y
`src/lib/verifactu/clean-invoice-preflight.test.ts` cubren:

- emisor con NIF español;
- cliente con NIF español;
- una línea de 100,00 €;
- IVA 21 %;
- total 121,00 €;
- XML `RegFactuSistemaFacturacion`;
- sobre SOAP;
- validación offline de altas, encadenamiento, exención, rectificativas y
  anulaciones contra los XSD oficiales.
- importes originales de base, cuota y recargo en rectificativas sustitutivas;
- aislamiento criptográfico usuario + NIF y comprobación del sujeto del P12;
- persistencia atómica de registro, avance de cadena e intento inicial;
- reintento del mismo XML tras timeout o respuesta ambigua y reconocimiento de
  duplicado según la respuesta AEAT.

Cuando exista certificado `.p12` / `.pfx`, la primera prueba debe usar una
factura igual de simple, emitida por central con identidad `test`.

## Certificado recomendado

- **Opción A:** certificado `.p12` / `.pfx` del autónomo o empresa obligada,
  registrado como canal `personal`.
- **Opción B futura:** certificado/sello del proveedor con apoderamiento AEAT,
  registrado como canal `sello`.

El archivo y la contraseña se entregan por un canal local seguro al operador.
No se pegan en el chat, no se guardan en Git y no se convierten en variables de
entorno globales. `provisionVerifactuCertificate()` valida NIF y vigencia antes
de cifrar y activar el vínculo.

## Prueba mínima controlada

1. Aplicar las dos migraciones y comprobar que el bucket no es público.
2. Generar la KEK en el gestor de secretos y mantener el kill switch en `true`.
3. Crear una sola factura sencilla con identidad central `test` y anotar su ID.
4. Aprovisionar el certificado para el UUID y NIF exactos de esa empresa.
5. Configurar exactamente ese UUID y ese documento en las dos allowlists.
6. Activar `PREPRODUCTION_ENABLED`, desactivar el kill switch y hacer una sola
   llamada autenticada desde un dispositivo vinculado.
7. Reactivar el kill switch inmediatamente y revisar registro, cadena, intento,
   CSV y respuesta conservada en el ledger.
8. Solo se considera superada con `accepted` o `accepted_duplicate` y CSV. Un
   timeout queda como `delivery_unknown`; el siguiente intento reutiliza el XML
   exacto, nunca crea otro registro.

## Entornos AEAT

- Validación QR pruebas: https://prewww2.aeat.es
- Web Services pruebas con certificado personal: https://prewww1.aeat.es
- Web Services pruebas con sello/apoderamiento: https://prewww10.aeat.es
- Portal preproducción: https://preportal.aeat.es

## Renovación certificados AEAT (nov 2025)

Si integras remisión real, revisa que tu servidor confíe en las nuevas CA ROOT de `*.aeat.es`.
