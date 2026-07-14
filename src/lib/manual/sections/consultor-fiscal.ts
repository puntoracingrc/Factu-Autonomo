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
        "Antes de generar los modelos debes confirmar que has revisado las respuestas. El resultado separa obligaciones derivadas, casos incompletos o sujetos a revisión y exclusiones explícitas, con evidencia, sujeto, períodos, siguiente paso y fuentes oficiales.",
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
      title: "7. Analizar una notificación",
      paragraphs: [
        "Abre **Notificaciones y expedientes** dentro de Asesoría fiscal con una cuenta confirmada y selecciona un PDF. El archivo se lee de forma local y aislada: no se conserva ni el PDF, ni su texto, ni el nombre del archivo.",
        "Tras el análisis puedes pulsar **Guardar datos en mi cuenta**. Es una acción opcional y separada por cuenta: conserva únicamente la ficha estructurada que ves —tipo, organismo, sujeto identificado, importes, referencias y fechas impresas disponibles— junto con su procedencia de extracción. Nunca guarda el PDF, su nombre ni el texto completo; la ficha entra en la copia de seguridad y en la sincronización de los datos de la cuenta.",
        "Al guardar una segunda ficha, **Relaciones entre documentos** comprueba identificadores administrativos exactos como expediente, liquidación, deuda, CSV, notificación o registro. Si dos fichas comparten uno, guarda y muestra la coincidencia como **Relación detectada · revisar**, con el valor y los dos documentos. La coincidencia vincula objetivamente las fichas al mismo identificador, pero no inventa cuál causó a cuál, no confirma un pago y no cierra el expediente.",
        "El reconocimiento actual cubre providencias de apremio, concesiones de aplazamiento o fraccionamiento, diligencias de embargo de bienes inmuebles, requerimientos formales de presentación y acuerdos de alta en el ROI. Un documento escaneado sin texto seleccionable queda como **OCR pendiente** y no se envía a un proveedor ni a una IA.",
        "Toda coincidencia permanece pendiente de revisión antes de actuar. En una providencia reconocida muestra el nombre o razón social, el NIF y la condición de **obligado al pago** cuando aparecen juntos bajo la sección impresa **Identificación del obligado al pago**; también puede mostrar importes, valores exactos de referencias y fechas bajo etiquetas cerradas. Esos campos permanecen solo en memoria hasta que el usuario pulsa el botón de guardado. Una fecha impresa no se interpreta como fecha de notificación ni como vencimiento, y **Vto.** se mantiene como referencia opaca, nunca como fecha o cuota. La condición impresa describe el documento: no compara el NIF con la cuenta, no verifica la autenticidad y nunca crea deudas, plazos, pagos, gastos o asientos.",
        "El panel **Antes de actuar** enumera comprobaciones manuales y no guarda su progreso. Solo ante una coincidencia única y completa puede ofrecer un enlace a información general del procedimiento en la AEAT; abrirlo es una decisión del usuario, no valida el PDF ni calcula plazos.",
      ],
      tip: "El resultado solo orienta la revisión del documento; no confirma su autenticidad ni sus efectos jurídicos.",
    },
  ],
};
