"use client";

import { formatMoney } from "@/lib/calculations";
import type { SupplierSpendSlice } from "@/lib/expense-filters";
import { useState } from "react";

interface ExpenseSupplierDonutProps {
  slices: SupplierSpendSlice[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  ariaLabel?: string;
  maxLegendItems?: number;
}

const SIZE = 160;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUT = 72;
const R_IN = 46;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function donutSlicePath(startDeg: number, endDeg: number): string {
  if (endDeg - startDeg >= 359.99) {
    endDeg = startDeg + 359.99;
  }
  const startOut = polar(CX, CY, R_OUT, endDeg);
  const endOut = polar(CX, CY, R_OUT, startDeg);
  const startIn = polar(CX, CY, R_IN, startDeg);
  const endIn = polar(CX, CY, R_IN, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${startOut.x} ${startOut.y}`,
    `A ${R_OUT} ${R_OUT} 0 ${large} 0 ${endOut.x} ${endOut.y}`,
    `L ${startIn.x} ${startIn.y}`,
    `A ${R_IN} ${R_IN} 0 ${large} 1 ${endIn.x} ${endIn.y}`,
    "Z",
  ].join(" ");
}

export function ExpenseSupplierDonut({
  slices,
  selectedKey,
  onSelect,
  ariaLabel = "Gastos por proveedor",
  maxLegendItems = 5,
}: ExpenseSupplierDonutProps) {
  const [expanded, setExpanded] = useState(false);
  if (slices.length === 0) return null;

  let angle = 0;
  const visibleSlices = expanded ? slices : slices.slice(0, maxLegendItems);
  const hiddenCount = Math.max(slices.length - visibleSlices.length, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="relative shrink-0">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="drop-shadow-sm"
          role="img"
          aria-label={ariaLabel}
        >
          {slices.map((slice) => {
            const sweep = (slice.percent / 100) * 360;
            const start = angle;
            const end = angle + sweep;
            angle = end;
            const active =
              selectedKey === null || selectedKey === slice.key;
            return (
              <path
                key={slice.key}
                d={donutSlicePath(start, end)}
                fill={slice.color}
                opacity={active ? 1 : 0.35}
                className="cursor-pointer transition-opacity hover:opacity-90"
                onClick={() =>
                  onSelect(selectedKey === slice.key ? null : slice.key)
                }
                tabIndex={0}
                role="button"
                aria-label={`${slice.label}: ${formatMoney(
                  slice.amount,
                )}, ${slice.percent.toFixed(0)}%`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(selectedKey === slice.key ? null : slice.key);
                  }
                }}
              >
                <title>
                  {slice.label}: {formatMoney(slice.amount)} (
                  {slice.percent.toFixed(0)}%)
                </title>
              </path>
            );
          })}
        </svg>
      </div>

      <ul className="w-full min-w-0 space-y-2 sm:flex-1">
        {visibleSlices.map((slice) => {
          const selected = selectedKey === slice.key;
          return (
            <li key={slice.key}>
              <button
                type="button"
                onClick={() =>
                  onSelect(selected ? null : slice.key)
                }
                className={`grid w-full grid-cols-[auto,minmax(0,1fr)] items-center gap-x-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors ${
                  selected
                    ? "bg-blue-50 ring-1 ring-blue-200"
                    : "hover:bg-slate-50"
                }`}
                title={`${slice.label}: ${formatMoney(
                  slice.amount,
                )} (${slice.percent.toFixed(0)}%)`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">
                    {slice.label}
                  </span>
                  <span className="block text-xs tabular-nums text-slate-500">
                    {slice.percent.toFixed(0)}% ·{" "}
                    <strong className="font-semibold text-slate-900">
                      {formatMoney(slice.amount)}
                    </strong>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {hiddenCount > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-full border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              + {hiddenCount}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
