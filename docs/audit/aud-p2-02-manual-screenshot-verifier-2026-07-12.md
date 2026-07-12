# Reparación AUD-P2-02 — verificador honesto de capturas del manual

Fecha: 2026-07-12.

**Estado:** reparación iniciada en `f99f520` y rebasada antes de publicar sobre
`origin/main` `cded0a1d98dff457c306fa11e940d0edd32d05b2` (#397). La
validación local está completa; el cierre definitivo requiere checks remotos
verdes, merge a `main` y verificación de producción.

## Defecto confirmado

`npm run manual:verify` daba verde porque una única prueba ejecutaba
`existsSync` sobre los PNG referenciados. No comprobaba que el archivo fuera un
PNG válido, que sus bytes o dimensiones fueran los revisados, que proviniera de
la ruta/estado anunciado ni que la revisión siguiera vigente.

El inventario real contiene 31 usos, 30 PNG únicos referenciados y 32 archivos
en disco. `impuestos-trimestre.png` y `navegacion-inferior.png` estaban
huérfanos. Ningún PNG contiene ruta, fecha o commit de la aplicación, y el
histórico solo permite inferir un viewport 720×1280, DPR 2, locale español y
tema claro. `MANUAL_SCREENSHOT_BASE_URL` podía apuntar a cualquier despliegue,
por lo que el commit que incorporó el asset no demuestra qué versión se
fotografió.

## Defectos visuales explicitados

La revisión de los 32 blobs clasificó 20 como defectuosos y 12 como pendientes
de recaptura/revisión. Además de los seis ejemplos iniciales de la auditoría se
confirmaron, entre otros:

- `gastos-fijos.png` muestra un `Runtime TypeError`;
- `ajustes-datos-negocio.png` afirma que el QR está disponible;
- `facturas-nueva.png` promete que «se genera el QR tributario»;
- `impuestos-resumen.png` conserva rótulos fiscales anteriores;
- varias acciones de factura/presupuesto son círculos de 88×88 sin contexto;
- `recibos-automatico.png` enseña una factura, no el recibo anunciado;
- `facturas-enviar.png` es una tira de iconos sin la factura ni sus acciones;
- `inicio-accesos-rapidos.png` muestra «Nuevo cliente» donde se esperaba
  «Nuevo producto»;
- las dos capturas huérfanas son además antiguas.

Los dos textos de QR contradicen directamente el estado VeriFactu fail-closed
implantado. El nuevo contrato impide que vuelvan a mostrarse mientras no se
recapturen y aprueben.

## Contrato implantado

Un manifiesto central declara para cada uno de los 32 PNG:

- uso referenciado o huérfano explícito;
- ruta, `stateId`, setup y marcadores visibles previstos;
- SHA-256, decodificación PNG/CRC y dimensiones exactas;
- commit/fecha del asset, script y blob de fixture reconstruibles;
- viewport, DPR, locale y tema inferidos;
- `appCommit` y `capturedAt` nulos cuando no pueden demostrarse;
- estado `pending-review`, `known-defect` o `reviewed`, motivo y seguimiento.

El verificador falla ante ruta insegura/no mapeada —incluidos prefijos falsos y
segmentos `.`/`..` codificados—, contrato o contexto
ausente/duplicado, marcador vacío, PNG desconocido/fallback/huérfano no
declarado, PNG truncado/CRC inválido, hash o dimensiones distintas, `usage`
desconocido, procedencia inventada y revisión sin hash/commit/fecha, futura o
caducada. Commits, blob del fixture, árbol fuente y bytes del PNG se contrastan
contra Git; una cadena hexadecimal autoatestiguada no basta. Se exige además
la causalidad `app/script → captura → asset → HEAD`, tanto por fechas como por
ancestría. Para preservar esas atestaciones, los PR que incorporen capturas
`generated` requieren merge commit y no squash/rebase. Una revisión solo puede
durar el máximo explícito de 90 días.

`manual:verify:contract` permite comprobar que el inventario representa con
exactitud la deuda conocida. `manual:verify` es deliberadamente estricto y
continúa en rojo con el resumen «0/30 aprobadas; 12 pendientes; 20
defectuosas» hasta que los siguientes bloques recapturen y revisen los assets.
Así un test estructural verde ya no se presenta como cobertura visual.

## Contención de publicación

El componente recibe del servidor el resultado del contrato completo, no solo
el rótulo de estado. La página estática parte de una contención fail-closed y el
cliente reevalúa `validUntil`; así una revisión que caduque después del
despliegue deja de publicar el PNG sin esperar otro build.

- `reviewed` vigente y ligado a hash/commit: renderiza el PNG tras hidratar;
- `pending-review`: muestra «Captura pendiente de revisión»;
- `known-defect`: muestra «Captura retirada por estar desactualizada».

Los textos y pasos del manual permanecen disponibles. No se borra ni altera
ningún PNG en este bloque, pero ningún blob legacy se publica como evidencia
visual aprobada.

## Límites atómicos

- AUD-P2-02: manifiesto, verificador, inventario explícito y cuarentena;
- AUD-P2-03: abrir, corregir/recapturar y aprobar contenido ligado al hash;
- AUD-P2-04: generador determinista, commit real, marcadores DOM, fallo duro y
  matriz 1440/1024/768/390 × claro/oscuro.

No se modifican secciones del manual, PNG, generador, navegación, cálculos,
datos reales, Supabase remoto, Stripe, dominio, documentos emitidos,
snapshots, sellos, hashes fiscales ni VeriFactu.

## Evidencia local final

- verificador dirigido: 1 archivo y 12 pruebas aprobadas;
- contrato manual: 6 archivos y 34 pruebas aprobadas;
- suite completa: 480 archivos aprobados, 11 omitidos; 3433 pruebas aprobadas,
  17 omitidas;
- ESLint, TypeScript y build de producción (106 páginas estáticas): correctos;
- migraciones: 25 convenciones y 16 rollbacks válidos;
- fixtures de facturas: 403/403 sintéticos válidos, 0 privados;
- smoke HTTP del build: 15/15 secciones activas responden 200, los 31 usos
  visuales viajan como `approved: false` y ningún PNG legacy aparece como
  `<img>` en el HTML;
- puerta estricta: fallo esperado y explícito por 0/30 capturas aprobadas.

Quedan pendientes push, PR, checks remotos, merge a `main` y verificación
pública posterior al despliegue.
