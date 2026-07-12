"use client";

import {
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

interface QuickPostItProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

interface PostItPosition {
  x: number;
  y: number;
}

interface DragState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const POST_IT_MAX_LENGTH = 2_000;

export function QuickPostIt({ value, onChange, onClose }: QuickPostItProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [position, setPosition] = useState<PostItPosition>({ x: 16, y: 120 });

  useEffect(() => {
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 240;
    const height = panel?.offsetHeight ?? 240;
    setPosition(
      clampPosition({
        x: window.innerWidth - width - 24,
        y: window.innerWidth < 640 ? 96 : window.innerHeight - height - 80,
      }),
    );
    textareaRef.current?.focus();
  }, []);

  function clampPosition(next: PostItPosition): PostItPosition {
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 240;
    const height = panel?.offsetHeight ?? 240;
    return {
      x: Math.min(Math.max(8, next.x), Math.max(8, window.innerWidth - width - 8)),
      y: Math.min(
        Math.max(8, next.y),
        Math.max(8, window.innerHeight - height - 8),
      ),
    };
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state) return;
    setPosition(
      clampPosition({
        x: state.originX + event.clientX - state.startX,
        y: state.originY + event.clientY - state.startY,
      }),
    );
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={panelRef}
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: "#fff9e8",
        backgroundImage: "url('/ui/postit-note.jpg')",
        backgroundPosition: "center 40%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "132% 122%",
      }}
      className="fixed z-50 flex h-[min(15rem,calc(100vh-1rem))] w-[min(15rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-sm border border-amber-200/80 p-3 pt-2 text-slate-900 shadow-2xl"
      aria-label="Post-it de notas rápidas"
    >
      <div className="relative z-10 flex h-9 shrink-0 items-start justify-between gap-3">
        <div
          className="h-8 flex-1 cursor-move active:cursor-grabbing"
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          title="Arrastrar post-it"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar post-it"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/55 text-slate-500 transition-colors hover:bg-white/85 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={POST_IT_MAX_LENGTH}
        aria-label="Contenido del post-it"
        placeholder="Escribe una nota rápida…"
        className="relative z-10 min-h-0 flex-1 resize-none overflow-y-auto !bg-transparent px-2 pb-2 text-base font-medium leading-6 !text-slate-900 outline-none placeholder:!text-slate-500/75 focus-visible:ring-0"
      />
    </div>
  );
}
