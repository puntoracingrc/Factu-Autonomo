"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Delete, X } from "lucide-react";
import {
  calculatorHasEditableValue,
  deleteLastCalculatorCharacter,
  initialCalculatorX,
} from "./quick-calculator-logic";
import { quickToolDragVisualStyle } from "./quick-tool-drag-visual";

type Operator = "+" | "-" | "*" | "/";

interface QuickCalculatorProps {
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

type CalculatorButtonTone = "utility" | "operator";

interface CalculatorButton {
  label: string;
  action: () => void;
  tone?: CalculatorButtonTone;
  wide?: boolean;
  ariaLabel?: string;
  clearControl?: boolean;
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

export function QuickCalculator({
  isActive,
  onActivate,
  onClose,
}: QuickCalculatorProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const clearHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longClearTriggeredRef = useRef(false);
  const [position, setPosition] = useState<CalculatorPosition>({
    x: 12,
    y: 120,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForNumber, setWaitingForNumber] = useState(false);

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
    const width = panel?.offsetWidth ?? 212;
    const height = panel?.offsetHeight ?? 320;
    setPosition(
      clampPosition({
        x: initialCalculatorX(window.innerWidth, width),
        y: window.innerHeight - height - 80,
      }),
    );
    panelRef.current?.focus();

    return () => {
      if (clearHoldTimerRef.current) {
        clearTimeout(clearHoldTimerRef.current);
      }
    };
  }, []);

  function clampPosition(next: CalculatorPosition): CalculatorPosition {
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 212;
    const height = panel?.offsetHeight ?? 320;
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

  function clear() {
    setDisplay("0");
    setStoredValue(null);
    setOperator(null);
    setWaitingForNumber(false);
  }

  function deleteLastCharacter() {
    setDisplay((current) => deleteLastCalculatorCharacter(current));
    setWaitingForNumber(false);
  }

  function cancelClearHold() {
    if (!clearHoldTimerRef.current) return;
    clearTimeout(clearHoldTimerRef.current);
    clearHoldTimerRef.current = null;
  }

  function startClearHold() {
    if (!calculatorHasEditableValue(display)) return;
    cancelClearHold();
    longClearTriggeredRef.current = false;
    clearHoldTimerRef.current = setTimeout(() => {
      longClearTriggeredRef.current = true;
      clearHoldTimerRef.current = null;
      clear();
    }, 600);
  }

  function handleClearClick() {
    if (longClearTriggeredRef.current) {
      longClearTriggeredRef.current = false;
      return;
    }
    if (calculatorHasEditableValue(display)) {
      deleteLastCharacter();
      return;
    }
    clear();
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
      deleteLastCharacter();
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  const showBackspace = calculatorHasEditableValue(display);
  const buttons: CalculatorButton[] = [
    {
      label: "AC",
      action: handleClearClick,
      tone: "utility",
      ariaLabel: showBackspace
        ? "Borrar último carácter. Mantén pulsado para borrar todo"
        : "Borrar todo",
      clearControl: true,
    },
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
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
      style={{
        left: position.x,
        top: position.y,
        ...quickToolDragVisualStyle("calculator", isDragging, isActive),
      }}
      className="fixed w-[min(13.25rem,calc(100vw-1rem))] origin-center rounded-xl border border-blue-100 bg-white p-2.5 text-slate-900 motion-reduce:!transform-none motion-reduce:!transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
      aria-label="Panel de calculadora rápida"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div
          className="min-h-6 flex-1 cursor-move rounded-lg px-1 active:cursor-grabbing"
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={cancelDrag}
          title="Arrastrar calculadora"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar calculadora"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-2 min-h-16 rounded-lg bg-blue-50 px-3 py-2 text-right ring-1 ring-blue-100 dark:bg-slate-800 dark:ring-slate-700">
        <p className="text-[0.65rem] font-bold uppercase text-blue-400 dark:text-blue-300">
          {operator ? operatorLabels[operator] : ""}
        </p>
        <p className="truncate text-3xl font-semibold tabular-nums text-slate-950 dark:text-white">
          {displayText(display)}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={button.action}
            onPointerDown={button.clearControl ? startClearHold : undefined}
            onPointerUp={button.clearControl ? cancelClearHold : undefined}
            onPointerCancel={button.clearControl ? cancelClearHold : undefined}
            onPointerLeave={button.clearControl ? cancelClearHold : undefined}
            onContextMenu={
              button.clearControl
                ? (event) => event.preventDefault()
                : undefined
            }
            aria-label={button.ariaLabel}
            title={
              button.clearControl && showBackspace
                ? "Borra un carácter; mantén pulsado para borrar todo"
                : button.ariaLabel
            }
            className={`flex h-10 select-none items-center justify-center rounded-full text-base font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              button.wide ? "col-span-2" : ""
            } ${
              button.tone === "operator"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : button.tone === "utility"
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-slate-600 dark:text-white dark:hover:bg-slate-500"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            }`}
          >
            {button.clearControl && showBackspace ? (
              <Delete className="h-4 w-4" aria-hidden="true" />
            ) : (
              button.label
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
