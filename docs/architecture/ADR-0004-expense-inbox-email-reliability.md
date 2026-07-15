# ADR-0004 - Fiabilidad del buzón de gastos por email

- Estado: aceptada
- Versión: 3
- Fecha: 2026-07-15
- Ámbito: recepción de facturas de proveedores por email mediante Resend

## Contexto

El buzón recibe un webhook firmado de Resend, consulta con credenciales los
metadatos del adjunto, descarga sus bytes y crea un elemento pendiente para el
usuario propietario del alias. El 14 de julio de 2026 la recepción real reveló
dos incompatibilidades que las pruebas sintéticas no cubrían: la API directa
requiere identificación de cliente y el enlace temporal vigente usa
`cdn.resend.app`. El webhook llegó correctamente, pero la descarga quedó
bloqueada antes de crear el elemento.

El bloque vuelve a funcionar en producción y debe conservar su seguridad sin
quedar expuesto a regresiones de middleware, autenticación, facturación,
descargas, sincronización o refactors generales.

El 15 de julio se comprobaron dos huecos adicionales. Una cuenta cuya cuota
pasaba después a ilimitada conservaba el error anterior y el mismo PDF se
trataba como duplicado antes de reanalizarlo. Además, aceptar el `POST` de envío
de la copia no demostraba que el servidor del destinatario la hubiese
entregado, y la configuración general podía escoger un remitente distinto del
subdominio autenticado para Resend.

## Decisión

La recepción se trata como una frontera independiente y fail-closed. El
webhook permanece accesible sin sesión de usuario porque Resend no dispone de
ella, pero solo procesa un cuerpo acotado cuya firma Svix verifica con el
secreto configurado. La API de lectura de Resend sí usa credencial de servidor
y un `User-Agent` estable.

El enlace de descarga nunca se toma del webhook ni del usuario. Solo se acepta
el devuelto por la consulta autenticada a Resend y debe cumplir una allowlist
de host exacta, HTTPS y las restricciones SSRF. No se siguen redirecciones.

## Invariantes

1. `POST /api/expense-inbox/inbound` no depende de sesión, plan, navegación ni
   flags de producto. La firma Svix y el límite del cuerpo son obligatorios.
2. `api.resend.com` es el único origen para metadatos. La petición incluye
   `Authorization`, `Accept: application/json`, `User-Agent`, `no-store` y
   `redirect: manual`.
3. La descarga solo admite `cdn.resend.app`, `resend.com` o un subdominio real
   de `resend.com`. No se admiten HTTP, credenciales en URL, puertos no estándar,
   fragmentos, IPs, localhost, sufijos imitadores ni redirecciones.
4. Se acotan número de adjuntos, bytes individuales, bytes agregados, metadatos
   y tiempo total. Un exceso se ignora o registra como error según el contrato;
   nunca desactiva los límites para intentar completar el email.
5. Un fallo de descarga, proveedor, timeout o procesamiento devuelve HTTP 500.
   Así Resend puede reintentar. No se responde 200 a un procesamiento parcial
   que todavía deba repetirse.
6. Los reintentos son idempotentes por `user_id + attachment_hash`. La
   precomprobación y la restricción única de base de datos cubren concurrencia;
   `23505` se convierte en `duplicate`.
7. Los logs no contienen PII, contenido ni secretos. Solo se registran el
   código de fallo, estado HTTP del proveedor y hostname normalizado.
8. Regenerar el email crea un alias privado nuevo, lo marca como único activo,
   retira y reserva todos los anteriores y devuelve la dirección nueva solo
   después de persistirla. La recepción resuelve exclusivamente alias activos.
9. El alias anterior no se reasigna a otro usuario ni vuelve a activarse por
   colisión. Su historial permanece reservado.
10. La recepción no modifica facturas emitidas, recibos, importes, PDFs,
    snapshots, sellos, hashes fiscales ni VeriFactu. Solo crea entradas del
    buzón para revisión humana.
11. Si Datos de empresa contiene un email válido, la app envía desde su dominio
    verificado una copia con los adjuntos ya descargados. No usa el servidor que
    reenvió el original. La dirección nunca puede pertenecer al propio dominio
    del buzón, para impedir bucles.
12. La copia usa una clave idempotente derivada de usuario y `email_id` de
    Resend. Un resultado ambiguo o fallido conserva HTTP 500 para que Resend
    repita el webhook; la deduplicación de adjuntos evita volver a consumir IA o
    crear otro pendiente durante ese reintento.
13. Al guardar, la entrada pasa a `processed`; al descartar, pasa a `ignored`.
    Ambos estados desaparecen de la consulta abierta. El gasto creado conserva
    `sourceInboxItemId`, de modo que si falla únicamente el cierre, el siguiente
    intento repite el cierre y no vuelve a crear el gasto.
14. Un adjunto cuyo único registro está en `error` puede reclamarse de forma
    atómica y reanalizarse con el acceso y la cuota vigentes. Nunca se inserta
    otro elemento ni se repite una entrada `pending`, `processed` o `ignored`.
    Los identificadores de email y adjunto de Resend son opacos, solo servidor
    y deben concordar con el SHA-256 almacenado antes de usarse. El despliegue
    es compatible con el esquema anterior: mientras esas columnas aditivas no
    estén disponibles, se conserva la lectura y el reintento por hash.
15. Para errores antiguos sin esos identificadores se consulta únicamente la
    lista autenticada y acotada de recibidos, se filtra por alias y metadatos y
    solo se acepta el adjunto cuyos bytes reproducen exactamente el hash. Si no
    existe una coincidencia exacta, se pide reenviar el mismo email.
16. La copia sale con una identidad del mismo subdominio autenticado en Resend.
    Un `POST` aceptado no equivale a entrega: se consulta el email enviado y
    solo `last_event=delivered` confirma éxito. Estados pendientes, ambiguos o
    fallidos mantienen el webhook reintentable con la misma clave idempotente.
17. El botón de compra solo aparece ante un error de cuota vigente y nunca para
    una cuenta cuyo medidor actual sea ilimitado. El reintento vuelve a evaluar
    la cuota en servidor; la UI no concede saldo ni altera la suscripción.

## Pruebas y despliegue

La suite de contrato debe fallar si el middleware bloquea el webhook, se añade
autenticación de usuario, se elimina firma o límite, se deja de devolver 500,
se pierde deduplicación, el reclamo atómico del error, se relaja la resolución
de alias activos o desaparece el historial de retirada. También cubre la copia
idempotente, el remitente alineado, la confirmación `delivered`, el bloqueo de
bucles y el cierre `processed`/`ignored`. La prueba de descarga reproduce el
host real `cdn.resend.app` y mantiene casos adversariales para dominios
imitadores.

Antes de fusionar se ejecutan pruebas dirigidas, lint, typecheck y la suite CI.
Tras fusionar, `Production Domain` debe asignar y verificar
`facturacion-autonomos.app`. Cuando cambien contratos de Resend, se valida con
un único correo sintético sin datos reales y se conserva la evidencia segura
del estado HTTP, nunca el contenido ni la URL firmada.

## Gobernanza

Una auditoría, refactor o cambio de suscripción no puede alterar estos
invariantes de forma implícita. Cualquier modificación requiere actualizar
esta ADR, las pruebas de contrato y la evidencia de producción en un bloque
atómico. La allowlist no se amplía por conjetura: solo mediante documentación
primaria o un hostname observado en una respuesta autenticada de Resend.
