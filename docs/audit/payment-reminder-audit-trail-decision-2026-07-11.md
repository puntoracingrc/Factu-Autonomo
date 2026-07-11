# Decisión de auditoría persistente para recordatorios de pago

Fecha: 2026-07-11
Ámbito: AUD-P1-18

## Decisión

Este cambio asegura la propiedad del documento en servidor, usa el documento canónico que alimenta el PDF y evita que el cliente elija destinatario, emisor o contenido documental. No añade un registro persistente de envíos ni una clave de idempotencia.

No se usarán `app_error_events` ni `sync_entities` como pseudo-auditoría:

- `app_error_events` representa errores operativos, no entregas de comunicaciones, y no ofrece el contrato de unicidad ni el ciclo de estados requerido.
- `sync_entities` es un almacén de estado sincronizable y mutable por entidad; no es un libro de eventos append-only ni una outbox de servidor.
- Reutilizar cualquiera de las dos tablas mezclaría finalidades, dificultaría la retención y podría producir una evidencia engañosa o duplicados ante reintentos.

## Trabajo que requiere una migración explícita

La trazabilidad persistente y la idempotencia deben diseñarse juntas mediante una tabla/outbox dedicada y una migración revisable. El diseño mínimo debe contemplar:

- identificador de evento y clave de idempotencia con restricción única;
- `user_id` y `document_id` autorizados por el servidor;
- hash o versión del snapshot canónico utilizado, sin copiar el PDF ni el mensaje libre;
- destinatario seudonimizado, nunca el email en claro salvo justificación legal y política de retención aprobadas;
- estados de claim, envío confirmado y fallo, con número de intentos y marcas de tiempo;
- identificador del proveedor de correo y código de error acotado, sin volcar respuestas sensibles;
- operación transaccional o RPC para reclamar la clave antes de llamar al proveedor y cerrar el resultado después;
- RLS, acceso administrativo, retención, borrado y observabilidad definidos expresamente;
- estrategia de despliegue, compatibilidad, rollback y pruebas de concurrencia/reintento.

Hasta que ese plan y su migración se aprueben, el endpoint permanece fail-closed para el envío por servidor: una factura no autorizada o inválida nunca llega a Resend. Si la factura aún no está sincronizada, la respuesta solo puede habilitar el flujo local `mailto`/compartir del navegador; ese fallback no constituye un envío del servidor ni una evidencia persistente.

## Criterio para cerrar el pendiente

El pendiente de auditoría persistente podrá cerrarse únicamente cuando la outbox dedicada exista, la idempotencia esté probada frente a concurrencia y reintentos, y la política de datos haya sido revisada. Esta decisión evita introducir una migración improvisada dentro de la reparación segura de autorización.
