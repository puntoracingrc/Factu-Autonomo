# Extractores de máxima prioridad v2

Revisión: 2026-07-14
Contrato: `1.0.0`
Catálogo: `fiscal-document-extractors.2026-07.v2`
Mapeo a preguntas: `tax-document-question-mapping.2026-07.v2`

## Fuentes oficiales revisadas

- [Modelo 035 y sus causas/régimen](https://sede.agenciatributaria.gob.es/Sede/Ayuda/035.html)
- [Modelo 111 e instrucciones de casillas](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/pagos-cuenta/modelo-111-reten_____moniales-imputaciones-renta-autoliquidacion_/instrucciones.html)
- [Modelo 115](https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH02.shtml)
- [Modelo 130 e instrucciones](https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html)
- [Modelo 131 e instrucciones](https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-131-irpf______sionales-estimacion-objetiva-fraccionado_/instrucciones.html)
- [Modelo 180 y resumen de casillas](https://sede.agenciatributaria.gob.es/Sede/manuales/ejercicio-2016/modelo-180/2-normas-cumplimentacion-modelo-180/2_4-resumen-datos-incluidos-declaracion.html)
- [Modelo 184](https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI04.shtml)
- [Modelo 190](https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI10.shtml)
- [Modelo 303 e instrucciones 2025](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2025.html)
- [Modelo 349 e instrucciones](https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI28/instr_mod_349.pdf)
- [Modelo 369 y diseño de presentación](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-369.html)
- [Modelo 390 e instrucciones](https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G412/instr390.pdf)

## Política determinista

1. El clasificador exige código y frases estructurales oficiales. Una mención
   aislada al número no basta.
2. Solo una copia con señales de presentación y metadatos temporales válidos
   produce hechos. Borradores y plantillas quedan en revisión manual.
3. Los NIF se enmascaran en el sobre; no se exige coincidencia con el perfil y
   no se copian a los hechos.
4. Cada hecho queda limitado al ejercicio o periodo del documento. Siempre
   requiere confirmación humana antes de modificar el test.
5. Solo se extraen señales positivas explícitas. Ceros, blancos y ausencia de
   filas no se convierten en `NO`.
6. Las secciones impresas de un 303 o 390 no acreditan un régimen: hace falta
   marca, casilla positiva o campo positivo asociado.
7. Las claves de 349 se interpretan individualmente y nunca acreditan ROI.
8. Un 369 acredita operaciones del periodo, no la vigencia censal OSS/IOSS.
9. Una baja 035 se conserva como evento; no produce una respuesta negativa sin
   reconciliar la cronología completa.
10. No se conservan el archivo, el OCR bruto, nombres de fichero, nombres de
    terceros ni listados nominativos. Solo los hechos que el usuario confirma
    pueden cruzar la frontera de persistencia.

## Casos sintéticos cubiertos

- presentado frente a borrador;
- año y periodo válidos;
- casilla positiva, cero y sección vacía;
- claves de percepción y de operación exactas;
- alta y baja OSS/IOSS;
- actividad explícita frente a simple presentación del 184;
- ausencia de inferencias ROI, exoneración 390 o profesional desde un 111
  agregado;
- trazabilidad por página, etiqueta, casilla, método y confianza.
