# Central Invoice Authority Issue Service V1

Marker: `CENTRAL_INVOICE_AUTHORITY_ISSUE_SERVICE_V1`

Esta fase crea el servicio interno que une contrato de comando, activacion,
plan transaccional y adaptador RPC. Sigue sin anadir ruta HTTP, boton, cambio de
formularios ni emision real desde el navegador.

## Flujo

1. construye `CentralInvoiceAuthorityIssueCommand`;
2. evalua `CENTRAL_INVOICE_AUTHORITY_MODE` y las puertas operativas;
3. bloquea si `fiscalWritesEnabled` no esta activo;
4. genera el plan transaccional esperado;
5. invoca `issue_central_invoice_v1` mediante el adaptador RPC;
6. devuelve solo resumen seguro y resultado tecnico.

## Activacion

Por defecto el servicio queda apagado. En `shadow` tambien bloquea escrituras
fiscales. La escritura central solo continua si las puertas de activacion ya
permiten `fiscalWritesEnabled`.

## Limites

El servicio no obtiene `SUPABASE_SERVICE_ROLE_KEY`, no crea cliente admin, no
parsea formularios y no calcula PDF/XML. La ruta privada futura sera quien
inyecte autenticacion, cliente Supabase y snapshots preparados por servidor.
