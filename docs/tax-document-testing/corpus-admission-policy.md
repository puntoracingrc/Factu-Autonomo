# Política de admisión del corpus fiscal

## Requisitos obligatorios

- PDF parseable, no cifrado, no truncado y con cabecera válida.
- Máximo 25 MiB, 200 páginas y 20.000 puntos por dimensión.
- Sin JavaScript, adjuntos ni objetos críticos malformados.
- SHA-256 coincidente y no duplicado.
- Recuento de páginas observado coherente con el manifiesto.
- URL de fuente informativa HTTPS en host oficial AEAT, BOE o Seguridad Social.
- Manifiesto completo, versión exacta y sin coerción de código, ejercicio o periodo.
- Escáner de privacidad sin bloqueos y revisión visual humana.

Los enlaces externos del PDF se ignoran y se registran como advertencia; nunca son acciones de presentación. Una captura parcial no prueba ausencia de información fuera del recorte. Un documento incompleto solo puede admitirse con revisión, jamás como evidencia suficiente para omitir preguntas.

## Fuentes reales

`REAL_ANONYMIZED` y `HOLDOUT` requieren autorización registrada, todas las capas de privacidad marcadas como comprobadas y dos revisores. La verdad esperada debe ser verificada por una persona y no copiarse de la salida del extractor.

## Fallo cerrado

Un layout desconocido produce `KNOWN_FAMILY_UNKNOWN_LAYOUT` o `UNSUPPORTED_LAYOUT_NEEDS_REVIEW`. Un documento desconocido produce `UNSUPPORTED_DOCUMENT`. Ninguno permite autoconfirmación. El rechazo no se convierte en cero, ausencia de obligación ni resultado satisfactorio silencioso.

## Corpus privado

Los originales y holdouts pueden permanecer en almacenamiento privado autorizado. CI debe verificar hashes con permisos mínimos, no publicar artefactos y no mostrar nombres, rutas ni valores extraídos en logs.
