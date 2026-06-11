"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  OFFICE_REMINDER_TEMPLATES,
  guessReminderOrigin,
} from "@/lib/reminder-team";
import type { UserReminderLinkKind } from "@/lib/types";

export function SendToOfficeForm() {
  const { addUserReminder } = useAppStore();
  const { user, syncNow } = useCloudSync();
  const [text, setText] = useState("");
  const [linkKind, setLinkKind] = useState<UserReminderLinkKind>("new_invoice");
  const [sent, setSent] = useState(false);

  function applyTemplate(templateText: string, kind: UserReminderLinkKind) {
    setText(templateText);
    setLinkKind(kind);
    setSent(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    addUserReminder({
      text: trimmed,
      target: "office",
      origin: guessReminderOrigin(),
      link: { kind: linkKind },
    });

    setText("");
    setSent(true);
    if (user) {
      void syncNow();
    }
  }

  return (
    <Card className="mb-4 border-sky-200 bg-sky-50/60 p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          📲
        </span>
        <div>
          <p className="font-semibold text-slate-900">Enviar a oficina</p>
          <p className="text-sm text-slate-600">
            La secretaría lo verá en Inicio al sincronizar la misma cuenta.
          </p>
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {OFFICE_REMINDER_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template.text, template.linkKind)}
              className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-900 transition hover:bg-sky-100"
            >
              {template.label}
            </button>
          ))}
        </div>

        <Field label="Mensaje para oficina">
          <Textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setSent(false);
            }}
            placeholder="Ej.: Ana llama: la señora María pasará datos. Factura 80 € por cambio de cinta."
            required
            rows={3}
          />
        </Field>

        <Button type="submit" fullWidth>
          <Send className="h-4 w-4" />
          Enviar a oficina
        </Button>

        {sent ? (
          <p className="text-center text-sm font-medium text-emerald-700">
            Enviado. Si hay nube activa, sincronizando…
          </p>
        ) : null}

        {!user ? (
          <p className="text-xs text-amber-800">
            Activa la cuenta en la nube (Pro) para que otro dispositivo lo reciba.
          </p>
        ) : null}
      </form>
    </Card>
  );
}
