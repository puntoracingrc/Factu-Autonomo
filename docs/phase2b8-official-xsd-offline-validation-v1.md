# 2B.8 - Validacion XSD oficial offline v1

Fecha: 2026-09-02

## Alcance cerrado

Esta fase incorpora los XSD y el WSDL oficiales de Veri*Factu fijados por
SHA-256, selecciona `xmllint-wasm` como validador reproducible y ejecuta una
bateria exclusivamente sintetica sin red ni certificados.

Se comprueban:

- alta ordinaria y primer registro;
- encadenamiento y varios tipos de IVA;
- operacion exenta;
- rectificativa por diferencia (`I`) y por sustitucion (`S`), con referencia a
  la factura rectificada;
- registro de anulacion AEAT;
- rechazo de namespace, NIF y fecha estructuralmente invalidos;
- integridad de los siete artefactos y cierre local de sus importaciones.

## Garantias

- Los artefactos se leen desde Git y se verifican antes de cada validacion.
- La referencia remota XMLDSIG se sustituye solo en memoria por una copia W3C
  fijada por checksum.
- El validador no usa red, Java, binarios nativos, certificados, Supabase ni
  transporte SOAP.
- Los errores controlados no imprimen el XML completo.
- Ninguna cuenta ni factura real participa en la bateria.

## Lo que esto no demuestra

Pasar el XSD demuestra que la estructura XML coincide con los esquemas. No
demuestra todavia que todas las reglas semanticas de la AEAT se cumplan ni que
un registro vaya a ser aceptado en preproduccion.

En particular queda pendiente cerrar para el envio real:

- reglas semanticas publicadas por la AEAT, incluida la informacion economica
  exigible para rectificativas sustitutivas;
- identidad segura cuenta, obligado tributario y certificado;
- persistencia atomica del registro, cadena e intento de envio;
- idempotencia y recuperacion ante respuestas dudosas;
- primer canario controlado en preproduccion con certificado real.

Los interruptores de `isVerifactuRegistrationApiEnabled()` y
`isVerifactuSubmissionAvailable()` permanecen cerrados hasta completar esas
garantias.
