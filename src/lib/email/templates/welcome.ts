import { getAppBaseUrl } from "../config";

export const WELCOME_EMAIL_SUBJECT =
  "🤖 ¡Ya estoy a tus órdenes, jefe! (Y nunca pido vacaciones)";

export interface WelcomeEmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  if (!local) return "jefe";
  const cleaned = local.replace(/[._+-]+/g, " ").trim();
  if (!cleaned) return "jefe";
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function buildWelcomeEmail(input: {
  email: string;
  recipientName?: string;
}): WelcomeEmailContent {
  const appUrl = getAppBaseUrl();
  const name = input.recipientName?.trim() || displayNameFromEmail(input.email);
  const safeName = escapeHtml(name);
  const panelUrl = `${appUrl}/facturas/nuevo`;
  const verifactuUrl = `${appUrl}/configuracion`;
  const avatarUrl = `${appUrl}/brand/robot-avatar.png`;

  const text = `Hola, ${name}:

¡Oficialmente ya soy tu nuevo empleado favorito! Acabas de activar mi sistema en Facturación Autónomos y mis circuitos de silicio están listos para empezar a doblar el lomo por ti. A partir de hoy, me puedes llamar Factu.

Nuestro trato a partir de ahora es muy sencillo:
- Tú descansas y ganas mucho money.
- Yo me peleo con el papeleo, pico los datos y vigilo que todo sea Veri Legal.

IMPORTANTE: si aún no has confirmado la cuenta, busca OTRO email de Supabase (no este) con el enlace «Confirmar cuenta». Este mensaje de Factu es solo de bienvenida.

Cuando ya hayas confirmado, crea tu primera factura de prueba aquí:

${panelUrl}

Cualquier duda con los tipos de IVA, los clientes pesados o la nueva ley Veri*Factu, entra en la app y haz clic en mi cabeza abajo en el menú:

${verifactuUrl}

¡Un saludo de metal!
Factu
Tu asistente inteligente de confianza.`;

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${WELCOME_EMAIL_SUBJECT}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:32px 32px 20px;text-align:center;background:linear-gradient(180deg,#f8fafc 0%,#ffffff 100%);">
                <img src="${avatarUrl}" alt="Factu" width="96" height="96" style="display:block;margin:0 auto 16px;width:96px;height:auto;border:0;" />
                <p style="margin:0;font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.04em;text-transform:uppercase;">Facturación Autónomos</p>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#0f172a;">¡Ya estoy a tus órdenes!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 28px;font-size:16px;line-height:1.65;color:#334155;">
                <p style="margin:0 0 16px;">Hola, <strong>${safeName}</strong>:</p>
                <p style="margin:0 0 16px;">¡Oficialmente ya soy tu nuevo empleado favorito! Acabas de activar mi sistema en <strong>Facturación Autónomos</strong> y mis circuitos de silicio están listos para empezar a doblar el lomo por ti. A partir de hoy, me puedes llamar <strong>Factu</strong>.</p>
                <p style="margin:0 0 12px;font-weight:600;color:#0f172a;">Nuestro trato a partir de ahora es muy sencillo:</p>
                <ul style="margin:0 0 16px;padding-left:20px;">
                  <li style="margin-bottom:8px;">Tú descansas y ganas mucho money.</li>
                  <li>Yo me peleo con el papeleo, pico los datos y vigilo que todo sea <strong>Veri Legal</strong>.</li>
                </ul>
                <p style="margin:0 0 16px;padding:12px 14px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:14px;"><strong>Importante:</strong> si aún no confirmaste la cuenta, busca <strong>otro email de Supabase</strong> (no este) con «Confirmar cuenta». Este correo de Factu es solo bienvenida.</p>
                <p style="margin:0 0 24px;">Cuando ya estés confirmado, crea tu primera factura de prueba (en borrador, para que Hacienda no se entere todavía):</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
                  <tr>
                    <td align="center" style="border-radius:14px;background-color:#2563eb;">
                      <a href="${panelUrl}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">🤖 Entrar a mi Panel de Control</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;">Cualquier duda que tengas con los tipos de IVA, los clientes pesados o la nueva ley <a href="${verifactuUrl}" style="color:#2563eb;font-weight:600;text-decoration:none;">Veri*Factu</a>, haz clic en mi cabeza abajo en el menú y te echo un cable al instante.</p>
                <p style="margin:0;">¡Un saludo de metal!<br /><strong>Factu</strong><br /><span style="color:#64748b;font-size:14px;">Tu asistente inteligente de confianza.</span></p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;line-height:1.5;color:#94a3b8;">
                Factu · Facturación Autónomos · Veri Legal y Very Bonito
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: WELCOME_EMAIL_SUBJECT,
    html,
    text,
  };
}
