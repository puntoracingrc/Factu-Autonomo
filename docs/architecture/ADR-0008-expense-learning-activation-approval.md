# ADR-0008 - Paquete de aprobacion de consentimiento y retencion

- Estado: aprobacion interna registrada para consentimiento y retencion V1; P4C3 activado con servidor y wiring cliente, sujeto a consentimiento opt-in por cuenta
- Fecha: 2026-07-23
- Ambito: consentimiento separado, retencion, retirada e incentivo futuro del motor de aprendizaje de gastos

Este paquete no sustituye una revision legal externa. Fija el texto y las
condiciones que deben aceptarse antes de habilitar `P4C3` en produccion. Si la
revision legal exige otra base, otro plazo o otra prueba de consentimiento, se
requiere una nueva version del contrato antes de activar ningun envio real.

El preflight de consentimiento puede estar visible antes de P4C3 para recoger
una decision versionada y permitir retirarla con la misma facilidad. Ese estado
solo autoriza `EXPENSE_LEARNING_CONSENT_ENABLED === "true"`: no envia
contribuciones, no ejecuta wiring cliente, no concede el incentivo mensual y no
puede presentarse como activacion del aprendizaje compartido. Mientras
`EXPENSE_LEARNING_INGESTION_ENABLED` y
`NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED` sigan apagados, la interfaz debe
explicar que la preferencia no envia nada todavia. Cuando ambos flags estan
encendidos, la interfaz debe explicar que solo se enviaran senales tecnicas si
la cuenta autenticada activa expresamente la preferencia.

## Aprobacion interna de producto/empresa

El 27 de julio de 2026 queda registrada la aprobacion interna de
producto/empresa sobre este paquete V1. Esta aprobacion cubre exclusivamente:

- consentimiento separado de escaneo, revision, guardado, cuota normal de IA,
  sincronizacion y plan contratado;
- retirada simetrica desde la misma preferencia o una accion equivalente;
- texto visible de preflight y detalle desplegable;
- plazos maximos de 24 horas, 35 dias y 13 meses descritos abajo;
- incentivo futuro de un unico relleno mensual del 100 % de la cuota normal de
  IA cuando esta se agote, sin saldo monetario ni acumulacion;
- bloqueo de trafico real mientras falte cualquier gate de P4C3.

La aprobacion interna no sustituye una revision legal externa. El 28 de julio
de 2026 se autoriza y registra el primer paso operativo: servidor de ingesta
P4C3 encendido con autenticacion obligatoria y cliente aun apagado. Activar
`NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED === "true"` requiere redeploy
posterior y QA de flujo autenticado opt-in.

El 28 de julio de 2026 queda autorizada y registrada la activacion global V1 del
wiring cliente, tras cerrar el gap de migraciones por evidencia de objetos/ACL
reales y aceptar que el primer despliegue no sera un canary por cuenta. La
ingesta efectiva sigue condicionada a consentimiento `GRANTED` vigente de cada
cuenta, gasto guardado correctamente y mantenimiento P4C verde.

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
> Si las contribuciones ya estan habilitadas, la primera frase cambia a: Si activas esta preferencia, solo se enviaran categorias tecnicas acotadas despues de que revises y guardes un gasto. Nunca enviaremos el PDF, imagen, texto OCR, proveedor, NIF, cuenta bancaria, numero de factura, nombre de archivo, importes ni porcentajes exactos.
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

Antes de activar trafico real de aprendizaje, o de poner en `true`
`EXPENSE_LEARNING_INGESTION_ENABLED` o
`NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED`, debe existir evidencia sin PII
de:

1. migraciones P1B, P2A, P3A, P4A, P4B, P4C y P5 aplicadas en produccion;
2. `expense_learning_private` sin acceso directo para `anon`, `authenticated` o
   `service_role`;
3. ruta de ingesta devolviendo `404` con ingesta apagada; y ruta de
   consentimiento devolviendo `404` si `EXPENSE_LEARNING_CONSENT_ENABLED` esta
   apagado, o `401`/`200` cerrados y `no-store` si se ha autorizado solo el
   preflight de consentimiento;
4. secretos HMAC canonicos presentes y distintos en servidor;
5. mantenimiento real verde con scheduler y sin `RETRY_REQUIRED`;
6. texto de consentimiento y politica de privacidad publicados con esta version;
7. aprobacion explicita de producto/empresa registrada en este paquete;
8. activacion gradual con rollback de flags documentado.

Mientras falte cualquiera de esos puntos, el estado correcto es mantener
apagado `NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED`. El flag
`EXPENSE_LEARNING_CONSENT_ENABLED` puede permanecer encendido como preflight de
consentimiento. `EXPENSE_LEARNING_INGESTION_ENABLED` puede permanecer encendido
solo si el servidor devuelve errores cerrados ante llamadas anonimas o
malformadas, mantenimiento esta verde y no existe deuda `RETRY_REQUIRED`.

## Preflight operativo P4C3 del 27 de julio de 2026

El preflight sin PII queda registrado en
[`expense-learning-p4c3-preflight-2026-07-27.json`](expense-learning-p4c3-preflight-2026-07-27.json).
Se ejecuto sobre `main` `f81a1e879315793fea6818da96c609de7ac23dd5`, despues
del cierre de rendimiento `/gastos` #880.

Resultado aprobado para preparacion, no para trafico real:

- `EXPENSE_LEARNING_CONSENT_ENABLED` permanece en `true` como preflight de
  consentimiento.
- `EXPENSE_LEARNING_INGESTION_ENABLED` permanece en `false`.
- `NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED` permanece en `false`.
- Se rotaron los dos secretos HMAC de produccion a valores `Sensitive`,
  independientes, base64url canonicos sin padding, 43 caracteres y 32 bytes
  decodificados. Los valores no se registran.
- Se redeplego el mismo codigo de produccion para que las funciones server lean
  esos secretos nuevos y se reasigno el dominio canonico
  `facturacion-autonomos.app`.
- La ruta de ingesta sigue devolviendo `404` privado con ingesta apagada; la
  ruta de consentimiento anonima devuelve `401` privado; mantenimiento anonimo
  devuelve `401` privado.
- El workflow real `expense-learning-maintenance.yml` paso en `main` despues
  del redeploy y no dejo `RETRY_REQUIRED` observable.
- Las tablas protegidas de claims, vinculos, limites, memberships,
  acumuladores, metricas promovidas y markers siguen con cero filas.

Bloqueos que impiden activar cliente o abrir trafico general:

- El inventario de objetos de Supabase confirma las tablas/RPC P1B-P5 y las ACL
  cerradas, pero `schema_migrations` de produccion sigue mostrando solo las
  migraciones cloud `20260720133000`, `20260721190000` y `20260721190100`.
  Antes de `EXPENSE_LEARNING_INGESTION_ENABLED === "true"` debe reconciliarse
  ese historial o registrarse una aceptacion explicita de evidencia por objetos
  y ACL reales.
- El flag `NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED` es global de build, no
  un canary por cuenta. La activacion gradual V1 solo puede empezar con servidor
  habilitado y cliente apagado; para activar clientes de forma realmente gradual
  hace falta un gate adicional por cohorte/cuenta o una aprobacion explicita de
  activacion global.

Siguiente paso permitido tras cerrar esos dos puntos: habilitar solo
`EXPENSE_LEARNING_INGESTION_ENABLED === "true"`, mantener
`NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED === "false"`, redeplegar, repetir
mantenimiento real, comprobar rutas y confirmar que siguen en cero las tablas
de raw/promocion salvo trafico de prueba autorizado. El wiring cliente queda
bloqueado hasta un PR/operacion posterior.

## Activacion servidor P4C3 del 28 de julio de 2026

La evidencia sin PII queda registrada en
[`expense-learning-p4c3-server-activation-2026-07-28.json`](expense-learning-p4c3-server-activation-2026-07-28.json).
El gap de `schema_migrations` queda aceptado para este paso por evidencia real
de objetos, ACL y runtime, sin reescribir historial parcial de migraciones: en
produccion existen las tablas/RPC P1B-P5, `expense_learning_private` no concede
acceso directo a roles API y no hay filas runtime protegidas.

Estado operativo despues del redeploy:

- `EXPENSE_LEARNING_CONSENT_ENABLED=true`.
- `EXPENSE_LEARNING_INGESTION_ENABLED=true`.
- `NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED=false`.
- `POST /api/expenses/learning-contribution` anonimo devuelve `401` privado
  `no-store`, no `404`: la ruta ya esta disponible en servidor pero sigue
  cerrada por bearer confirmado.
- `GET /api/expenses/learning-consent` anonimo devuelve `401` privado
  `no-store`.
- `POST /api/expenses/learning-maintenance` anonimo devuelve `401` privado
  `no-store`.
- El workflow manual `expense-learning-maintenance.yml` paso sobre el mismo
  `main` y no dejo deuda observable.

## Activacion cliente P4C3 del 28 de julio de 2026

La evidencia sin PII queda registrada en
[`expense-learning-p4c3-client-activation-2026-07-28.json`](expense-learning-p4c3-client-activation-2026-07-28.json).
Despues de fusionar el copy dinamico de consentimiento y cerrar los gates de
`main` acumulativo `8cab1c4910023f528c60d2e5feba6595ba00497f`, se activo
`NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED=true` en Vercel Production y se
redeplego produccion para reconstruir el bundle cliente.

Estado operativo tras la activacion:

- `EXPENSE_LEARNING_CONSENT_ENABLED=true`.
- `EXPENSE_LEARNING_INGESTION_ENABLED=true`.
- `NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED=true`.
- El dominio canonico `facturacion-autonomos.app` apunta al deployment
  `dpl_HSuk3X6jtx3HDUwcKcWouXVWecza`.
- El bundle de produccion contiene el copy activo "Si activas esta preferencia"
  y no contiene el copy dormido "Por ahora esta preferencia no envia
  contribuciones".
- Las rutas anonimas de ingesta, consentimiento y mantenimiento siguen
  devolviendo `401` privado `no-store` con `Vary: Authorization`.
- El workflow manual `expense-learning-maintenance.yml` paso sobre el mismo
  `main` y el readback de Supabase conserva cero filas runtime protegidas en
  claims, links, limits, memberships, accumulators, metrics y batches.

Esta activacion no concede automaticamente consentimiento a ninguna cuenta, no
ejecuta lotes historicos y no implementa aun el incentivo de relleno mensual:
ese incentivo sigue reservado para un bloque separado de billing.

El seguimiento operativo de esta activacion debe vigilar mantenimiento P4C,
contadores runtime protegidos, errores de ingesta y copy visible. Si aparece
error, deuda `RETRY_REQUIRED`, contadores runtime inesperados o copy incoherente,
el rollback es volver a `NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED=false` y
redeplegar; si el problema esta en servidor, volver tambien
`EXPENSE_LEARNING_INGESTION_ENABLED=false`.
