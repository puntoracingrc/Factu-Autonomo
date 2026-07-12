# Mantenimiento del manual de usuario

Manual público: **`/ayuda`** (código en `src/lib/manual/`, UI en `src/app/ayuda/`).

## Regla de oro

**Cada cambio que altere cómo usa la app una persona → actualizar el manual y, si aplica, sustituir las capturas en el mismo PR atómico.**

Los agentes de Cursor tienen la regla `.cursor/rules/manual-usuario.mdc` para no olvidarlo.

## Estructura

```
src/lib/manual/
  types.ts              # Tipos ManualSection, ManualStep
  route-help.ts         # pathname → slug (robotito 🤖+?)
  screenshots.ts        # Lista de capturas referenciadas
  screenshot-manifest.json # Ruta/estado, hash, dimensiones y procedencia
  screenshot-verifier.ts   # Verificación de contrato y artefactos
  sections/
    index.ts            # Lista ordenada de secciones
    primeros-pasos.ts   # Una sección = un archivo
    facturas.ts
    ...
public/ayuda/capturas/  # PNG referenciados en screenshot.src
scripts/
  capture-manual-screenshots.mjs
  manual-demo-data.json
```

## Flujo cuando cambia la UI

Antes de cerrar una tarea de producto, revisa si cambió algo visible para el usuario:

- pantalla, botón, campo, ruta o navegación;
- regla de plan Gratis/Pro;
- flujo de cuenta, nube, importación, Veri*Factu o escaneo IA;
- texto que pueda cambiar cómo entiende la app una persona.

Si cualquiera aplica, actualiza el manual en el mismo cambio.

1. Edita el paso afectado en `src/lib/manual/sections/<slug>.ts`.
2. Arranca la app: `npm run dev`.
3. Regenera capturas (sustituye los PNG existentes):

```bash
npm run manual:screenshots
```

4. Revisa visualmente los PNG contra el commit exacto de la app y actualiza
   `screenshot-manifest.json`: ruta/estado, marcadores, hash, dimensiones,
   `appCommit`, `capturedAt`, fecha y vigencia de la revisión.
5. Solo `review.status: "reviewed"` permite publicar el PNG. Una captura
   pendiente o defectuosa se sustituye en el manual por un aviso, nunca por
   bytes legacy no certificados.
6. Mantén **código + PNG + manifiesto** en el mismo PR atómico. La secuencia de
   commits debe conservar la procedencia: commit de app/fixture, commit que
   incorpora el PNG y, después, commit del manifiesto que referencia ambos.
   Un PR con contextos `generated` se fusiona mediante **merge commit**, nunca
   squash/rebase: esos métodos reescriben los commits atestiguados y deben hacer
   fallar la verificación posterior de `main`.
7. Comprueba:

```bash
npm test -- src/lib/manual/
```

El test `screenshots.test.ts` falla ante referencias o PNG sin contrato,
huérfanos no declarados, fallback, PNG no decodificable/CRC inválido, hash,
dimensiones, ruta/estado, procedencia o revisión incoherentes. También comprueba
que commits, blob de fixture y bytes del asset existan realmente en Git. Por
eso CI obtiene el histórico completo. `npm run manual:verify:contract` valida
el contrato e imprime siempre el número de capturas aprobadas, pendientes y
defectuosas.

`npm run manual:verify` es la puerta de cobertura: exige que toda captura
referenciada esté revisada y vigente. Mientras AUD-P2-03/AUD-P2-04 sigan
abiertos debe fallar de forma explícita; no se usa un verde estructural para
ocultar o convertir esa deuda en aprobación visual.

## Añadir una captura nueva

1. Añade `screenshot: { src: "/ayuda/capturas/mi-pantalla.png", alt: "..." }` al paso.
2. Registra el mismo `src` en `screenshot-manifest.json` con ruta, `stateId`,
   setup, marcadores y estado `pending-review`.
3. Añade la toma en `scripts/capture-manual-screenshots.mjs` (mismo nombre de archivo).
4. Ejecuta `npm run manual:screenshots`.
5. Revisa el resultado y solo entonces cambia el contrato a `reviewed`, ligado
   al hash y commit exactos.

Una procedencia `generated` debe declarar:

- `appCommit`: commit exacto servido al capturar;
- `scriptCommit` y `fixtureGitBlob`: commit del generador y blob real de
  `scripts/manual-demo-data.json`;
- `fixtureSha256`: SHA-256 de ese blob;
- `sourceTreeSha256`: SHA-256 de la salida exacta de
  `git ls-tree -r --full-tree <appCommit>`;
- `capturedAt`, viewport, DPR, locale, tema y navegador.

El verificador reconstruye esas ligaduras desde Git; no basta con escribir una
cadena hexadecimal con formato válido. También exige la secuencia causal
`appCommit/scriptCommit → captura → assetCommit → HEAD`: los commits de app y
script deben ser ancestros del asset, y sus fechas no pueden ser posteriores a
la toma ni el asset anterior a ella.

## Renombrar o eliminar una captura

1. Cambia o borra `screenshot` en la sección del manual.
2. Actualiza el manifiesto y el script si el nombre cambió.
3. Borra el PNG obsoleto de `public/ayuda/capturas/` para no dejar basura.
4. Regenera, revisa y ejecuta los tests.

## Nueva ruta en la app

1. Añade el mapeo en `route-help.ts` → `resolveManualSlug()`.
2. Añade caso en `route-help.test.ts`.
3. Si la ruta es navegación principal, debe aparecer en `APP_ROUTES_WITH_MANUAL` (`coverage.ts`).
4. Añade su template Next a `MANUAL_SCREENSHOT_ROUTE_TEMPLATES` en
   `screenshot-verifier.ts`. La regresión compara esa lista con todos los
   `src/app/**/page.tsx` que resuelven ayuda contextual, para impedir deriva.

## Capturas — criterios

- Formato: **PNG**. El contexto legacy de 720×1280/DPR 2/claro se registra
  como inferido, no como matriz aprobada.
- Nombre estable: `facturas-recordatorio.png`, `gastos-filtros.png`, etc.
- `screenshot.src` siempre como `/ayuda/capturas/<nombre>.png`.
- Datos de demo coherentes: `scripts/manual-demo-data.json`.
- Nunca inventar `capturedAt` o `appCommit`: si no se pueden demostrar, la
  procedencia queda legacy y la captura no se renderiza.

## Qué revisar tras un cambio de producto

| Cambio en la app | Manual | Capturas |
|------------------|--------|----------|
| Nuevo botón o filtro | Paso en la sección | Regenerar PNG de esa pantalla |
| Renombre de etiqueta | Texto del paso | Regenerar si el texto visible cambió en la imagen |
| Reorden inicio / cabecera | Sección inicio | `inicio-recordatorios.png`, `inicio-accesos-rapidos.png`, `avisos-centro.png` |
| Resumen fiscal en Impuestos | Sección inicio + impuestos | `impuestos-trimestre.png`, `impuestos-resumen.png` |
| Logo Factu / manual | Secciones ayuda | Cabeceras en `/ayuda` si cambian |
| Exportación CSV/PDF | gastos / impuestos | `gastos-exportar.png`, `impuestos-csv.png`, etc. |
| Importador de datos | Sección importación + planes si aplica | Captura de `/importar` cuando cambie la pantalla |
| Cambios Gratis/Pro | Sección afectada + precios si aplica | Captura si cambia la pantalla de precios |
