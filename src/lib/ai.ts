import type { AppData } from "./types";
import { documentTotals, expenseTotal, formatMoney } from "./calculations";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

function buildContext(data: AppData): string {
  const income = data.documents
    .filter((d) => d.type === "factura" && d.status === "pagado")
    .reduce((sum, d) => sum + documentTotals(d).total, 0);

  const pending = data.documents
    .filter((d) => d.type === "factura" && d.status !== "pagado")
    .reduce((sum, d) => sum + documentTotals(d).total, 0);

  const expenses = data.expenses.reduce(
    (sum, e) => sum + expenseTotal(e),
    0,
  );

  const topSuppliers = [...data.suppliers]
    .map((s) => {
      const spent = data.expenses
        .filter((e) => e.supplierId === s.id)
        .reduce((sum, e) => sum + expenseTotal(e), 0);
      return { name: s.name, spent };
    })
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  const recentExpenses = data.expenses
    .slice(-5)
    .map(
      (e) =>
        `${e.date}: ${e.description} (${e.supplierName}) ${formatMoney(expenseTotal(e))}`,
    )
    .join("\n");

  return `
Negocio: ${data.profile.name || "Sin configurar"}
Ingresos cobrados: ${formatMoney(income)}
Facturas pendientes: ${formatMoney(pending)}
Gastos totales: ${formatMoney(expenses)}
Balance aproximado: ${formatMoney(income - expenses)}
Proveedores principales: ${topSuppliers.map((s) => `${s.name} (${formatMoney(s.spent)})`).join(", ") || "Ninguno"}
Últimos gastos:
${recentExpenses || "Sin gastos registrados"}
`.trim();
}

async function askOpenAI(
  messages: AiMessage[],
  context: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un asistente financiero para autónomos en España. Responde SIEMPRE en español sencillo, sin tecnicismos. Usa frases cortas. Ayuda con facturas, gastos, proveedores e impuestos básicos. Datos del negocio:\n${context}`,
        },
        ...messages,
      ],
      temperature: 0.4,
      max_tokens: 600,
    }),
  });

  if (!response.ok) return null;
  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? null;
}

function localAssistant(question: string, data: AppData): string {
  const q = question.toLowerCase();
  const income = data.documents
    .filter((d) => d.type === "factura" && d.status === "pagado")
    .reduce((sum, d) => sum + documentTotals(d).total, 0);
  const expenses = data.expenses.reduce(
    (sum, e) => sum + expenseTotal(e),
    0,
  );
  const balance = income - expenses;

  if (q.includes("gast") || q.includes("compra")) {
    if (data.expenses.length === 0) {
      return "Aún no tienes gastos registrados. Ve a la sección «Gastos» y pulsa «Añadir gasto» para empezar.";
    }
    const last = data.expenses[data.expenses.length - 1];
    const monthExpenses = data.expenses.filter((e) =>
      e.date.startsWith(new Date().toISOString().slice(0, 7)),
    );
    const monthTotal = monthExpenses.reduce(
      (s, e) => s + expenseTotal(e),
      0,
    );
    return `Este mes llevas ${formatMoney(monthTotal)} en gastos (${monthExpenses.length} compras). El último fue «${last.description}» de ${last.supplierName} por ${formatMoney(expenseTotal(last))}.`;
  }

  if (q.includes("proveedor")) {
    if (data.suppliers.length === 0) {
      return "No tienes proveedores guardados. En «Proveedores» puedes añadir a quienes te venden material o servicios.";
    }
    const list = data.suppliers.map((s) => s.name).join(", ");
    return `Tienes ${data.suppliers.length} proveedor(es): ${list}. ¿Quieres saber cuánto has gastado con alguno?`;
  }

  if (
    q.includes("factura") ||
    q.includes("ingreso") ||
    q.includes("cobr")
  ) {
    const pending = data.documents.filter(
      (d) => d.type === "factura" && d.status !== "pagado",
    );
    return `Has cobrado ${formatMoney(income)} en facturas pagadas. Tienes ${pending.length} factura(s) pendiente(s) por un total de ${formatMoney(pending.reduce((s, d) => s + documentTotals(d).total, 0))}.`;
  }

  if (q.includes("balance") || q.includes("resumen") || q.includes("cuánto")) {
    return `Resumen rápido: ingresos ${formatMoney(income)}, gastos ${formatMoney(expenses)}, balance ${formatMoney(balance)}. ${balance >= 0 ? "Vas bien este periodo." : "Cuidado: los gastos superan los ingresos."}`;
  }

  if (q.includes("presupuesto") || q.includes("recibo")) {
    const pres = data.documents.filter((d) => d.type === "presupuesto").length;
    const rec = data.documents.filter((d) => d.type === "recibo").length;
    return `Tienes ${pres} presupuesto(s) y ${rec} recibo(s). Desde el inicio puedes crear uno nuevo en un solo paso.`;
  }

  return `Puedo ayudarte con tus finanzas. Pregúntame cosas como «¿Cuánto he gastado este mes?», «¿Cómo van mis facturas?» o «¿Quiénes son mis proveedores?». Tu balance actual es ${formatMoney(balance)}.`;
}

export async function getAiResponse(
  messages: AiMessage[],
  data: AppData,
): Promise<string> {
  const context = buildContext(data);
  const ai = await askOpenAI(messages, context);
  if (ai) return ai;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  return localAssistant(lastUser?.content ?? "", data);
}
