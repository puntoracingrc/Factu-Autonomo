# Fase 2B.2 - Checkpoint post-merge v1

Fecha: 2026-06-24

Rama: `docs/phase2b2-post-merge-checkpoint`

Estado: CHECKPOINT DOCUMENTAL POST-MERGE / SIN IMPLEMENTACION FUNCIONAL 2B.3

Este documento registra el estado tecnico despues de fusionar PR #13. No crea
migraciones nuevas, no implementa VERI*FACTU funcional, no conecta con AEAT, no
usa certificados reales y no toca Supabase produccion.

## 1. Estado canonico

PRs base ya integrados en `main`:

- PR #11: plan servidor VERI*FACTU de Fase 2B.
- PR #12: diseno de esquema y staging de Fase 2B.1.
- PR #13: esquema servidor local/staging de Fase 2B.2.

Datos de PR #13:

- Head fusionado:
  `cbc4e3b9a5c69e58e46fd121cb645b575a59c63b`.
- Merge commit:
  `e1c6a91539e152215873a702245fa11db299c221`.
- Workflow main:
  `https://github.com/puntoracingrc/Factu-Autonomo/actions/runs/28126356915`.
- Resultado main:
  - Quality: SUCCESS.
  - Supabase Acceptance: SUCCESS.
- Deployment tecnico automatico Vercel:
  `https://factu-autonomo-jyqksrng2-persianas-almar-web-s-projects.vercel.app`.
- Promote Vercel: no ejecutado.

## 2. Archivos integrados por PR #13

- `supabase/migrations/20260624220000_phase2b_server_schema_local_staging.sql`
- `supabase/rollbacks/20260624220000_phase2b_server_schema_local_staging.down.sql`
- `docs/phase2b2-server-schema-local-staging-v1.md`
- `scripts/validate-phase2b2-server-schema.mjs`
- `package.json`

`main` contiene ya la migracion local/staging 2B.2 y el validador
`npm run validate:phase2b2-server-schema`.

## 3. Validaciones heredadas de PR #13

Validaciones reportadas en el cierre de PR #13:

| Validacion | Resultado |
| --- | --- |
| `git diff --check` | OK |
| `npm run check:migrations` | OK |
| `npm run validate:phase2b2-server-schema` | OK |
| `npm test` | OK, 87 archivos, 419 tests |
| `npm run lint` | OK |
| `npx tsc --noEmit` | OK |
| `npm run build` | OK |
| DDL `up` + `down` en PostgreSQL temporal local | OK |
| GitHub Quality en PR | SUCCESS |
| GitHub Supabase Acceptance en PR | SUCCESS |
| Vercel preview | SUCCESS |

Nota: `supabase db reset --local` no se ejecuto en PR #13 porque Supabase local
no estaba levantado. No se forzo ningun entorno remoto por este motivo.

## 4. Validaciones repetidas en este checkpoint

Validaciones de solo lectura y documentales realizadas para este checkpoint:

- `main` actualizado y apuntando a
  `e1c6a91539e152215873a702245fa11db299c221`.
- Archivos esperados de PR #13 presentes.
- Script `validate:phase2b2-server-schema` presente en `package.json`.
- `npm run validate:phase2b2-server-schema`: OK.
- Revision de patrones peligrosos en la migracion 2B.2: OK.

Patrones revisados:

- sin referencias a Supabase produccion;
- sin certificados reales;
- sin endpoints AEAT reales;
- sin secretos;
- sin `SUPABASE_SERVICE_ROLE_KEY` en cliente;
- sin transporte AEAT funcional;
- sin emision fiscal funcional;
- sin `unique(user_id, document_id, record_type)`;
- sin `GRANT INSERT`, `GRANT UPDATE` ni `GRANT DELETE` a `authenticated`;
- sin permisos peligrosos a `anon`.

## 5. Consistencia del esquema 2B.2

La migracion 2B.2 crea solo tablas nuevas de esquema servidor local/staging:

- `server_documents`;
- `server_document_versions`;
- `document_conflicts`;
- `fiscal_operations`;
- `fiscal_invoice_identities`;
- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_transport_attempts`.

Confirmaciones:

- El rollback manual existe y comparte version con la migracion.
- Las tablas legacy `verifactu_records` y `verifactu_chain_state` no se borran,
  no se renombran y no se alteran.
- El nuevo modelo usa nombres diferenciados: `fiscal_records` y
  `fiscal_chain_state`.
- La decision de unicidad fiscal global vs por usuario queda documentada como
  pendiente antes de produccion.
- RLS esta activado en todas las tablas nuevas.
- `authenticated` queda limitado a lectura propia de columnas seguras.
- `anon` no tiene permisos.
- `service_role` queda como camino futuro de escritura servidor/job.
- `fiscal_records` incluye trigger anti-`UPDATE` y anti-`DELETE`.

Columnas sensibles no expuestas por defecto a lectura cliente:

- `payload`;
- `document_snapshot`;
- `pdf_snapshot`;
- `xml_payload`;
- `response_body`;
- mensajes internos sensibles como `failure_message` y `error_message`.

## 6. Confirmaciones post-merge

- 2B.2 esta integrada en `main`.
- 2B.2 sigue siendo local/staging.
- No se ha tocado Supabase produccion.
- No se ha inspeccionado Supabase produccion.
- No se han aplicado migraciones a produccion.
- No hay AEAT real.
- No hay certificados reales.
- No hay VERI*FACTU funcional servidor.
- No se ha empezado 2B.3.
- No se ha tocado Vercel config.
- No hubo promote.
- No se cambiaron dominios, aliases ni DNS.
- No se tocaron Stripe, precios ni planes.
- No se toco IA.
- No se tocaron importadores.
- No se tocaron facturas reales.
- No se toco numeracion real.
- No se tocaron PDFs historicos.
- No se modifico logica fiscal productiva.

## 7. Riesgos vivos

Riesgos y tareas pendientes despues de 2B.2:

- Supabase local no estaba levantado en PR #13, por lo que
  `supabase db reset --local` no se ejecuto.
- DDL `up`/`down` si fue probado en PostgreSQL temporal local descartable.
- Produccion no tiene baseline aplicado.
- Produccion no debe tocarse todavia.
- Falta staging real validado.
- Falta decidir unicidad fiscal global vs por usuario.
- Falta decidir convivencia o migracion final de tablas legacy VERI*FACTU.
- Falta implementar operacion fiscal transaccional.
- Falta transporte AEAT separado.
- Falta estrategia de certificados.
- Falta aceptacion tecnica antes de cualquier produccion.
- Falta actualizar dossier compliance solo cuando corresponda a un hito
  suficientemente cerrado.

## 8. Decisiones pendientes antes de 2B.3

Antes de abrir una fase funcional posterior hay que concretar:

- unidad funcional pequena de 2B.3;
- si 2B.3 sera solo ingest/sync servidor, versionado o RPC preparatoria;
- limites exactos para no conectar AEAT;
- limites exactos para no usar certificados reales;
- entorno de validacion local/staging;
- estrategia de pruebas de permisos, RLS y concurrencia;
- si la validacion DDL debe repetirse en Supabase local limpio antes del PR;
- criterio para no tocar produccion.

## 9. Criterio recomendado para abrir 2B.3

2B.3 solo deberia abrirse si:

- `main` esta verde;
- 2B.2 esta documentada;
- no hay deuda critica en migracion, rollback o RLS;
- Supabase produccion se mantiene fuera;
- se define una unidad funcional pequena;
- la siguiente fase no conecta AEAT real;
- la siguiente fase no usa certificados reales;
- la siguiente fase no toca produccion;
- la siguiente fase se limita a servidor/local/staging.

## 10. Veredicto

Veredicto interno:

`APTO PARA PLANIFICAR 2B.3 CON ALCANCE LIMITADO LOCAL/STAGING`

Este veredicto no autoriza produccion, no autoriza AEAT real, no autoriza
certificados reales y no constituye certificacion legal, fiscal ni tributaria.
