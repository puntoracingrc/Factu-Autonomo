"use client";

import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import type { AiMessage } from "@/lib/ai";

const SUGGESTIONS = [
  "¿Cuánto he gastado este mes?",
  "¿Cómo van mis facturas?",
  "¿Quiénes son mis proveedores?",
  "Dame un resumen de mis finanzas",
];

export default function AsistentePage() {
  const { data } = useAppStore();
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content:
        "Hola. Soy tu asistente. Pregúntame sobre tus gastos, facturas o proveedores. Te responderé con palabras sencillas.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: AiMessage = { role: "user", content: text.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, data }),
      });
      const json = await res.json();
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            json.reply ??
            json.error ??
            "No pude responder. Inténtalo otra vez.",
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Hubo un problema de conexión. Inténtalo de nuevo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <PageHeader
        title="Asistente"
        subtitle="Pregunta en lenguaje normal, sin tecnicismos"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => sendMessage(s)}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-800"
              }`}
            >
              {msg.role === "assistant" && (
                <Bot className="mb-1 h-4 w-4 text-blue-500" />
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-sm text-slate-400">Pensando...</p>
        )}
      </div>

      <Card className="sticky bottom-24 mt-auto flex gap-2 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Escribe tu pregunta..."
          className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500"
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={loading}
          className="min-w-12 px-4"
        >
          <Send className="h-5 w-5" />
        </Button>
      </Card>
    </div>
  );
}
