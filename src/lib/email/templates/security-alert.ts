import type { AdminHealthAbuseSummary } from "@/lib/admin/health";
import { getAppBaseUrl } from "@/lib/email/config";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildSecurityAlertEmail(abuse: AdminHealthAbuseSummary) {
  const relevant = abuse.namespaces
    .filter((item) => item.level !== "ok")
    .slice(0, 5);
  const lines = relevant.map(
    (item) =>
      `${item.label}: ${item.requests.toLocaleString("es-ES")} solicitudes, pico ${item.maxRequests.toLocaleString("es-ES")}`,
  );
  const generatedAt = new Date().toISOString();
  const adminUrl = `${getAppBaseUrl()}/admin?seccion=seguridad`;
  const subject = "Alerta de seguridad en Factu";
  const text = [
    "Se ha detectado actividad anomala reciente en rutas protegidas.",
    "",
    ...lines.map((line) => `- ${line}`),
    "",
    `Total observado: ${abuse.totalRequests.toLocaleString("es-ES")} solicitudes en ${abuse.totalBuckets.toLocaleString("es-ES")} contadores.`,
    `Ultima senal: ${abuse.latestAt ?? "sin fecha"}.`,
    `Revisar: ${adminUrl}`,
    "",
    "Este aviso no contiene direcciones IP, tokens ni datos de usuarios.",
  ].join("\n");

  const itemsHtml = lines.length
    ? `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
    : "<p>No hay rutas detalladas disponibles.</p>";

  return {
    subject,
    text,
    html: `
      <main style="font-family:Arial,sans-serif;color:#172033;line-height:1.5;max-width:640px;margin:0 auto">
        <h1 style="font-size:22px">Alerta de seguridad</h1>
        <p>Se ha detectado actividad anomala reciente en rutas protegidas.</p>
        ${itemsHtml}
        <p><strong>Total observado:</strong> ${escapeHtml(abuse.totalRequests.toLocaleString("es-ES"))} solicitudes en ${escapeHtml(abuse.totalBuckets.toLocaleString("es-ES"))} contadores.</p>
        <p><strong>Ultima senal:</strong> ${escapeHtml(abuse.latestAt ?? "sin fecha")}.</p>
        <p><a href="${escapeHtml(adminUrl)}">Revisar seguridad en el panel admin</a></p>
        <p style="font-size:12px;color:#667085">Aviso generado ${escapeHtml(generatedAt)}. No contiene direcciones IP, tokens ni datos de usuarios.</p>
      </main>
    `,
  };
}
