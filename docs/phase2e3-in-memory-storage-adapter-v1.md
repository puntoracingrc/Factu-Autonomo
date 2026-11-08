# 2E.3 In-memory storage adapter

Marker: `PHASE2E3_IN_MEMORY_STORAGE_ADAPTER_V1`

Estado: adapter fake/in-memory / datos sinteticos / sin persistencia.

## Alcance

`createInMemoryLocalStorageResilienceAdapter` permite probar lectura, escritura y borrado sobre un objeto en memoria. Sirve para acceptance local y para comprobar politicas sin tocar datos del usuario.

## Reglas

- Solo acepta claves con namespace `SYNTHETIC_ONLY_`.
- Rechaza claves no sinteticas sin eco de la clave completa.
- Clona estado de entrada y snapshots de salida.
- `clearSyntheticOnly` solo elimina entradas sinteticas.
- `summarizeInMemoryStorageState` devuelve conteos, no valores.

## Limites

- No persistencia.
- No lectura ni escritura real.
- No documentos reales, facturas reales ni numeracion real.
- No UI, rutas, navegacion, Supabase ni produccion.
