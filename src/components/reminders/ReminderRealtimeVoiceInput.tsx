"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Sparkles } from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import {
  AiProcessingConsentNotice,
  useAiProcessingConsent,
} from "@/components/legal/AiProcessingConsentNotice";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  appendVoiceTranscript,
  normalizeVoiceTranscript,
} from "@/lib/reminder-voice";

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

type VoiceStatus = "idle" | "connecting" | "listening" | "stopping";

interface ReminderRealtimeVoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  onTranscript?: (transcript: string) => void;
  onActivity?: () => void;
}

interface RealtimeSessionResponse {
  clientSecret?: string;
  expiresAt?: number;
  model?: string;
  error?: string;
}

interface RealtimeMessage {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: {
    message?: string;
  };
}

export function ReminderRealtimeVoiceInput({
  value,
  onChange,
  onTranscript,
  onActivity,
}: ReminderRealtimeVoiceInputProps) {
  const { billingEnabled, isPro, loading: billingLoading } = useBilling();
  const { user } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const aiConsent = useAiProcessingConsent();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentValueRef = useRef(value);
  const partialTranscriptRef = useRef("");
  const lastCommitAtRef = useRef(0);

  const browserSupportsVoice = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof RTCPeerConnection !== "undefined",
    [],
  );

  const needsLogin = billingEnabled && !user;
  const locked = billingEnabled && Boolean(user) && !isPro;
  const busy = status !== "idle";

  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, []);

  function applyTranscript(transcript: string) {
    const cleanTranscript = normalizeVoiceTranscript(transcript);
    if (!cleanTranscript) return;

    if (onTranscript) {
      onActivity?.();
      onTranscript(cleanTranscript);
      return;
    }

    const next = appendVoiceTranscript(
      currentValueRef.current,
      cleanTranscript,
    );
    if (next === currentValueRef.current) return;
    currentValueRef.current = next;
    onChange(next);
    onActivity?.();
  }

  function cleanupConnection() {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function flushPartialTranscript() {
    const transcript = partialTranscriptRef.current.trim();
    if (!transcript) return;
    applyTranscript(transcript);
    partialTranscriptRef.current = "";
    setLiveTranscript("");
  }

  async function getAccessToken(): Promise<string | null> {
    if (!user) return null;
    const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
    const supabase = await getSupabaseClientAsync();
    const { data } = (await supabase?.auth.getSession()) ?? {
      data: { session: null },
    };
    return data.session?.access_token ?? null;
  }

  async function createRealtimeSession(): Promise<string> {
    const headers: HeadersInit = {};
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch("/api/reminders/realtime-session", {
      method: "POST",
      headers,
    });
    const payload = (await response
      .json()
      .catch(() => ({}))) as RealtimeSessionResponse;

    if (response.status === 402) {
      setUpgradeOpen(true);
      throw new Error(
        payload.error ?? "La voz IA para recordatorios requiere Pro.",
      );
    }

    if (!response.ok || !payload.clientSecret) {
      throw new Error(payload.error ?? "No se pudo iniciar la voz IA.");
    }

    return payload.clientSecret;
  }

  function handleRealtimeMessage(event: MessageEvent) {
    const raw = typeof event.data === "string" ? event.data : "";
    if (!raw) return;

    let message: RealtimeMessage;
    try {
      message = JSON.parse(raw) as RealtimeMessage;
    } catch {
      return;
    }

    if (message.type === "error") {
      setError(message.error?.message ?? "La voz IA se ha detenido.");
      return;
    }

    if (
      message.type === "conversation.item.input_audio_transcription.delta" &&
      message.delta
    ) {
      partialTranscriptRef.current += message.delta;
      setLiveTranscript(partialTranscriptRef.current.trim());
      return;
    }

    if (
      message.type === "conversation.item.input_audio_transcription.completed"
    ) {
      const transcript = message.transcript ?? partialTranscriptRef.current;
      partialTranscriptRef.current = "";
      setLiveTranscript("");
      lastCommitAtRef.current = Date.now();
      applyTranscript(transcript);
    }
  }

  async function startVoice() {
    setError(null);
    setLiveTranscript("");
    partialTranscriptRef.current = "";
    lastCommitAtRef.current = 0;

    if (billingLoading) return;
    if (demoMode) {
      setError("En modo demo no se usa voz IA.");
      return;
    }
    if (needsLogin) {
      setError("Inicia sesión con una cuenta Pro para usar voz IA.");
      return;
    }
    if (locked) {
      setUpgradeOpen(true);
      return;
    }
    if (!aiConsent.accepted) {
      setError("Acepta primero el aviso de tratamiento con IA.");
      return;
    }
    if (!browserSupportsVoice) {
      setError("Este navegador no permite usar voz IA aquí.");
      return;
    }

    setStatus("connecting");
    try {
      const clientSecret = await createRealtimeSession();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const channel = peer.createDataChannel("oai-events");
      dataChannelRef.current = channel;
      channel.onmessage = handleRealtimeMessage;
      channel.onopen = () => setStatus("listening");
      channel.onerror = () =>
        setError("Se ha perdido la conexión de voz IA. Prueba de nuevo.");

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          setError("La conexión de voz IA ha fallado. Prueba de nuevo.");
          cleanupConnection();
          setStatus("idle");
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const answerResponse = await fetch(OPENAI_REALTIME_CALLS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp ?? "",
      });

      if (!answerResponse.ok) {
        throw new Error("OpenAI no aceptó la sesión de voz.");
      }

      const answer = await answerResponse.text();
      await peer.setRemoteDescription({ type: "answer", sdp: answer });
      setStatus("listening");
    } catch (caught) {
      cleanupConnection();
      setStatus("idle");
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo iniciar la voz IA.",
      );
    }
  }

  async function stopVoice() {
    if (status === "idle") return;
    setStatus("stopping");
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });

    const channel = dataChannelRef.current;
    if (channel?.readyState === "open") {
      channel.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      await new Promise((resolve) => window.setTimeout(resolve, 900));
    }

    if (Date.now() - lastCommitAtRef.current > 500) {
      flushPartialTranscript();
    }

    cleanupConnection();
    setStatus("idle");
  }

  const buttonText = (() => {
    if (demoMode) return "Voz IA no demo";
    if (billingLoading) return "Comprobando Pro";
    if (locked || needsLogin) return "Voz IA Pro";
    if (status === "connecting") return "Conectando";
    if (status === "listening") return "Detener voz";
    if (status === "stopping") return "Guardando voz";
    return "Dictar con IA";
  })();

  return (
    <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (busy ? void stopVoice() : void startVoice())}
          disabled={demoMode || billingLoading || status === "stopping"}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "connecting" || status === "stopping" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "listening" ? (
            <MicOff className="h-4 w-4" />
          ) : locked || needsLogin ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {buttonText}
        </button>
        {status === "listening" ? (
          <span className="text-sm font-semibold text-emerald-700">
            Escuchando…
          </span>
        ) : null}
        {locked ? (
          <span className="text-xs font-semibold text-slate-500">
            Disponible para usuarios Pro.
          </span>
        ) : null}
        {needsLogin ? (
          <span className="text-xs font-semibold text-slate-500">
            Inicia sesión para usarla.
          </span>
        ) : null}
        {demoMode ? (
          <span className="text-xs font-semibold text-amber-700">
            Desactivada en modo demo.
          </span>
        ) : null}
      </div>

      <AiProcessingConsentNotice
        accepted={aiConsent.accepted}
        onAccepted={() => {
          aiConsent.accept();
          setError(null);
        }}
        compact
      />
      <p className="text-xs leading-relaxed text-slate-500">
        Intentará rellenar todos los campos con el dictado, pero puede fallar al
        captar el cliente si tienes algunos muy parecidos.
      </p>

      {liveTranscript ? (
        <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
          {liveTranscript}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      ) : null}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={
          needsLogin
            ? "Inicia sesión con una cuenta Pro para usar voz IA."
            : "La voz IA para recordatorios requiere plan Pro."
        }
      />
    </div>
  );
}
