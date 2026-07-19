import type { ManualSection } from "../types";

export const testAutonomosSection: ManualSection = {
  slug: "test-autonomos",
  title: "Test de autónomos",
  summary:
    "Configura tu actividad, incorpora datos de documentos y guarda una orientación sobre tus modelos fiscales.",
  order: 9.3,
  intro: [
    "La primera opción de **Asesoría fiscal** es **Configurar mi actividad**. El test separa persona física, sociedad o entidad, territorio, IRPF, IVA, retenciones y operaciones especiales para orientar qué modelos pueden corresponder.",
    "Puedes responder manualmente o mezclar modelos, certificados, informes y capturas de la AEAT. El lector trabaja en este dispositivo, solo incorpora los campos que confirmes y deja el resto para que lo respondas tú.",
    "El resultado se guarda en tu perfil y puedes corregirlo más adelante. Es orientativo: no presenta declaraciones, no modifica tu censo y no sustituye la revisión profesional.",
  ],
  steps: [
    {
      title: "1. Abrir o retomar el test",
      paragraphs: [
        "Abre **Asesoría fiscal → Configurar mi actividad**. Si ya terminaste el test, verás el último resultado guardado: pulsa **Editar respuestas** para corregirlo.",
        "Usa **Empezar de nuevo** solo si quieres borrar las respuestas, los datos documentales confirmados y el resultado. El sistema pide confirmación antes de hacerlo.",
      ],
    },
    {
      title: "2. Añadir y analizar documentos opcionales",
      paragraphs: [
        "Arrastra o selecciona en una única zona hasta **8 archivos** PDF, PNG, JPG o WebP. Puedes mezclarlos sin clasificarlos, completar la cola y quitar cualquier archivo antes de analizar.",
        "Añadir archivos no inicia el análisis. Cuando la cola esté preparada, pulsa **Analizar archivos**. La lectura se realiza en este dispositivo y los originales no se envían ni se guardan.",
        "Abre **¿Qué modelos y documentos reconoce el lector?** para consultar las 30 familias de modelos fiscales, los 9 documentos sin número y las capturas de Hacienda compatibles. En **Cómo encontrar la información en Hacienda** tienes la ruta Área personal → Mis datos censales para localizar **Mis actividades económicas**, **Mi situación tributaria** y **Mis obligaciones**. Un archivo que no se reconoce no responde ninguna pregunta.",
      ],
      tip: "Los documentos son una ayuda opcional. También puedes completar todo el test manualmente.",
    },
    {
      title: "3. Revisar y confirmar los datos leídos",
      paragraphs: [
        "Después del análisis revisa **Archivos identificados** y **Datos leídos para que los confirmes**. Desmarca cualquier propuesta que no quieras usar, marca la confirmación humana y pulsa **Confirmar datos seleccionados**.",
        "Si dos archivos o una respuesta anterior contienen valores distintos, el sistema avisa y no sustituye el dato sin tu confirmación.",
        "Puedes repetir el proceso con más archivos: cada confirmación se suma al perfil ya guardado. Los PDF y las capturas originales no se conservan.",
      ],
    },
    {
      title: "4. Responder los bloques A–N",
      paragraphs: [
        "Ninguna respuesta manual aparece seleccionada antes de que la pulses. **No lo sé** solo se muestra en las preguntas que admiten conservar esa duda.",
        "Los datos obtenidos de un documento confirmado aparecen en verde, cuentan como respondidos y siguen siendo editables.",
        "Abre **Por qué lo preguntamos y qué documento ayuda** para leer una explicación normal, un ejemplo y los modelos relacionados. Usa **Guardar y continuar** para pasar al bloque siguiente y **Revisar respuestas** al terminar.",
      ],
    },
    {
      title: "5. Generar, entender y corregir el resultado",
      paragraphs: [
        "Puedes generar el resultado con datos pendientes, pero antes debes confirmar que has revisado la situación del ejercicio y pulsar **Generar mis modelos**. Las respuestas, su procedencia y el resultado se guardan en tu perfil.",
        "La página final distingue **Probablemente necesarios**, **Podrían ser necesarios**, **Falta información** y, cuando existen, **Añadidos por ti**. Los verdes ya están incluidos automáticamente; los posibles se conservan por precaución y los que necesitan información quedan incluidos provisionalmente hasta resolver la duda.",
        "Pulsa **Editar respuestas** y vuelve a generar para sustituir el resultado anterior con la nueva configuración.",
      ],
      tip: "El test orienta y organiza. No presenta modelos, no paga impuestos y no cambia tus datos en Hacienda.",
    },
  ],
};
