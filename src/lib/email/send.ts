import { getEmailFromAddress, isEmailConfigured } from "./config";

export interface EmailAttachment {
  filename: string;
  content: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY no configurada" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.attachments?.length
        ? { attachments: input.attachments }
        : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false,
      error: body || `Resend respondió ${response.status}`,
    };
  }

  const data = (await response.json()) as { id?: string };
  return { ok: true, id: data.id };
}

export { isEmailConfigured };
