import type { ManualSection } from "../types";

export const consultorFiscalSection: ManualSection = {
  slug: "consultor-fiscal",
  title: "Consultor fiscal",
  summary:
    "Analiza de forma orientativa manutención, atenciones y gastos corrientes de vehículo.",
  order: 9.5,
  intro: [
    "El **Consultor fiscal** ejecuta primero reglas locales, versionadas y auditables. Si el fallback opcional está habilitado y no existe coincidencia, puede pedir a una IA una clasificación auxiliar; nunca crea asientos ni sustituye a tu asesor.",
    "La versión Beta solo cubre autónomos persona física en estimación directa y territorio común. Canarias, territorios forales, Ceuta/Melilla y sociedades se muestran como no implementados para evitar aplicar una regla incorrecta.",
    "Puedes analizar un gasto ya registrado o introducir un caso manual. El análisis no crea una copia del gasto ni modifica su estado.",
    "La primera vez puedes importar un certificado censal de la AEAT, rellenar el perfil fiscal manualmente o continuar sin completarlo. El PDF se lee localmente y siempre debes confirmar los datos detectados.",
  ],
  steps: [
    {
      title: "1. Preparar el perfil fiscal",
      paragraphs: [
        "Abre **Consultor fiscal** desde el menú **Más** en móvil o desde la barra lateral en escritorio.",
        "Elige **Importar certificado censal**, **Rellenar manualmente** o **Continuar sin completar**. Ninguna opción bloquea el acceso al Consultor.",
        "La importación admite PDF con texto seleccionable. Comprueba que el NIF coincide, revisa actividad, IAE, territorio y regímenes, y pulsa **Confirmar y guardar**. El archivo, su texto y el CSV no se conservan; solo se guarda el perfil fiscal estructurado y su procedencia.",
        "Si aparece un CSV puedes cotejarlo en la Sede de la AEAT. Trátalo con cautela porque permite acceder al documento. Un PDF escaneado sin texto debe completarse manualmente en esta versión y nunca se envía automáticamente a OCR o IA.",
        "Si continúas sin datos, el motor intenta el análisis con lo que conoce. Los datos necesarios aparecen como pendientes y nunca se transforman en una conclusión negativa.",
      ],
    },
    {
      title: "2. Introducir el gasto",
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
      title: "3. Responder las preguntas",
      paragraphs: [
        "El motor pide únicamente la información que necesita para la regla seleccionada. En comidas pregunta primero la finalidad; «comida» o «cena de empresa» nunca se resuelven automáticamente.",
        "Aunque el gasto tenga un número de documento, el Consultor puede pedirte confirmar si es factura completa, simplificada o recibo. El número por sí solo no habilita la deducción del IVA.",
        "Las respuestas ya dadas se conservan y permanecen editables. Al cambiar una opción se vuelve a evaluar el gasto; para textos e importes pulsa **Actualizar análisis**.",
        "Un día laborable por sí solo no demuestra la relación con la actividad. Añade proyecto, agenda, correo, ruta, parte de trabajo u otra prueba concreta.",
      ],
    },
    {
      title: "4. Interpretar el resultado",
      paragraphs: [
        "Los estados **Falta información**, **Necesita revisión**, **Sin regla compatible** y **Caso no implementado** son distintos. La ausencia de datos no se convierte automáticamente en rojo.",
        "Si no indicas territorio, tipo de contribuyente, régimen fiscal o actividad, el resultado permanece en **Falta información** y no anticipa importes. Un caso conocido pero fuera del alcance aparece como **Caso no implementado**.",
        "IRPF e IVA se muestran por separado, con importe estimado, porcentaje, límite, exceso, documentación y fuentes oficiales. La traza enumera la regla, condiciones, límite y operación determinista.",
        "Una salida externa se identifica como **Propuesta de IA pendiente de revisión** y muestra IRPF e IVA por separado sin convertir porcentajes o importes desconocidos en cero. Solo aparecen las fuentes verificadas que se suministraron y fueron citadas.",
        "El semáforo incluye texto e icono. Amarillo indica carga de prueba o revisión; rojo indica que la regla no propone deducción; sin determinar significa que todavía no existe conclusión.",
      ],
    },
    {
      title: "5. Revisar antes de contabilizar",
      paragraphs: [
        "El botón **Aplicar propuesta** está deshabilitado en esta fase. Revisa la regla y su versión, conserva las pruebas y consulta a un asesor cuando el caso dependa de interpretación.",
        "La IA no es una fuente jurídica. Una banda de confianza alta no permite aceptar la propuesta automáticamente, y cualquier fallo de proveedor o del validador conserva el resultado local.",
        "Los límites de manutención son diarios y conjuntos. El límite de atenciones es anual y conjunto para clientes y proveedores. La rotulación de un vehículo es solo un indicio y nunca activa por sí sola el 100 %.",
      ],
      tip: "No uses este análisis como declaración oficial ni como sustituto de los modelos tributarios.",
    },
  ],
};
