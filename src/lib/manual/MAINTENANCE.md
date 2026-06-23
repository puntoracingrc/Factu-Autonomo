# Mantenimiento del manual de usuario

Manual público: **`/ayuda`** (código en `src/lib/manual/`, UI en `src/app/ayuda/`).

## Regla de oro

**Cada cambio que altere cómo usa la app una persona → actualizar el manual y, si aplica, sustituir las capturas en el mismo commit/PR.**

Los agentes de Cursor tienen la regla `.cursor/rules/manual-usuario.mdc` para no olvidarlo.

## Estructura

```
src/lib/manual/
  types.ts              # Tipos ManualSection, ManualStep
  route-help.ts         # pathname → slug (robotito 🤖+?)
  screenshots.ts        # Lista de capturas referenciadas
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

4. Revisa visualmente los PNG en `public/ayuda/capturas/`.
5. Commitea **código + PNG** juntos.
6. Comprueba:

```bash
npm test -- src/lib/manual/
```

El test `screenshots.test.ts` **falla** si falta algún archivo referenciado en el manual.

## Añadir una captura nueva

1. Añade `screenshot: { src: "/ayuda/capturas/mi-pantalla.png", alt: "..." }` al paso.
2. Añade la toma en `scripts/capture-manual-screenshots.mjs` (mismo nombre de archivo).
3. Ejecuta `npm run manual:screenshots`.

## Renombrar o eliminar una captura

1. Cambia o borra `screenshot` en la sección del manual.
2. Actualiza el script de capturas si el nombre cambió.
3. Borra el PNG obsoleto de `public/ayuda/capturas/` para no dejar basura.
4. Regenera y ejecuta los tests.

## Nueva ruta en la app

1. Añade el mapeo en `route-help.ts` → `resolveManualSlug()`.
2. Añade caso en `route-help.test.ts`.
3. Si la ruta es navegación principal, debe aparecer en `APP_ROUTES_WITH_MANUAL` (`coverage.ts`).

## Capturas — criterios

- Formato: **PNG**, viewport ~720px (script Playwright).
- Nombre estable: `facturas-recordatorio.png`, `gastos-filtros.png`, etc.
- `screenshot.src` siempre como `/ayuda/capturas/<nombre>.png`.
- Datos de demo coherentes: `scripts/manual-demo-data.json`.

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
