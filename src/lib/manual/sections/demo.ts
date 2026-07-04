import type { ManualSection } from "../types";

export const demoSection: ManualSection = {
  slug: "demo",
  title: "Demo sin registro",
  summary: "Prueba el producto con datos ficticios antes de crear cuenta.",
  order: 2,
  intro: [
    "La demo es un sandbox separado: sirve para tocar facturas, clientes, gastos, productos e impuestos sin usar tus datos reales ni sincronizar nada con la nube.",
  ],
  steps: [
    {
      title: "1. Entrar en la demo",
      paragraphs: [
        "Desde **Inicio** pulsa **Demo sin registro**. La app carga una empresa ficticia con clientes, una factura pendiente, un presupuesto aceptado y gastos de ejemplo.",
        "Mientras estés dentro verás el aviso **Modo demo con datos ficticios**. Puedes crear, editar y borrar cosas de prueba: todo queda dentro del sandbox.",
        "La demo no sustituye tus datos reales. Si ya tenías datos locales en este navegador, al salir de la demo vuelven a mostrarse.",
      ],
      tip: "La demo es ideal para enseñar la app o probar un flujo sin miedo a ensuciar tu cuenta.",
    },
    {
      title: "2. Seguir la ruta recomendada",
      paragraphs: [
        "En el Panel de demo aparece **Prueba el producto en 3 minutos** con una ruta sugerida.",
        "La ruta te lleva a mirar una factura pendiente, crear una factura desde cero escribiendo un cliente nuevo dentro del documento, convertir un presupuesto, registrar un gasto ficticio y revisar impuestos orientativos.",
        "Puedes saltar a cualquier paso. Si te pierdes, pulsa **Volver al tour** en el aviso superior.",
      ],
    },
    {
      title: "3. Reiniciar o salir",
      paragraphs: [
        "**Reiniciar demo** vuelve a cargar los datos ficticios iniciales.",
        "**Salir de demo** desactiva el sandbox y recupera el espacio local normal de tu navegador.",
        "**Crear cuenta real** te lleva a **Cuenta** en modo alta. A partir de ahí trabajarás con tus datos, no con los de la demo.",
      ],
    },
  ],
};
