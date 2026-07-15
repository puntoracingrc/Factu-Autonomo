# Protocolo de anonimización irreversible

## Principio

Redactar visualmente un PDF no basta. El original no entra en Git, Vercel, logs, analítica, IA ni almacenamiento de la aplicación. Solo el resultado saneado puede proponerse al corpus.

## Capas que deben revisarse

1. Nombre de archivo y rutas internas.
2. Texto nativo y orden de lectura.
3. Texto OCR.
4. XMP y propiedades del documento.
5. AcroForm y valores por defecto.
6. XFA.
7. Anotaciones, comentarios y enlaces.
8. Adjuntos y nombres incrustados.
9. Texto oculto, capas opcionales y contenido fuera de página.
10. QR, códigos de barras y firmas visuales.
11. Miniaturas e imágenes incrustadas.
12. Revisiones, objetos huérfanos e incremental updates.
13. Nombre del PDF final.

El escáner busca NIF/NIE/CIF, IBAN, NRC/CSV, teléfono, correo, código postal y valores originales conocidos. Su informe contiene solo recuentos y hash. Los identificadores sintéticos de reemplazo pueden registrarse como tales, pero los valores originales conocidos siguen bloqueando la admisión.

## Proceso de doble revisión

1. Operador A registra autorización y anonimiza en un directorio temporal.
2. Se aplana o reconstruye el PDF cuando sea necesario, conservando únicamente la estructura útil.
3. Se eliminan metadatos, formularios residuales, XFA, anotaciones, adjuntos y JavaScript.
4. Se ejecuta el escáner automatizado con una lista local de valores originales.
5. Operador B revisa todas las páginas renderizadas, QR/barras y capas técnicas.
6. Se calcula el hash final; cualquier cambio posterior invalida la revisión.
7. El manifiesto registra dos revisores y la fecha, sin identidad del contribuyente.
8. El original y la lista de valores se purgan del entorno temporal.

Si una capa no puede comprobarse o la estructura necesaria no puede conservarse sin PII, el candidato se rechaza. No se admite mediante una excepción manual.
