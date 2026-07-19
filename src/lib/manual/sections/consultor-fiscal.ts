import type { ManualSection } from "../types";

export const consultorFiscalSection: ManualSection = {
  slug: "consultor-fiscal",
  title: "Consultor fiscal",
  summary:
    "Analiza de forma orientativa manutención, atenciones y gastos corrientes de vehículo.",
  order: 9.5,
  intro: [
    "La primera opción de **Asesoría fiscal** es **Configurar mi actividad**. Su cuestionario determinista separa persona física, sociedad o entidad, territorio, IRPF, IVA, retenciones y operaciones especiales para orientar qué modelos pueden corresponder.",
    "El **Consultor fiscal** ejecuta primero reglas locales, versionadas y auditables. Si el fallback opcional está habilitado y no existe coincidencia, puede pedir a una IA una clasificación auxiliar; nunca crea asientos ni sustituye a tu asesor.",
    "La versión Beta solo cubre autónomos persona física en estimación directa y territorio común. Canarias, territorios forales, Ceuta/Melilla y sociedades se muestran como no implementados para evitar aplicar una regla incorrecta.",
    "Puedes analizar un gasto ya registrado o introducir un caso manual. El análisis no crea una copia del gasto ni modifica su estado.",
    "Para configurar tu actividad puedes mezclar modelos, certificados, informes y capturas de la AEAT. El lector trabaja en este dispositivo, solo incorpora los campos que confirmes y deja el resto para que los respondas manualmente.",
  ],
  steps: [
    {
      title: "1. Completar y mantener el test de autónomos",
      paragraphs: [
        "Abre la primera opción de **Asesoría fiscal → Configurar mi actividad**. Si ya terminaste el test, verás el último resultado guardado: pulsa **Editar respuestas** para corregirlo. **Empezar de nuevo** borra las respuestas, los datos documentales confirmados y el resultado después de pedirte confirmación.",
        "La ayuda documental es opcional. Arrastra o selecciona en una única zona hasta **8 archivos** PDF, PNG, JPG o WebP, mezclados y sin tener que clasificarlos. Puedes añadir o quitar archivos de la cola; el lector no empieza automáticamente y espera a que pulses **Analizar archivos**. El análisis se realiza en este dispositivo y los originales no se envían ni se guardan.",
        "Abre **¿Qué modelos y documentos reconoce el lector?** para consultar las 30 familias de modelos fiscales, los 9 documentos sin número y las capturas de Hacienda compatibles. En **Cómo encontrar la información en Hacienda** tienes la ruta Área personal → Mis datos censales para localizar **Mis actividades económicas**, **Mi situación tributaria** y **Mis obligaciones**. Un archivo que no se reconoce no responde ninguna pregunta.",
        "Después del análisis revisa **Archivos identificados** y **Datos leídos para que los confirmes**. Desmarca cualquier propuesta que no quieras usar, marca la confirmación humana y pulsa **Confirmar datos seleccionados**. Si dos archivos o una respuesta anterior contienen valores distintos, el sistema avisa y no sustituye el dato sin tu confirmación. Puedes repetir el proceso con más archivos: cada confirmación se suma al perfil ya guardado.",
        "Recorre los bloques A–N. Ninguna respuesta manual aparece seleccionada antes de que la pulses; **No lo sé** solo se muestra en las preguntas que admiten conservar esa duda. Los datos obtenidos de un documento confirmado aparecen en verde, cuentan como respondidos y siguen siendo editables. El desplegable **Por qué lo preguntamos y qué documento ayuda** explica cada término, ofrece un ejemplo y señala los modelos relacionados.",
        "Usa **Guardar y continuar** para pasar al bloque siguiente y **Revisar respuestas** al terminar. Puedes generar el resultado con datos pendientes, pero antes debes confirmar que has revisado la situación del ejercicio y pulsar **Generar mis modelos**. Las respuestas, su procedencia y el resultado se guardan en tu perfil; los PDF y las capturas no.",
        "La página final distingue **Probablemente necesarios**, **Podrían ser necesarios**, **Falta información** y, cuando existen, **Añadidos por ti**. Los verdes ya están incluidos automáticamente; los posibles se conservan por precaución y los que necesitan información quedan incluidos provisionalmente hasta resolver la duda. Pulsa **Editar respuestas** y vuelve a generar para sustituir el resultado anterior con la nueva configuración.",
      ],
      tip: "El test guarda una orientación en tu perfil; no presenta declaraciones, no modifica tu censo y no sustituye la revisión profesional.",
    },
    {
      title: "2. Preparar el perfil fiscal para gastos",
      paragraphs: [
        "Abre **Consultor fiscal** desde el menú **Más** en móvil o desde la barra lateral en escritorio.",
        "Elige **Importar certificado censal**, **Rellenar manualmente** o **Continuar sin completar**. Ninguna opción bloquea el acceso al Consultor.",
        "La importación admite PDF con texto seleccionable. Comprueba que el NIF coincide, revisa actividad, IAE, territorio y regímenes, y pulsa **Confirmar y guardar**. El archivo, su texto y el CSV no se conservan; solo se guarda el perfil fiscal estructurado y su procedencia.",
        "Si aparece un CSV puedes cotejarlo en la Sede de la AEAT. Trátalo con cautela porque permite acceder al documento. Un PDF escaneado sin texto debe completarse manualmente en esta versión y nunca se envía automáticamente a OCR o IA.",
        "Si continúas sin datos, el motor intenta el análisis con lo que conoce. Los datos necesarios aparecen como pendientes y nunca se transforman en una conclusión negativa.",
      ],
    },
    {
      title: "3. Introducir el gasto",
      paragraphs: [
        "Selecciona opcionalmente un gasto existente. El Consultor reutiliza sus datos y el perfil del negocio; si el desglose de IVA o el documento original están bloqueados, te pide resolverlo en Gastos y no convierte esos importes en ceros.",
        "Para un caso que aún no está registrado, indica concepto, fecha, proveedor opcional, medio de pago y justificante. Base, IVA y total solo aparecen si activas **También quiero calcular cuánto podría deducirme**.",
        "Si omites los importes, el motor conserva que son desconocidos: puede orientar y pedir condiciones, pero no calcula cantidades ni convierte su ausencia en cero.",
        "Pulsa **Analizar gasto**. Los datos no se incorporan a Gastos ni se contabilizan.",
        "Si aparece el aviso de IA, debes aceptarlo antes de habilitar el fallback. El cálculo local funciona sin enviarlo al proveedor; la llamada externa solo se intenta tras un resultado **Sin regla compatible**, con sesión autenticada y usando datos mínimos redactados.",
      ],
      tip: "Describe el concepto con precisión, por ejemplo «comida cliente», «gasolina» o «peaje».",
    },
    {
      title: "4. Responder las preguntas del gasto",
      paragraphs: [
        "El motor pide únicamente la información que necesita para la regla seleccionada. En comidas pregunta primero la finalidad; «comida» o «cena de empresa» nunca se resuelven automáticamente.",
        "Aunque el gasto tenga un número de documento, el Consultor puede pedirte confirmar si es factura completa, simplificada o recibo. El número por sí solo no habilita la deducción del IVA.",
        "Las respuestas ya dadas se conservan y permanecen editables. Al cambiar una opción se vuelve a evaluar el gasto; para textos e importes pulsa **Actualizar análisis**.",
        "Un día laborable por sí solo no demuestra la relación con la actividad. Añade proyecto, agenda, correo, ruta, parte de trabajo u otra prueba concreta.",
      ],
    },
    {
      title: "5. Interpretar el resultado del gasto",
      paragraphs: [
        "Los estados **Falta información**, **Necesita revisión**, **Sin regla compatible** y **Caso no implementado** son distintos. La ausencia de datos no se convierte automáticamente en rojo.",
        "Si no indicas territorio, tipo de contribuyente, régimen fiscal o actividad, el resultado permanece en **Falta información** y no anticipa importes. Un caso conocido pero fuera del alcance aparece como **Caso no implementado**.",
        "IRPF e IVA se muestran por separado, con importe estimado, porcentaje, límite, exceso, documentación y fuentes oficiales. La traza enumera la regla, condiciones, límite y operación determinista.",
        "Una salida externa se identifica como **Propuesta de IA pendiente de revisión** y muestra IRPF e IVA por separado sin convertir porcentajes o importes desconocidos en cero. Solo aparecen las fuentes verificadas que se suministraron y fueron citadas.",
        "El semáforo incluye texto e icono. Amarillo indica carga de prueba o revisión; rojo indica que la regla no propone deducción; sin determinar significa que todavía no existe conclusión.",
      ],
    },
    {
      title: "6. Revisar antes de contabilizar",
      paragraphs: [
        "El botón **Aplicar propuesta** está deshabilitado en esta fase. Revisa la regla y su versión, conserva las pruebas y consulta a un asesor cuando el caso dependa de interpretación.",
        "La IA no es una fuente jurídica. Una banda de confianza alta no permite aceptar la propuesta automáticamente, y cualquier fallo de proveedor o del validador conserva el resultado local.",
        "Los límites de manutención son diarios y conjuntos. El límite de atenciones es anual y conjunto para clientes y proveedores. La rotulación de un vehículo es solo un indicio y nunca activa por sí sola el 100 %.",
      ],
      tip: "No uses este análisis como declaración oficial ni como sustituto de los modelos tributarios.",
    },
    {
      title: "7. Preparar y analizar un lote de notificaciones",
      paragraphs: [
        "Abre **Notificaciones y expedientes** dentro de Asesoría fiscal con una cuenta confirmada. Arrastra los PDF a la zona de escaneo o pulsa **Elegir varios PDF**. Cada lote admite hasta **50 documentos**; cada PDF puede tener como máximo 4 MB y 80 páginas.",
        "Los archivos aparecen primero en una cola con nombre, tamaño y estado. Añadirlos no inicia el análisis: puedes completar el lote, quitar un archivo y después pulsar una sola vez **Analizar**. El flujo mantiene el mismo orden familiar del escáner de gastos: preparar la cola, analizar, revisar cada resultado y confirmar el guardado.",
        "Antes de admitir un PDF, el navegador calcula una huella SHA-256 del contenido y la compara con el propio lote y con las fichas guardadas en esa cuenta. El mismo contenido se considera duplicado aunque tenga otro nombre. El nombre solo se muestra mientras el archivo está en la cola.",
        "La lectura se ejecuta localmente. Un PDF con texto se lee directamente y, si contiene páginas de imagen, el navegador puede intentar OCR local. El documento no se envía a una IA ni a un proveedor externo. Si no existe texto suficiente, queda como **No reconocido** o **Necesita revisión**.",
        "Si un único PDF contiene varios actos, el lector intenta separarlos por sus títulos oficiales y conserva las copias o anexos sin título junto al acto anterior. Puede mostrar hasta 16 fichas del mismo PDF. Si detecta títulos incompatibles, una ambigüedad o no puede volver a comprobar un segmento con seguridad, bloquea la separación completa en vez de ocultar un resultado parcial.",
      ],
      tip: "El PDF permanece en el navegador durante el análisis y solo sale de él si eliges expresamente archivarlo en tu Google Drive.",
    },
    {
      title: "8. Revisar y guardar la ficha estructurada",
      paragraphs: [
        "Abre cada resultado del lote. La ficha puede mostrar tipo de documento, organismo, roles de los intervinientes sin su identidad, referencias administrativas seguras, importes, fechas impresas, documentación solicitada, plazo literal y consecuencias expresas, siempre que aparezcan bajo una estructura reconocida. Los campos conservan página, etiqueta y procedencia para poder contrastarlos con el PDF.",
        "La guía reúne **122 familias documentales**. El reconocimiento automático y local mantiene las 87 anteriores y añade 31 perfiles oficiales de rectificación, ampliación de plazo, presentación, ejecución, apoderamientos, REDEME/SII, certificados, subastas y devoluciones. Otras 4 familias sectoriales —pago en especie, insolvencia, aduanas y respuesta técnica VERI*FACTU— permanecen solo para consulta manual hasta activar su ámbito. Dentro de esas incorporaciones, 11 familias prioritarias ya disponen de extracción profunda de campos: justificantes de presentación, solicitud y decisión de ampliación, las cuatro fases de rectificación, justificante de autoliquidación rectificativa, acuerdo de ejecución y certificados con su disconformidad. Todas siguen requiriendo revisión humana.",
        "En una denegación de aplazamiento o fraccionamiento, la ficha separa el motivo impreso, el importe solicitado, las deudas y claves relacionadas, la fecha del acuerdo, el lugar de pago, el plazo literal, las consecuencias de no pagar y las vías de recurso. Un anexo de cálculo de intereses o una carta de pago adjunta se mantiene dentro del acto principal: no crea una segunda liquidación ni un pago. La carta conserva su propia fecha, modelo y referencia sin sustituir la fecha, el modelo o la clave del acuerdo. Una carta de pago no acredita el ingreso ni demuestra que ya se haya realizado.",
        "En una providencia reconocida, muestra importes, referencias oficiales seguras, fechas y el papel de los intervinientes bajo etiquetas cerradas. El análisis puede leer temporalmente un nombre, NIF, cuenta o domicilio para entender la estructura, pero la ficha persistente no conserva esos valores: los roles se guardan sin identidad y CSV, NRC o referencia bancaria se reducen a una huella protegida. La condición impresa describe el documento: no compara el NIF con la cuenta, no verifica la autenticidad y nunca crea deudas, plazos, pagos, gastos o asientos.",
        "Pulsa **Guardar documento** solo después de revisar el resultado. Si quedan resultados, el botón indica **Guardar y revisar siguiente**: tras elegir destino, el documento guardado sale de la cola y se abre automáticamente el siguiente. Al terminar el último, el escáner se cierra y la biblioteca señala en verde la ficha recién guardada. Elige **Mi cuenta** para conservar la ficha estructurada en Factu, **Google Drive** para archivar únicamente el PDF original en tu Drive o **Ambas** para hacer las dos cosas. El PDF analizado sigue disponible en memoria durante esta elección: no necesitas seleccionarlo ni escanearlo otra vez. Factu nunca custodia el PDF; cuando eliges Mi cuenta conserva los datos estructurados y su procedencia, y cuando eliges Drive el original permanece en el almacenamiento del usuario.",
        "El guardado protege primero la ficha revisada y después intenta completar los datos especializados y las relaciones con otros documentos. Si solo esa segunda parte necesita revisión, la ficha válida se conserva y verás una advertencia concreta; no tendrás que perder el trabajo ni repetir el escaneo. En cambio, un problema de identidad de cuenta, privacidad, duplicidad estructural, integridad del expediente o escritura durable bloquea el guardado completo y muestra la fase y un código seguro para poder diagnosticarlo.",
        "Al abrir una ficha, **Qué te está diciendo este documento** separa: qué es, por qué se ha recibido, cuál es el resultado, qué conviene hacer y qué plazo consta o falta. La explicación se genera localmente con reglas versionadas y conocimiento oficial incorporado previamente; el escaneo no consulta AEAT, BOE, IA ni ninguna web. El documento sigue siendo la fuente primaria y las páginas oficiales solo explican el procedimiento sin sustituir lo impreso.",
        "Las cifras principales se resumen y el detalle queda en **Ver datos tal como aparecen en el documento**. Allí se agrupan por página y conservan el orden de lectura: referencias, importes, fechas y demás campos dejan de aparecer en bloques separados y pueden contrastarse de arriba abajo con el PDF. Un cálculo como crédito no consumido se identifica expresamente como cálculo realizado solo con cifras impresas.",
        "La fecha de emisión, firma o acto organiza la cronología y la carpeta de Drive. Si esas fechas faltan, puede usarse una fecha de notificación efectiva exacta y se indica expresamente su procedencia. Si ninguna fecha documental está disponible, la ficha queda como **Fecha pendiente** y se ordena al final; nunca se sustituye por la fecha de escaneo. La fecha técnica del PDF es secundaria y no se usa para inventar un vencimiento. **Vto.** se mantiene como referencia opaca, nunca como fecha o cuota.",
        "Una fecha impresa no se interpreta como fecha de notificación ni como vencimiento. El panel **Antes de actuar** enumera comprobaciones manuales y no guarda su progreso. Cuando la coincidencia documental es única, puede aparecer un enlace a información general de la AEAT; abrirlo es una decisión del usuario, no valida el PDF ni calcula plazos.",
        "En las 11 familias prioritarias el lector separa datos impresos, datos normalizados, cálculos hechos solo con cifras impresas, reglas legales aplicadas y relaciones propuestas. Cada regla conserva su versión, la fuente AEAT o BOE comprobada y una traza determinista. Si falta la fecha que inicia un plazo, el resultado queda pendiente: nunca usa la fecha del escaneo. El motor no consulta internet durante la lectura.",
        "Una solicitud de ampliación que reúna todos los requisitos del artículo 91 —primera solicitud motivada, presentada antes de los tres últimos días y sin perjuicio a terceros— puede producir automáticamente la ampliación por la mitad, salvo denegación expresa notificada dentro del plazo original. Factu no da este efecto por confirmado si faltan la fecha límite, la hora de presentación o cualquiera de esos requisitos, y reconcilia por separado cualquier acuerdo posterior.",
        "En rectificaciones, una resolución puede llegar directamente sin propuesta previa cuando coincide con lo solicitado. El plazo máximo de seis meses no equivale a estimación por silencio y una devolución reconocida no demuestra que se haya transferido. Para el modelo 303 rectificativo se distingue la puerta temporal —mensual desde septiembre de 2024 y trimestral desde el 3T de 2024— y se conservan las excepciones que siguen por solicitud tradicional.",
        "Un acuerdo de ejecución es un acto separado de la resolución que ejecuta. En certificados, el escrito de disconformidad de diez días es la vía específica para corregir el contenido y no se presenta como un recurso ordinario. La validez general de tres o doce meses solo se muestra cuando no existe una regla específica y no han cambiado las circunstancias.",
        "Un importe o una explicación no crea automáticamente una deuda, un pago, un gasto, un plazo legal o un asiento. El desplegable **Fuentes oficiales en las que se basa nuestro escáner** enlaza las fuentes AEAT y BOE incorporadas y versionadas en el motor local. Esas páginas no se consultan durante el escaneo: el usuario decide si quiere abrirlas después.",
      ],
      tip: "Guardar la ficha y archivar el PDF original son dos decisiones distintas. Puedes conservar solo la ficha.",
    },
    {
      title: "9. Archivar voluntariamente el original en Google Drive",
      paragraphs: [
        "Después de guardar la ficha aparece el bloque **Original registrado sin archivar**. Si Drive ya está conectado, pulsa **Archivar original en Drive**. Si no lo está, pulsa **Conectar Drive y archivar** y completa el permiso de Google. Conectar Drive es independiente de iniciar sesión en Factu.",
        "Nada se sube al analizar, seleccionar o guardar una ficha: el envío comienza únicamente al pulsar el botón de archivado del documento. Factu vuelve a leer el archivo subido y comprueba que su huella SHA-256 coincide antes de marcarlo como **Original archivado**.",
        "El original se guarda en tu Google Drive bajo **Factu - documentos oficiales/AAAA/MM**, usando el año y el mes de la fecha del propio documento. Si la ficha no contiene una fecha exacta, se coloca en **Fecha pendiente**. La fecha de análisis o incorporación nunca decide la carpeta.",
        "El PDF queda bajo tu custodia en Drive. Factu solo conserva identificadores opacos de archivo y carpeta, la huella verificada, la fecha documental y el estado del archivado. Desde la ficha puedes pulsar **Abrir o descargar** para acceder al original en Google Drive.",
        "Si vuelves a seleccionar un PDF que ya tiene ficha pero no original archivado, aparece de nuevo **Original registrado sin archivar** y puedes enviarlo a Drive sin repetir el análisis. Si ya está archivado, se rechaza como duplicado. Para fichas antiguas debes volver a seleccionar el PDF: conectar Drive más tarde no puede recuperarlos automáticamente porque Factu nunca custodió esos originales.",
      ],
      tip: "Desconectar Drive o no autorizarlo no elimina la ficha ni los originales que ya estén en tu cuenta de Google.",
    },
    {
      title: "10. Consultar documentos, expedientes y relaciones",
      paragraphs: [
        "La sección **Documentos escaneados y expedientes** reúne las fichas guardadas. Cada tarjeta muestra arriba el organismo abreviado, por ejemplo **AEAT**, seguido del título completo y la fecha exacta del documento cuando está disponible. El estado del original se consulta al abrir el detalle.",
        "Puedes buscar por título, organismo, referencia administrativa segura o importe. El selector **Ordenar filas por** permite usar la **Fecha del primer documento** o la **Fecha del último documento**. La fecha principal siempre es la que figura en el documento; la fecha de guardado solo se muestra como información secundaria.",
        "Los documentos relacionados permanecen juntos en una misma fila, con tarjetas de igual tamaño, y se ordenan de izquierda a derecha desde el más antiguo al más reciente. Encima de cada fila aparecen los meses y años de sus documentos en ese mismo orden. Si se incorpora después un documento anterior, ocupa su posición cronológica a la izquierda. Una fecha todavía no disponible se resume como **Fecha pendiente**, sin sustituirla por la fecha de escaneo.",
        "**Relaciones entre documentos** comprueba identificadores administrativos exactos como expediente, liquidación, deuda, notificación o registro. A las 15 cadenas procedimentales anteriores y sus 48 tipos de relación se añaden 11 cadenas para rectificación, ampliación de plazo, REDEME/SII, certificados, ejecución, apoderamientos, notificación electrónica, subastas, devolución bancaria y cierre sancionador. Solo marca una dirección exacta cuando coinciden referencias compatibles y el ámbito; modelo, período, fecha o importe solo permiten sugerir una relación con el estado **Relación detectada · revisar**. Incluso una relación exacta vincula fichas, pero no confirma por sí sola el efecto, el pago, la extinción de una deuda ni el cierre del expediente.",
        "Al abrir una ficha completa verás primero la explicación en lenguaje normal y después, bajo un detalle desplegable, los datos estructurados que la sostienen. También verás los documentos del mismo expediente y la explicación de cada vínculo. Si falta el original, la ficha indica que debes volver a seleccionarlo para archivarlo; si está en Drive, ofrece **Abrir o descargar**.",
        "Cada tarjeta del listado incluye una papelera. Si no hay original en Drive, la confirmación pregunta simplemente **¿Eliminar este documento?**. Si existe un original verificado y exclusivo de esa ficha, pregunta **¿Quieres eliminar también el documento original subido a Google Drive?**: **No** elimina únicamente los datos y vínculos de Factu; **Sí** elimina la ficha y envía también el PDF a la papelera de Drive; **Cancelar** no cambia nada.",
        "La opción de Drive nunca borra permanentemente el archivo: comprueba que es el PDF exacto creado por Factu, lo mueve a la papelera y verifica el resultado. Si la ficha no puede eliminarse después, Factu intenta restaurar el original. Un PDF compartido por varias fichas se conserva en Drive y no ofrece borrado remoto desde una sola tarjeta. Los datos operativos dependientes siguen bloqueando cualquier eliminación parcial.",
      ],
      tip: "La biblioteca ordena y relaciona la información confirmada por el usuario; ninguna relación ejecuta por sí sola una acción fiscal o contable.",
    },
    {
      title: "11. Buscar qué significa una notificación",
      paragraphs: [
        "En **Guía de notificaciones y expedientes** puedes buscar por el nombre técnico o con palabras normales, por ejemplo **cuenta bloqueada**, **declaración omitida**, **carta de pago**, **pago rechazado**, **apremio** o **embargo**. La búsqueda se realiza en el navegador y no envía el texto escrito.",
        "Las fichas con el distintivo **Guía explicada** empiezan por **Lo importante en 30 segundos**: qué significa, por qué suele llegar, qué conviene hacer y qué plazo debes localizar. **Entenderlo un poco mejor** contiene únicamente los matices útiles; el estado técnico y las fuentes quedan en apartados posteriores.",
        "Las **122 fichas** están explicadas: 118 tienen lectura automática con revisión obligatoria y 4 sectoriales están disponibles para consulta manual. De las incorporaciones nuevas, 11 ya cuentan con extracción profunda; las demás conservan visible que el significado oficial está modelado, pero la estructura concreta del PDF aún necesita una muestra documental antes de considerarse firma fuerte. Una ampliación solo se evalúa con todos los requisitos y fechas del artículo 91; una solicitud de rectificación no implica estimación; un recurso no implica suspensión; una adjudicación no prueba la extinción total; y una respuesta técnica VERI*FACTU no es una sanción ni un requerimiento.",
        "El conocimiento oficial está incorporado y versionado en Factu. Al escanear o buscar no se consulta la web de la AEAT, el BOE ni una IA. Puedes abrir voluntariamente las fuentes oficiales registradas para comprobar el contexto.",
        "La guía nunca calcula un plazo desde la fecha de firma, generación, PDF o escaneo. Para actuar usa la fecha real de notificación o recepción y el plazo que conste en el documento. Tampoco paga, recurre, suspende, desembarga ni modifica una deuda automáticamente.",
      ],
      tip: "Lee primero el resumen. Despliega los matices y las fuentes solo cuando los necesites.",
    },
  ],
};
