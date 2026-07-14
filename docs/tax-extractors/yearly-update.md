# Actualización anual

Para habilitar un extractor profundo en un nuevo ejercicio:

1. Obtener únicamente fuentes oficiales AEAT, BOE, TGSS o autoridad
   territorial competente.
2. Registrar URL, fecha de revisión, vigencia y hash de la definición.
3. Comparar páginas, casillas, claves, subclaves y formatos estructurados con el
   ejercicio anterior.
4. Versionar diccionarios anuales (190, 193, 296, 349 y otros que cambien).
5. Añadir fixtures sintéticos: nativo, escaneado, estructurado, incompleto,
   borrador, presentado, corrección, baja confianza, conflicto y otra autoridad.
6. Ejecutar la matriz crítica temporal. Ninguna declaración anterior puede
   convertirse en obligación actual por defecto.
7. Pasar revisión fiscal, privacidad, seguridad y accesibilidad.
8. Cambiar `CLASSIFICATION_ONLY` a `DEEP_SUPPORTED` solo cuando las pruebas de
   campos y reconciliación estén verdes.

Si la estructura oficial cambia sin revisión, el extractor debe fallar cerrado
con `UNSUPPORTED_DOCUMENT` o `MANUAL_REVIEW`.
