# Mantenimiento del manual de usuario

Manual público: **`/ayuda`** (código en `src/lib/manual/`, UI en `src/app/ayuda/`).

## Regla de oro

**Cada cambio que altere cómo usa la app una persona → actualizar el manual en el mismo commit/PR.**

Los agentes de Cursor tienen la regla `.cursor/rules/manual-usuario.mdc` para no olvidarlo.

## Estructura

```
src/lib/manual/
  types.ts              # Tipos ManualSection, ManualStep
  route-help.ts         # pathname → slug (robotito 🤖+?)
  sections/
    index.ts            # Lista ordenada de secciones
    primeros-pasos.ts   # Una sección = un archivo
    facturas.ts
    ...
public/ayuda/capturas/  # PNG referenciados en screenshot.src
```

## Añadir o editar una sección

1. Edita o crea `src/lib/manual/sections/<slug>.ts`.
2. Registra la sección en `sections/index.ts` (`order` define el orden en el índice).
3. Si es sección nueva, añade prueba en `sections.test.ts` (implícita al iterar slugs).
4. Añade captura en `public/ayuda/capturas/<archivo>.png` o deja el placeholder hasta tenerla.

## Nueva ruta en la app

1. Añade el mapeo en `route-help.ts` → `resolveManualSlug()`.
2. Añade caso en `route-help.test.ts`.
3. Si la ruta es navegación principal, debe aparecer en `APP_ROUTES_WITH_MANUAL` (`coverage.ts`).

## Robotito de ayuda (cabecera)

`FactuHelpButton` usa `manualHelpHref(pathname)`. Si la ruta no está mapeada, no se muestra el botón.

## Capturas

- Formato: PNG, ancho ~720px (móvil o escritorio según lo que se explique).
- Nombre estable: `facturas-recordatorio.png`, `gastos-filtros.png`, etc.
- Misma ruta que en `screenshot.src` (p. ej. `/ayuda/capturas/facturas-recordatorio.png`).

## Verificación local

```bash
npm test -- src/lib/manual/
```

Incluye cobertura de rutas principales y slugs únicos.

## Regenerar capturas

Con el servidor de desarrollo en el puerto 3000:

```bash
npx playwright install chromium   # solo la primera vez
npm run manual:screenshots
```

Datos de demo: `scripts/manual-demo-data.json`. Salida: `public/ayuda/capturas/*.png`.
Tras cambios de UI, actualiza textos del manual y vuelve a ejecutar este comando.

## Qué revisar tras un cambio de producto

| Cambio en la app | Revisar en manual |
|------------------|-------------------|
| Nuevo botón o filtro | Paso correspondiente en la sección |
| Renombre de etiqueta | Texto del paso y `**negrita**` |
| Nueva exportación CSV/PDF | Sección gastos o impuestos |
| Flujo email/WhatsApp | Sección facturas o recordatorios |
| Reorden inicio (trimestre/arriba) | Sección inicio |
| Plan Pro / límites | Sección impuestos o primeros pasos |
