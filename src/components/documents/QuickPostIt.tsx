"use client";

import {
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { quickToolDragVisualStyle } from "./quick-tool-drag-visual";
import { QUICK_POST_IT_MAX_LENGTH } from "./quick-post-it-session";

interface QuickPostItProps {
  isActive: boolean;
  value: string;
  onActivate: () => void;
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

export function QuickPostIt({
  isActive,
  value,
  onActivate,
  onChange,
  onClose,
}: QuickPostItProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [position, setPosition] = useState<PostItPosition>({ x: 16, y: 120 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const finishDrag = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });
    window.addEventListener("blur", finishDrag, { once: true });

    return () => {
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      window.removeEventListener("blur", finishDrag);
    };
  }, [isDragging]);

  useEffect(() => {
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 240;
    const height = panel?.offsetHeight ?? 240;
    setPosition(
      clampPosition({
        x: window.innerWidth - width - 24,
        y: window.innerWidth < 640 ? 128 : window.innerHeight - height - 80,
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
    onActivate();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    setIsDragging(true);
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
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function cancelDrag() {
    dragRef.current = null;
    setIsDragging(false);
  }

  return (
    <div
      ref={panelRef}
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: "#fff9e8",
        backgroundImage: "url('/ui/postit-note.jpg')",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "310% 310%",
        ...quickToolDragVisualStyle("post-it", isDragging, isActive),
      }}
      className="fixed flex h-[min(15rem,calc(100vh-1rem))] w-[min(15rem,calc(100vw-1rem))] origin-center flex-col overflow-visible rounded-sm border border-amber-200/80 p-3 pt-2 text-slate-900 motion-reduce:!transform-none motion-reduce:!transition-none"
      aria-label="Post-it de notas rápidas"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-3 left-1/2 z-20 h-14 w-12 -translate-x-1/2 drop-shadow-[0_5px_4px_rgba(15,23,42,0.28)]"
      >
        <span className="absolute left-1/2 top-7 h-7 w-1 -translate-x-1/2 rotate-3 rounded-full bg-slate-500" />
        <span className="absolute left-1/2 top-3 h-8 w-7 -translate-x-1/2 rounded-[48%] border border-red-900/30 bg-red-700" />
        <span className="absolute left-1/2 top-0 h-6 w-6 -translate-x-1/2 rounded-full border border-red-900/30 bg-red-600 shadow-[inset_-3px_-3px_0_rgba(127,29,29,0.35)]" />
        <span className="absolute left-[19px] top-1 h-2 w-2 rounded-full bg-red-200/75" />
      </div>
      <div className="relative z-10 flex h-9 shrink-0 items-start justify-between gap-3">
        <div
          className="h-8 flex-1 cursor-move active:cursor-grabbing"
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={cancelDrag}
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
        maxLength={QUICK_POST_IT_MAX_LENGTH}
        aria-label="Contenido del post-it"
        placeholder="Escribe una nota rápida…"
        className="relative z-10 min-h-0 flex-1 resize-none overflow-y-auto !bg-transparent px-2 pb-2 text-base font-medium leading-6 !text-slate-900 outline-none placeholder:!text-slate-500/75 focus-visible:ring-0"
      />
    </div>
  );
}
