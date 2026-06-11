"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { pickFactuAvisosEmptyMessages } from "@/lib/factu/copy";

export function FactuAvisosEmptyState() {
  const [messages, setMessages] = useState(() => pickFactuAvisosEmptyMessages(3));

  const primary = messages[0];
  const extras = useMemo(() => messages.slice(1), [messages]);

  function shuffleMessages() {
    setMessages(pickFactuAvisosEmptyMessages(3));
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-emerald-50 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-3 text-lg font-bold text-emerald-900">Todo al día</p>
        <p className="mt-1 text-sm text-emerald-800">
          No hay avisos urgentes. Factu sigue vigilando por ti.
        </p>
      </Card>

      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center">
        <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-slate-100 bg-white shadow-md">
          <span className="text-3xl" aria-hidden>
            🤖
          </span>
          <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-xs font-bold text-white">
            €
          </span>
        </div>

        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium leading-relaxed text-slate-700">
            &ldquo;{primary}&rdquo;
          </p>
          <p className="mt-2 text-xs font-semibold text-blue-600">— Factu</p>
        </div>

        {extras.length > 0 ? (
          <ul className="mt-4 w-full max-w-md space-y-2 text-left">
            {extras.map((line) => (
              <li
                key={line}
                className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-600"
              >
                &ldquo;{line}&rdquo;
              </li>
            ))}
          </ul>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={shuffleMessages}
        >
          Otra frase de Factu
        </Button>
      </div>
    </div>
  );
}
