"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

type Operator = "+" | "-" | "*" | "/";

interface QuickCalculatorProps {
  onClose: () => void;
}

type CalculatorButtonTone = "utility" | "operator";

interface CalculatorButton {
  label: string;
  action: () => void;
  tone?: CalculatorButtonTone;
  wide?: boolean;
  ariaLabel?: string;
}

interface CalculatorPosition {
  x: number;
  y: number;
}

interface DragState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const operatorLabels: Record<Operator, string> = {
  "+": "+",
  "-": "-",
  "*": "x",
  "/": "÷",
};

function roundResult(value: number): number {
  return (
    Math.round((value + Number.EPSILON) * 1_000_000_000_000) /
    1_000_000_000_000
  );
}

function displayNumber(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  const rounded = roundResult(value);
  return String(rounded).replace(".", ",");
}

function displayText(value: string): string {
  return value.replace(".", ",");
}

function numberFromDisplay(value: string): number {
  return Number(value.replace(",", "."));
}

function calculate(first: number, second: number, operator: Operator): number {
  if (operator === "+") return first + second;
  if (operator === "-") return first - second;
  if (operator === "*") return first * second;
  if (operator === "/") return second === 0 ? Number.NaN : first / second;
  return second;
}

export function QuickCalculator({ onClose }: QuickCalculatorProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [position, setPosition] = useState<CalculatorPosition>({
    x: 12,
    y: 120,
  });
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForNumber, setWaitingForNumber] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 256;
    const height = panel?.offsetHeight ?? 360;
    setPosition(
      clampPosition({
        x: window.innerWidth >= 640 ? 24 : (window.innerWidth - width) / 2,
        y: window.innerHeight - height - 80,
      }),
    );
    panelRef.current?.focus();
  }, []);

  function clampPosition(next: CalculatorPosition): CalculatorPosition {
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 256;
    const height = panel?.offsetHeight ?? 360;
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

  function clear() {
    setDisplay("0");
    setStoredValue(null);
    setOperator(null);
    setWaitingForNumber(false);
  }

  function inputDigit(digit: string) {
    if (display === "Error" || waitingForNumber) {
      setDisplay(digit);
      setWaitingForNumber(false);
      return;
    }
    setDisplay((current) => (current === "0" ? digit : `${current}${digit}`));
  }

  function inputDecimal() {
    if (display === "Error" || waitingForNumber) {
      setDisplay("0.");
      setWaitingForNumber(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay((current) => `${current}.`);
    }
  }

  function applyOperator(nextOperator: Operator) {
    const currentValue = numberFromDisplay(display);
    if (storedValue === null || operator === null) {
      setStoredValue(currentValue);
    } else if (!waitingForNumber) {
      const result = calculate(storedValue, currentValue, operator);
      setDisplay(displayNumber(result));
      setStoredValue(result);
    }
    setOperator(nextOperator);
    setWaitingForNumber(true);
  }

  function equals() {
    if (storedValue === null || operator === null) return;
    const currentValue = numberFromDisplay(display);
    const result = calculate(storedValue, currentValue, operator);
    setDisplay(displayNumber(result));
    setStoredValue(null);
    setOperator(null);
    setWaitingForNumber(true);
  }

  function toggleSign() {
    if (display === "0" || display === "Error") return;
    setDisplay((current) =>
      current.startsWith("-") ? current.slice(1) : `-${current}`,
    );
  }

  function percent() {
    if (display === "Error") return;
    setDisplay(displayNumber(numberFromDisplay(display) / 100));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const key = event.key;
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      inputDigit(key);
      return;
    }
    if (key === "." || key === ",") {
      event.preventDefault();
      inputDecimal();
      return;
    }
    if (key === "+" || key === "-" || key === "*" || key === "/") {
      event.preventDefault();
      applyOperator(key as Operator);
      return;
    }
    if (key === "Enter" || key === "=") {
      event.preventDefault();
      equals();
      return;
    }
    if (key === "Backspace") {
      event.preventDefault();
      setDisplay((current) =>
        current.length > 1 && current !== "Error" ? current.slice(0, -1) : "0",
      );
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  const buttons: CalculatorButton[] = [
    { label: "AC", action: clear, tone: "utility", ariaLabel: "Borrar" },
    { label: "+/-", action: toggleSign, tone: "utility", ariaLabel: "Cambiar signo" },
    { label: "%", action: percent, tone: "utility", ariaLabel: "Porcentaje" },
    { label: "÷", action: () => applyOperator("/"), tone: "operator", ariaLabel: "Dividir" },
    { label: "7", action: () => inputDigit("7") },
    { label: "8", action: () => inputDigit("8") },
    { label: "9", action: () => inputDigit("9") },
    { label: "×", action: () => applyOperator("*"), tone: "operator", ariaLabel: "Multiplicar" },
    { label: "4", action: () => inputDigit("4") },
    { label: "5", action: () => inputDigit("5") },
    { label: "6", action: () => inputDigit("6") },
    { label: "-", action: () => applyOperator("-"), tone: "operator", ariaLabel: "Restar" },
    { label: "1", action: () => inputDigit("1") },
    { label: "2", action: () => inputDigit("2") },
    { label: "3", action: () => inputDigit("3") },
    { label: "+", action: () => applyOperator("+"), tone: "operator", ariaLabel: "Sumar" },
    { label: "0", action: () => inputDigit("0"), wide: true },
    { label: ",", action: inputDecimal, ariaLabel: "Coma decimal" },
    { label: "=", action: equals, tone: "operator", ariaLabel: "Igual" },
  ];

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-blue-100 bg-white p-3 text-slate-900 shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      aria-label="Panel de calculadora rápida"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div
          className="min-h-8 flex-1 cursor-move rounded-xl px-1 active:cursor-grabbing"
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          title="Arrastrar calculadora"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar calculadora"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mb-3 min-h-20 rounded-xl bg-blue-50 px-4 py-3 text-right ring-1 ring-blue-100">
        <p className="text-xs font-bold uppercase text-blue-400">
          {operator ? operatorLabels[operator] : ""}
        </p>
        <p className="truncate text-4xl font-semibold tabular-nums text-slate-950">
          {displayText(display)}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={button.action}
            aria-label={button.ariaLabel}
            className={`flex h-12 items-center justify-center rounded-2xl text-lg font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              button.wide ? "col-span-2" : ""
            } ${
              button.tone === "operator"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : button.tone === "utility"
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}
