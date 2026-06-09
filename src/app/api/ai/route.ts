import { NextResponse } from "next/server";
import { getAiResponse, type AiMessage } from "@/lib/ai";
import type { AppData } from "@/lib/types";
import { EMPTY_DATA } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = (body.messages ?? []) as AiMessage[];
    const data = (body.data ?? EMPTY_DATA) as AppData;

    const reply = await getAiResponse(messages, data);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "No pude procesar tu pregunta. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
