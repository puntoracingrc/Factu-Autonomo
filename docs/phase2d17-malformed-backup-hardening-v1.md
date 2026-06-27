# Phase 2D.17 malformed backup hardening v1

Marker: `PHASE2D17_MALFORMED_BACKUP_HARDENING_V1`

## Objetivo

Anadir una capa pura de deteccion de backups malformados antes de crear manifests, dry-runs o reportes. La capa trabaja con objetos sinteticos ya parseados en memoria.

## Casos cubiertos

- claves `__proto__`;
- claves `constructor`;
- claves `prototype`;
- referencias circulares;
- objetos demasiado profundos;
- arrays demasiado grandes;
- funciones inesperadas;
- instancias como Date o clases;
- claves sospechosas;
- cadenas HTML/script;
- cadenas XML-like;
- marcadores de token/secret.

## Limites

- no throw crudo;
- errores tipados;
- no echo payload;
- no filesystem;
- no localStorage;
- no Supabase;
- no documentos reales;
- no produccion.

## Evidencia

- `src/lib/local-data-safety/malformed-backup-hardening.ts`
- `src/lib/local-data-safety/malformed-backup-hardening.test.ts`
- `validate:phase2d17-malformed-backup-hardening`

Evidencia tecnica interna; no procesa datos reales ni crea importadores funcionales.
