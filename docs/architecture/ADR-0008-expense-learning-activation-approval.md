# ADR-0008 - Paquete de aprobacion de consentimiento y retencion

- Estado: preparado para aprobacion explicita de producto/legal; no activa flags
- Fecha: 2026-07-23
- Ambito: consentimiento separado, retencion, retirada e incentivo futuro del motor de aprendizaje de gastos

Este paquete no sustituye una revision legal externa. Fija el texto y las
condiciones que deben aceptarse antes de habilitar `P4C3` en produccion. Si la
revision legal exige otra base, otro plazo o otra prueba de consentimiento, se
requiere una nueva version del contrato antes de activar ningun envio real.

## Decision de consentimiento V1

La colaboracion de aprendizaje de gastos usa una decision separada del
consentimiento operativo para enviar documentos a IA. No es necesaria para
escanear, revisar, guardar gastos, usar la cuota normal de IA, sincronizar datos
o mantener el plan contratado.

La decision queda ligada a la tupla exacta:

- `schemaVersion`: `expense-engine-learning-consent.v1`;
- `noticeVersion`: `expense-learning-notice.v1`;
- `purpose`: `IMPROVE_LOCAL_EXPENSE_READER`;
- `privacyPolicyVersion`: `2026-07-21`;
- `granted`: `true` o `false`.

Un consentimiento de otra version no autoriza esta finalidad. La ausencia de
decision se trata como `UNDECIDED`, no como autorizacion.

## Texto aprobado para la interfaz

Titulo:

> Ayuda a mejorar el lector local

Descripcion breve:

> Es una opcion separada: no cambia el escaneo, la revision ni el guardado de tus gastos.

Etiqueta de accion afirmativa:

> Compartir senales tecnicas de futuras correcciones

Detalle desplegable:

> Cuando habilitemos las contribuciones, solo se enviaran categorias tecnicas acotadas despues de que revises y guardes un gasto. Nunca enviaremos el PDF, imagen, texto OCR, proveedor, NIF, cuenta bancaria, numero de factura, nombre de archivo, importes ni porcentajes exactos.
>
> Durante un maximo de 35 dias conservaremos vinculos protegidos para deduplicar, limitar abusos y poder retirar lo que siga separable. Las metricas semanales que superen los controles de soporte y reidentificacion pueden conservarse hasta 13 meses y no se presentan como anonimas.
>
> Puedes retirar el consentimiento en cualquier momento. Se detendran nuevas aportaciones y se eliminara lo que aun pueda separarse. Las metricas ya combinadas de forma irreversible no pueden aislarse.
>
> Si esta opcion esta activa y agotas tu cuota normal de IA, podremos concederte un unico relleno mensual del 100 % de tu cuota de IA. La recompensa no reduce tu plan normal, no se acumula como saldo monetario y deja de estar disponible para meses futuros si retiras el consentimiento.

La interfaz no debe usar casillas premarcadas, consentimiento tacito ni copia que
presente la colaboracion como obligatoria, anonima, segura o necesaria para usar
el producto.

## Retencion aprobada para V1

Los plazos son techos maximos de conservacion operativa:

- Claim de deduplicacion: hasta 24 horas.
- Vinculo semanal, limite semanal, memberships y acumuladores protegidos: hasta
  35 dias, con expiracion derivada por servidor.
- Metricas promovidas de semana cerrada: hasta 13 meses.
- Ledger de consentimiento: mientras exista la cuenta y sea necesario demostrar
  la decision vigente o su retirada. El borrado de `auth.users` purga el ledger
  por minimizacion; si se exige conservar prueba legal fuera de la cuenta, esta
  V1 queda bloqueada hasta una migracion especifica.

El scheduler de mantenimiento debe ejecutarse con margen antes de esos maximos.
Un estado `RETRY_REQUIRED`, un secreto ausente, una migracion no aplicada o una
ejecucion fallida bloquean la activacion y requieren reparacion antes de
permitir trafico real.

## Retirada

La retirada debe ser tan facil como aceptar: desmarcar la misma preferencia o
usar una accion equivalente en la misma superficie. Al retirar:

- se registra `REVOKED` para la tupla vigente;
- no se aceptan nuevas contribuciones desde esa cuenta;
- se purgan claims, limites, vinculos y raw separable bajo las rutas P4A/P4C;
- si hay corrupcion reparable, se repara y reintenta sin reflejar detalles;
- si queda deuda fail-closed, la ingesta permanece bloqueada y mantenimiento
  debe seguir devolviendo fallo operativo generico hasta resolverla.

La retirada no borra metricas ya promovidas que no puedan separarse sin
reidentificar aportantes, y esta limitacion debe explicarse antes del opt-in.

## Incentivo de relleno mensual

El incentivo de producto queda aprobado solo como contrato futuro, no como
implementacion actual:

- Elegibilidad: cuenta autenticada con consentimiento `GRANTED` vigente para la
  tupla V1 en el momento de solicitar o calcular el beneficio.
- Momento: solo cuando la cuota normal mensual de IA este agotada.
- Tamano: un unico relleno mensual del 100 % de la cuota normal de IA del plan.
- Idempotencia: como maximo una concesion por cuenta y mes natural de cuota.
- No acumulacion: no crea saldo monetario, no se traspasa entre meses y no se
  mezcla con creditos comprados o recompensas de afiliados.
- Revocacion: retirar el consentimiento detiene la elegibilidad futura; no
  empeora el plan, la cuota ordinaria ni el acceso normal al producto.

Implementarlo requiere un bloque separado de billing con ledger idempotente,
tests de concurrencia, copy de producto y revision de privacidad. No puede
activar ni depender de ingesta si `EXPENSE_LEARNING_INGESTION_ENABLED`,
`NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED` o el scheduler no estan aprobados.

## Gates antes de activar P4C3

Antes de poner cualquier flag de aprendizaje en `true`, debe existir evidencia
sin PII de:

1. migraciones P1B, P2A, P3A, P4A, P4B, P4C y P5 aplicadas en produccion;
2. `expense_learning_private` sin acceso directo para `anon`, `authenticated` o
   `service_role`;
3. rutas de consentimiento e ingesta devolviendo `404` con flags apagados;
4. secretos HMAC canonicos presentes y distintos en servidor;
5. mantenimiento real verde con scheduler y sin `RETRY_REQUIRED`;
6. texto de consentimiento y politica de privacidad publicados con esta version;
7. aprobacion explicita de producto/legal sobre este paquete;
8. activacion gradual con rollback de flags documentado.

Mientras falte cualquiera de esos puntos, el estado correcto es mantener
apagados `EXPENSE_LEARNING_CONSENT_ENABLED`,
`EXPENSE_LEARNING_INGESTION_ENABLED` y
`NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED`.
