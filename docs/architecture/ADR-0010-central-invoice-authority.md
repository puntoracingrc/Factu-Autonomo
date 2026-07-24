# ADR-0010: Autoridad central para la emision de facturas

- Estado: aceptado
- Version: 1
- Fecha: 2026-07-23

## Contexto

Factu conserva hoy el estado operativo en cada navegador y sincroniza entidades
con Supabase. Antes de emitir, el cliente intenta descargar cambios pendientes,
pero el numero definitivo se calcula y guarda localmente. Dos dispositivos que
parten de copias distintas pueden asignar la misma identidad fiscal antes de que
la sincronizacion detecte la colision.

El repositorio ya contiene fundamentos de documentos canonicos, control de
version, idempotencia, identidades fiscales y cadena, pero sus rutas y
migraciones se declararon expresamente para local y staging. Produccion no
dispone todavia de esas tablas ni de una transaccion de emision autoritativa.

## Decision

1. El servidor sera la unica autoridad para asignar la identidad definitiva de
   facturas y rectificativas emitidas por Factu.
2. Los borradores pueden seguir siendo locales y funcionar sin conexion. La
   emision definitiva requiere conexion y una respuesta confirmada del servidor.
3. El navegador nunca reserva ni decide el siguiente numero fiscal. Envia un
   comando con clave idempotente, version esperada y huella del borrador.
4. PostgreSQL serializa por empresa, entorno, NIF emisor, serie y ejercicio. La
   asignacion del numero, identidad, documento congelado, version, auditoria y
   evento de salida se confirma dentro de una unica transaccion.
5. Una restriccion `UNIQUE` protege la identidad
   `(user_id, environment, issuer_nif, series_code, fiscal_year, sequence)`.
   La fecha de expedicion forma parte del registro fiscal, pero no permite
   reutilizar el mismo numero.
6. Repetir una clave idempotente con la misma peticion devuelve el resultado ya
   confirmado. Reutilizarla con contenido distinto se rechaza y se audita.
7. Un timeout posterior al commit no crea otra factura: el reintento recupera el
   resultado del primer comando.
8. Una factura emitida queda inmutable. Las correcciones se representan mediante
   rectificacion o anulacion; nunca mediante edicion, borrado o renumeracion.
9. Los retiros y reparaciones identifican documentos por ID tecnico, version y
   huella. Compartir numero nunca autoriza a retirar otro documento.
10. Realtime solo comunica que existe una version nueva. El cliente vuelve a
    leer el estado canonico; polling permanece como respaldo.
11. Restaurar una copia local antigua no puede sobrescribir documentos ni
    secuencias cuya autoridad ya sea central.
12. Los limites Pro y Pro+ se validan en servidor mediante el dispositivo y la
    sesion activos. Debe funcionar con hasta cinco dispositivos concurrentes.
13. La activacion se hace por modos `off`, `shadow`, `canary` y `required`.
    `shadow` no escribe identidades fiscales. `canary` exige allowlist y
    aprobacion explicita en produccion.
    Los modos con escrituras fiscales exigen ademas que la sincronizacion
    operativa este marcada como lista, que la baseline de produccion este
    reconciliada con Git y que exista copia restaurable con ensayo aislado
    superado.
14. Una vez activada la autoridad central para una serie, un incidente puede
    pausar nuevas emisiones, pero nunca devolver esa serie a numeracion local.
15. PITR es recomendable, no obligatorio. La puerta operativa exige una copia
    recuperable y una restauracion ensayada, sin imponer un proveedor o
    tecnologia concretos.

## Migracion

La transicion sera aditiva. `sync_entities` y las vistas actuales permanecen
intactas mientras el servidor proyecta documentos canonicos al formato vigente.
No se aplica ninguna migracion remota hasta reconciliar el historial real de
Supabase con Git y aprobar una linea base reproducible.

Los documentos existentes se registraran como historicos sin reemitirlos,
renumerarlos ni fabricar evidencia. Las colisiones previas se clasificaran de
forma explicita y conservaran todos sus IDs y copias. Una identidad que haya
estado emitida o retirada queda reservada.

## Rollback

- Antes del canario, desactivar el flag conserva el flujo vigente.
- Realtime puede desactivarse sin cambiar la autoridad; polling sigue leyendo.
- Despues de activar una serie, el kill switch pausa emisiones y mantiene
  lectura. No se permite fallback local.
- Las primeras migraciones son aditivas. El rollback operativo desactiva rutas
  y workers; no elimina ledgers, identidades ni auditoria.

## Contratos relacionados

- [ADR-0002](ADR-0002-app-issued-document-recovery.md)
- [ADR-0003](ADR-0003-explicit-test-document-retirement.md)
- [ADR-0005](ADR-0005-cloud-and-drive-sync-reliability.md)
- [Diseño de esquema V1](central-invoice-authority-schema-v1.md)
