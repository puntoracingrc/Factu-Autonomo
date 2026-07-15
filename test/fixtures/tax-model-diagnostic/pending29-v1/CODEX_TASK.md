# Tarea para Codex: incorporar las 29 familias pendientes

1. Importa `corpus-manifest.json` y registra las 29 familias documentales.
2. Ejecuta el validador incluido antes de admitir los fixtures.
3. Usa los 116 PDF de `pdfs/native/` para clasificación y extracción con capa de texto.
4. Usa los 232 PDF rasterizados para probar OCR, rotación y compresión.
5. Compara cada resultado con el manifiesto individual de `manifests/`.
6. Convierte `mustNotInfer` en pruebas negativas obligatorias.
7. Los casos `incomplete_ambiguous` deben terminar en revisión o rechazo; nunca deben cerrar preguntas críticas.
8. Los borradores vacíos de los modelos 720 y 721 no prueban que no exista obligación.
9. No consideres ninguno de estos PDF como presentado, válido o generado por el servicio vivo de AEAT/TGSS.
10. Mantén las salidas reales anonimizadas de AEAT/TGSS en una capa de validación separada cuando estén disponibles.

Criterio de aceptación mínimo:

- 348 clasificaciones correctas.
- Campos esperados extraídos en las variantes nativas.
- OCR contrastado en las variantes rasterizadas.
- Cero inferencias prohibidas.
- Todos los casos incompletos derivados a revisión/rechazo.
