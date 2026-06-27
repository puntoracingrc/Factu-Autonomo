# PHASE2C53_SYNC_ROUTE_AUTH_SCOPE_ADVERSARIAL_MATRIX_V1

Matriz adversarial para confirmar que el handler no acepta user/scope desde payload.

## Casos cubiertos

- Payload intenta cambiar `userId`.
- Payload intenta cambiar `scopeId`.
- Identidad anidada en objetos internos.
- Batch con item que intenta scope distinto.
- Auth context ausente.
- Auth context sintetico correcto.
- Identificadores no sinteticos.
- Cuerpo con cabecera o cookie embebida.

## Regla

La identidad valida debe venir de dependencias server-derived inyectadas. El payload no puede elevar ni sustituir user/scope.

## Evidencia

`scripts/phase2c53-sync-route-auth-scope-adversarial-matrix.test.ts` valida rechazos controlados, ausencia de echo de identidad atacante y aceptacion del contexto sintetico correcto.

## Limites

No conecta con Supabase remoto, no toca UI, no usa documentos reales y no habilita endpoint publico operativo.
