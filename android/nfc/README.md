# Fast NFC · Android

Aplicación complementaria de Fast para Stripe Terminal Tap to Pay. No sustituye
la PWA: el usuario abre un cobro o factura en Fast y elige NFC. El APK recibe un
acceso de diez minutos a ese pago, muestra el importe y deja a Stripe recoger
tarjeta y PIN. Nunca almacena claves API, sesiones de Google ni datos de tarjeta.

## Construcción

Requiere JDK 21+, Android SDK 37 y las licencias oficiales del SDK instaladas.
`./gradlew :app:assembleProductionRelease` genera un APK release sin firmar. AGP 9.3.0,
Gradle 9.6.1 y Stripe Terminal 6.0.0 están fijados. Firmar con `apksigner` y una
clave privada de distribución conservada fuera del repositorio; no usar la
firma debug. Conservar la misma clave para futuras actualizaciones. Verificar
la firma con `apksigner verify --print-certs` antes de publicar el archivo.

La distribución descargable usa el release `fast-nfc-v1.0.1` de GitHub con
`fast-nfc-1.0.1.apk`; publicar únicamente el APK y su checksum, nunca la clave
de firma. `src/quick-app/nfc.html` explica la instalación desde el teléfono.

## Configuración privada

Además de la configuración de Checkout existente:

- `QUICK_STRIPE_NFC_ENABLED=true`.
- `QUICK_STRIPE_TERMINAL_LOCATION_ID=tml_...` de la misma cuenta y modo.
- `QUICK_STRIPE_TERMINAL_DISPLAY_NAME` con el nombre comercial visible al cliente.
- Clave restringida: Checkout Sessions escritura, Charges lectura, Accounts
  lectura, Payment Intents escritura, Terminal Connection Tokens escritura y
  Terminal Locations lectura. No concede transferencias ni reembolsos.
- Webhook propio de cobros: añadir `payment_intent.succeeded` y
  `payment_intent.canceled` a los cinco eventos existentes.
- Aplicar solamente la migración NFC nueva, después de la aceptación local;
  no reconciliar ni empujar a ciegas el historial antiguo de migraciones.

La ubicación es la sede de referencia para una empresa que se desplaza. La
ubicación precisa del móvil se usa por Stripe para validar el país del cobro.

## Verificación y límites

Ejecutar `terminal.test.ts`, la aceptación PostgreSQL de Fast, los contratos de
API/RLS, ADR-0007 y la regresión completa. Pruebas de proveedor solo en test y
con datos sintéticos aislados. No activar NFC real hasta verificar los permisos,
la cuenta, la ubicación, el webhook y la compatibilidad del SDK en el teléfono.

El teléfono exige NFC, Android 13+, Google Play/servicios Google, software y
bootloader originales, actualizaciones de seguridad recientes y opciones de
desarrollador desactivadas para el lector real. Para PIN, Stripe puede bloquear
superposiciones, servicios de accesibilidad o grabación de pantalla. Un modelo
en una lista no sustituye la comprobación del SDK sobre el dispositivo concreto.

No ejecutar cobros reales como QA automatizado. El propietario hace cualquier
prueba con dinero real en el teléfono. El callback Android solo solicita una
comprobación; la confirmación procede de Stripe autenticado y del commit de
Factu. Una prueba nunca marca pagada una factura real.

Para aceptación física por USB, `assembleAcceptanceRelease` genera un paquete
separado `.acceptance`, rotulado «Fast NFC pruebas», que solo usa el servidor
local `127.0.0.1:3111` mediante `adb reverse`. Su excepción HTTP está limitada a
loopback y no forma parte del APK público. Retirar esa instalación y el reverse
al terminar. El APK público solo se conecta al origen HTTPS fijo de Fast.

Ante un timeout, recuperar el mismo pago. Cambiar a enlace exige cancelar el
PaymentIntent; cambiar a NFC exige caducar el Checkout. Una respuesta ambigua
conserva la reserva. El kill switch bloquea nuevos accesos sin detener las
confirmaciones de pagos ya recibidos. No borrar el ledger ni revertir estados
fiscales al desactivar NFC.
