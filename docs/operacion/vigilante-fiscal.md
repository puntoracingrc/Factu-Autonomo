# Vigilante fiscal de fuentes oficiales

## Objetivo y límite de seguridad

El vigilante fiscal comprueba diariamente fuentes oficiales para detectar
publicaciones nuevas, cambios de contenido y alteraciones del calendario. Es un
sistema de aviso y revisión: **nunca cambia automáticamente fechas, modelos,
reglas fiscales ni cálculos de la aplicación**.

Toda señal nueva queda pendiente de revisión humana. La existencia de una
publicación tampoco demuestra por sí sola su vigencia, alcance, aplicabilidad a
un contribuyente o fecha de efecto.

## Fuentes supervisadas

El catálogo cerrado y versionado se encuentra en
`config/fiscal-watch/sources.v1.json`. Incluye:

- el RSS oficial de BOE para Sistema tributario y el sumario diario de la API
  pública del BOE;
- los RSS oficiales de todas las novedades y de análisis/criterios de la AEAT;
- las páginas oficiales de novedades de IRPF, IVA e Impuesto sobre Sociedades;
- la página anual «Novedades para este año» del Calendario del contribuyente;
- los cinco calendarios iCalendar públicos que ya consume el Calendario fiscal.

El RSS tributario es la fuente BOE principal. El sumario diario actúa como una
cobertura complementaria con recuperación acotada de siete días y solo admite
disposiciones `BOE-A` de la sección oficial «I. Disposiciones generales»; personal,
oposiciones y contratación quedan fuera antes de analizar el título.

INFORMA se ofrece como [enlace oficial para la revisión
manual](https://www2.agenciatributaria.gob.es/ES13/S/IAFRIAFRIINF). No se
invierten ni automatizan sus endpoints internos porque la AEAT no publica una
API para ese servicio.

Las URLs no se construyen a partir de texto recibido: cada origen y su tipo
están incluidos expresamente en la allowlist. El motor exige HTTPS, limita
redirecciones, tiempo, MIME, `Content-Length` y bytes reales leídos.

## Ejecución y persistencia

`.github/workflows/fiscal-watch.yml` se ejecuta una vez al día, a las 08:15 UTC,
y admite una ejecución manual. Usa únicamente el `GITHUB_TOKEN` efímero del
workflow con permisos de lectura del repositorio y escritura de Issues.

El estado técnico de cada fuente se guarda en un Issue cerrado y acotado. Las
novedades se materializan como Issues abiertos etiquetados para revisión. Un
aviso puede agrupar un lote acotado de diferencias de la misma fuente; el
contador de Admin refleja avisos pendientes, no el número de disposiciones o
eventos. Esto evita migraciones, datos de usuarios y secretos nuevos, y no crea
commits ni despliegues diarios.

La primera ejecución crea una línea base conservadora. No convierte todas las
entradas existentes en cientos de avisos; abre una única revisión de línea base
para confirmar que la cobertura inicial es correcta.

Cada estado queda ligado a las versiones del catálogo y del contrato del parser.
Cambiar cualquiera de ellas invalida la comparación anterior y exige una nueva
línea base silenciosa, en lugar de fabricar alertas por un cambio de código.

Cerrar un Issue de cambio significa únicamente «revisado». Si una modificación
requiere cambiar el producto, debe hacerse en un PR separado, con su fuente
oficial, pruebas y revisión fiscal correspondiente.

## Semáforo en Admin

- **Rojo — vigilancia interrumpida:** último workflow fallido, respuesta
  oficial inválida o última ejecución correcta hace más de 36 horas.
- **Ámbar — revisión pendiente:** línea base o cambios detectados pendientes de
  revisar.
- **Verde — al día:** ejecución reciente correcta y sin avisos abiertos.
- La ausencia de publicaciones nuevas es normal y no genera un rojo.

El panel solo muestra títulos breves y metadatos públicos saneados. Los botones
abren el Issue, la ejecución de GitHub o la URL oficial exacta. No expone cuerpos
de estado, hashes, cabeceras, credenciales ni datos de usuarios.
Las lecturas públicas de GitHub usan una caché compartida de quince minutos; la
respuesta autenticada de Admin sigue siendo privada y `no-store`.

## Qué puede hacer el motor

- descargar, validar y normalizar formatos soportados;
- detectar altas y cambios de entradas en fuentes de ventana móvil sin inferir
  bajas;
- detectar cambios del horizonte futuro en calendarios completos;
- conservar identificadores oficiales, títulos y evidencia pública anterior y
  posterior para que una persona determine los modelos afectados;
- crear avisos deduplicados y trazables a la fuente original.

## Qué exige revisión humana

- vigencia jurídica y disposiciones transitorias;
- contribuyentes u operaciones afectados;
- fecha de entrada en vigor;
- plazo general, domiciliación, festivos y excepciones;
- modelos realmente afectados;
- cualquier cambio de código o contenido fiscal.

Para el BOE, el PDF firmado es la publicación oficial auténtica. Los contenidos
informativos de la AEAT ayudan a operar, pero no sustituyen el diario oficial ni
el criterio de un asesor.

## Operación ante un aviso

1. Abrir el aviso desde `/admin`.
2. Acceder a la fuente oficial enlazada y comprobar el documento completo.
3. Determinar si afecta al calendario, a una ficha de Modelo, a documentación o
   a reglas del producto.
4. Si no aplica, documentarlo y cerrar el Issue.
5. Si aplica, crear un PR pequeño y separado; enlazar el aviso, la fuente y la
   fecha de revisión.
6. Mantener el aviso abierto hasta que el cambio publicado y probado esté en
   producción.

Si el panel está rojo, primero debe repararse el acceso o el parser. No se deben
reemplazar URLs ni asumir fechas por memoria para silenciar la alerta.
