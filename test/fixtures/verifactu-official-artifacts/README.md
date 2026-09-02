# Artefactos oficiales Veri*Factu para validacion offline

Fecha de descarga y verificacion: 2026-09-02.

Este directorio conserva copias exactas de los esquemas XSD y del WSDL
publicados por la AEAT para `tikeV1.0`. No contiene certificados, claves,
facturas ni datos reales.

Los nombres, tamanos, URLs de origen y SHA-256 estan fijados en
`src/lib/verifactu/official-schema-artifacts.ts`. Los ficheros no deben
editarse: cualquier cambio bloquea el validador por checksum.

`SuministroInformacion.xsd` declara la dependencia XMLDSIG mediante una URL
W3C. La copia oficial permanece intacta. El validador sustituye unicamente esa
URL, en memoria, por la copia fijada `xmldsig-core-schema.xsd`; no descarga nada
durante las pruebas.

La validacion XSD demuestra estructura XML. No demuestra por si sola que la
AEAT vaya a aceptar semanticamente un registro ni habilita el transporte SOAP.
