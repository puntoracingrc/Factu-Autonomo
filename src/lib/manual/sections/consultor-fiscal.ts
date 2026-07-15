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
    "La primera vez puedes importar un certificado censal de la AEAT, rellenar el perfil fiscal manualmente o continuar sin completarlo. El PDF se lee localmente y siempre debes confirmar los datos detectados.",
  ],
  steps: [
    {
      title: "1. Configurar actividad y modelos",
      paragraphs: [
        "Abre **Asesoría fiscal → Configurar mi actividad**. Recorre los bloques A–N; **No lo sé** es una respuesta válida y mantiene el dato como pendiente.",
        "Puedes seleccionar opcionalmente un certificado censal o modelo 036 en PDF. Se lee localmente, el archivo no se guarda y debes revisar la identidad y confirmar cada propuesta antes de incorporarla.",
        "En el último bloque indica si has consultado una situación censal actual y qué obligaciones aparecen expresamente. El sistema cruza ese dato con los hechos confirmados y señala las discrepancias sin modificar el censo.",
        "Antes de generar los modelos debes confirmar que has revisado las respuestas. El resultado separa recomendaciones, casos incompletos y modelos improbables, con evidencia, sujeto, períodos, siguiente paso y fuentes oficiales. Mientras el ruleset esté pendiente de revisión fiscal, los modelos improbables siguen visibles y no se aplican exclusiones.",
      ],
      tip: "El resultado es orientativo; no presenta declaraciones ni sustituye la revisión profesional.",
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
        "Abre **Notificaciones y expedientes** dentro de Asesoría fiscal con una cuenta confirmada. Arrastra los PDF a la zona de escaneo o pulsa **Elegir varios PDF**. Cada lote admite hasta **10 documentos**; cada PDF puede tener como máximo 4 MB y 80 páginas.",
        "Los archivos aparecen primero en una cola con nombre, tamaño y estado. Añadirlos no inicia el análisis: puedes completar el lote, quitar un archivo y después pulsar una sola vez **Analizar**. El resumen indica cuántos documentos se han procesado y permite abrir la ficha completa de cada resultado.",
        "Antes de admitir un PDF, el navegador calcula una huella SHA-256 del contenido y la compara con el propio lote y con las fichas guardadas en esa cuenta. El mismo contenido se considera duplicado aunque tenga otro nombre. El nombre solo se muestra mientras el archivo está en la cola.",
        "La lectura se ejecuta localmente. Un PDF con texto se lee directamente y, si contiene páginas de imagen, el navegador puede intentar OCR local. El documento no se envía a una IA ni a un proveedor externo. Si no existe texto suficiente, queda como **No reconocido** o **Necesita revisión**.",
      ],
      tip: "El PDF permanece en el navegador durante el análisis y solo sale de él si eliges expresamente archivarlo en tu Google Drive.",
    },
    {
      title: "8. Revisar y guardar la ficha estructurada",
      paragraphs: [
        "Abre cada resultado del lote. La ficha puede mostrar tipo de documento, organismo, destinatario, NIF, referencias, importes, fechas impresas, documentación solicitada, plazo literal y consecuencias expresas, siempre que aparezcan bajo una estructura reconocida. Los campos conservan página, etiqueta y procedencia para poder contrastarlos con el PDF.",
        "El reconocimiento actual cubre providencias de apremio, concesiones de aplazamiento o fraccionamiento, acuerdos de compensación, diligencias de embargo de bienes inmuebles, requerimientos formales de presentación, requerimientos de documentación y acuerdos de alta en el ROI.",
        "En una providencia reconocida, muestra el nombre o razón social, el NIF y la condición de **obligado al pago** cuando aparecen juntos bajo la sección impresa **Identificación del obligado al pago**; también puede mostrar importes, valores exactos de referencias y fechas bajo etiquetas cerradas. Esos campos permanecen solo en memoria hasta que el usuario pulsa el botón de guardado. La condición impresa describe el documento: no compara el NIF con la cuenta, no verifica la autenticidad y nunca crea deudas, plazos, pagos, gastos o asientos.",
        "Pulsa **Guardar datos en mi cuenta** solo después de revisar la ficha. Factu conserva por cuenta los datos estructurados y su procedencia, pero no guarda el PDF, su nombre ni el texto completo. La ficha entra en la sincronización y en las copias de seguridad de los datos de la cuenta.",
        "Al abrir una ficha, **Qué te está diciendo este documento** separa: qué es, por qué se ha recibido, cuál es el resultado, qué conviene hacer y qué plazo consta o falta. La explicación se genera localmente con reglas versionadas y conocimiento oficial incorporado previamente; el escaneo no consulta AEAT, BOE, IA ni ninguna web. El documento sigue siendo la fuente primaria y las páginas oficiales solo explican el procedimiento sin sustituir lo impreso.",
        "Las cifras principales se resumen y el volcado de importes, referencias y fechas queda en **Ver importes, referencias y datos extraídos** para poder auditarlo sin que tape la explicación. Un cálculo como crédito no consumido se identifica expresamente como cálculo realizado solo con cifras impresas.",
        "La fecha de firma o emisión organiza la cronología y la carpeta de Drive. No se confunde con la fecha de recepción: solo una fecha de notificación o acceso confirmada puede iniciar un plazo de recurso. La fecha técnica del PDF y la fecha de escaneo son secundarias y nunca se usan para inventar un vencimiento. **Vto.** se mantiene como referencia opaca, nunca como fecha o cuota.",
        "Una fecha impresa no se interpreta como fecha de notificación ni como vencimiento. El panel **Antes de actuar** enumera comprobaciones manuales y no guarda su progreso. Cuando la coincidencia documental es única, puede aparecer un enlace a información general de la AEAT; abrirlo es una decisión del usuario, no valida el PDF ni calcula plazos.",
        "Un importe o una explicación no crea automáticamente una deuda, un pago, un gasto, un plazo legal o un asiento. Las fuentes oficiales usadas por el perfil pueden abrirse desde la ficha, pero el usuario decide cuándo consultarlas.",
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
        "La sección **Documentos escaneados y expedientes** reúne las fichas guardadas. El distintivo **Solo ficha** significa que Factu conserva los datos estructurados pero no existe un original enlazado; **Original en Drive** confirma que el PDF fue archivado y verificado en tu Drive.",
        "Puedes buscar por título, organismo, referencia, NIF o importe. El selector **Ordenar filas por** permite usar la **Fecha del primer documento** o la **Fecha del último documento**. La fecha principal siempre es la que figura en el documento; la fecha de guardado solo se muestra como información secundaria.",
        "Los documentos relacionados permanecen juntos en una misma fila, con tarjetas de igual tamaño, y se ordenan de izquierda a derecha desde el más antiguo al más reciente. Si se incorpora después un documento anterior, ocupa su posición cronológica a la izquierda.",
        "**Relaciones entre documentos** comprueba identificadores administrativos exactos como expediente, liquidación, deuda, CSV, notificación o registro. Si dos fichas comparten uno, se muestran como **Relación detectada · revisar** y explican qué valor comparten. La coincidencia vincula objetivamente las fichas, pero no inventa cuál causó a cuál, no confirma un pago y no cierra el expediente.",
        "Al abrir una ficha completa verás primero la explicación en lenguaje normal y después, bajo un detalle desplegable, los datos estructurados que la sostienen. También verás los documentos del mismo expediente y la explicación de cada vínculo. Si falta el original, la ficha indica que debes volver a seleccionarlo para archivarlo; si está en Drive, ofrece **Abrir o descargar**.",
      ],
      tip: "La biblioteca ordena y relaciona la información confirmada por el usuario; ninguna relación ejecuta por sí sola una acción fiscal o contable.",
    },
  ],
};
