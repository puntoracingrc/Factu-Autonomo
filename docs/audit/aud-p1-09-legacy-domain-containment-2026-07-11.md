# Contención AUD-P1-09 — dominio Vercel heredado

Fecha de verificación: 2026-07-11.

**Estado:** el deployment antiguo ya no es público, pero el cierre queda
bloqueado hasta confirmar en Stripe que el endpoint activo apunta directamente
al dominio canónico y que sus entregas recientes son correctas.

## Alcance y causa

`factu-autonomo.vercel.app` y `facturacion-autonomos.app` pertenecen al mismo
proyecto Vercel, pero el primero estaba fijado a un deployment antiguo de
`main` (`05183acd`, 2026-06-28), mientras el canónico apuntaba a `c04b536a`.
Estos datos se contrastaron mediante las lecturas autenticadas de proyecto,
alias y deployment de la API de Vercel. El proyecto tiene desactivada la
asignación automática de dominios y el workflow solo movía el dominio canónico.
Como resultado, el host legacy seguía sirviendo una aplicación de junio con
HTML, assets, CORS y controles de seguridad distintos.

Este bloque no cambia datos, Supabase, Stripe, VeriFactu, snapshots, PDFs ni
integridad documental. Se construyó desde `origin/main` en
`c04b536a73623d9dd61c691f08ab157abcb19bee`.

## Contención aplicada

- Vercel Project Domain configura `factu-autonomo.vercel.app` como redirect
  permanente 308 a `facturacion-autonomos.app`.
- `next.config.ts` repite el redirect condicionado al host exacto como defensa
  en profundidad.
- `Production Domain` no sigue redirects al validar el canónico y falla si el
  legacy deja de responder 308, cambia el destino o pierde ruta/query.

Se verificaron sin POST ni credenciales las rutas `/`, `/precios`,
`/auth/callback`, `/google-auth/callback`, `/drive/callback` y
`/api/webhooks/stripe`. Todas devolvieron 308 con `Location` exacto al dominio
canónico; el dominio canónico siguió respondiendo 200.

## OAuth y webhooks

Las comprobaciones OAuth fueron peticiones de autorización sin sesión,
credenciales ni código. Se usaron los client IDs públicos ya configurados y no
se registraron sus valores:

| Cliente | Callback canónico | Callback legacy |
|---|---|---|
| Google Login | retorno al callback con `interaction_required`; URI aceptada | página OAuth de error `redirect_uri_mismatch` |
| Google Drive | retorno al callback con `interaction_required`; URI aceptada | página OAuth de error `redirect_uri_mismatch` |

El endpoint público `/auth/v1/settings` de Supabase informó
`external.google=true`. Un flujo OAuth sin sesión confirmó además la política
de retorno: el callback canónico volvió a `/auth/callback`, mientras el legacy y
un host inválido cayeron al Site URL canónico `/`. No se enviaron credenciales o
códigos. El runbook ya no propone el callback legacy.

### Stripe

Stripe debe entregar directamente a
`https://facturacion-autonomos.app/api/webhooks/stripe`. No se envió ningún
evento ni POST de prueba y el redirect no se considera transporte de webhooks.

La lista privada de endpoints de Stripe no estaba disponible para lectura en
esta ejecución. El redirect elimina la aplicación antigua y su handler público,
pero no demuestra que Stripe ya entregue al canónico. AUD-P1-09 no se considera
cerrado hasta verificar ese panel y entregas recientes sin enviar un pago real.

## Datos locales y rollback

`localStorage` está aislado por origen. Tras el redirect no se puede abrir la
aplicación antigua para leer datos que solo existieran en ese host; no se hizo
ninguna migración o copia de datos. Esta es una contención deliberada frente a
una versión obsoleta, no una reparación de datos.

Ante una incidencia, no se debe volver a apuntar el legacy al deployment
antiguo. El rollback seguro requiere revisar primero OAuth/webhooks y, si fuera
imprescindible, sustituir temporalmente el 308 por una página estática de
bloqueo en el mismo proyecto.
