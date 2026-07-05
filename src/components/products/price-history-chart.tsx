"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useAppPreferences } from "@/components/app-preferences-provider";
import { formatDate, formatMoney, formatUnitPrice } from "@/lib/format";
import type { ProductHistoryRow, SpendlyUnit } from "@/lib/types";

const WIDTH = 800;
const HEIGHT = 320;
const PADDING = { top: 24, right: 24, bottom: 56, left: 72 };

type PriceHistoryChartProps = {
  rows: ProductHistoryRow[];
  unit: SpendlyUnit;
};

type ChartPoint = {
  index: number;
  x: number;
  y: number;
  row: ProductHistoryRow;
};

function buildChartPoints(rows: ProductHistoryRow[]): ChartPoint[] {
  if (rows.length === 0) {
    return [];
  }

  const timestamps = rows.map((row) =>
    new Date(`${row.purchased_at}T00:00:00`).getTime(),
  );
  const prices = rows.map((row) => Number(row.normalized_unit_price));

  const minX = Math.min(...timestamps);
  const maxX = Math.max(...timestamps);
  const minY = Math.min(...prices);
  const maxY = Math.max(...prices);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || Math.max(minY * 0.1, 0.01);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  return rows.map((row, index) => {
    const timestamp = timestamps[index];
    const price = prices[index];
    const x =
      PADDING.left +
      (rows.length === 1
        ? plotWidth / 2
        : ((timestamp - minX) / xRange) * plotWidth);
    const y =
      PADDING.top +
      plotHeight -
      ((price - minY) / yRange) * plotHeight;

    return { index, x, y, row };
  });
}

export function PriceHistoryChart({ rows, unit }: PriceHistoryChartProps) {
  const { dict } = useAppPreferences();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = useMemo(() => buildChartPoints(rows), [rows]);
  const activePoint =
    activeIndex === null ? null : (points[activeIndex] ?? null);

  const yLabels = useMemo(() => {
    if (rows.length === 0) {
      return [];
    }

    const prices = rows.map((row) => Number(row.normalized_unit_price));
    const minY = Math.min(...prices);
    const maxY = Math.max(...prices);

    return [
      { value: maxY, y: PADDING.top },
      { value: minY, y: HEIGHT - PADDING.bottom },
    ];
  }, [rows]);

  if (rows.length === 0) {
    return null;
  }

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section
      className="rounded-lg border border-slate-300 bg-white p-5"
      aria-label={dict.products.chartAriaLabel.replace("{unit}", unit)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{dict.products.priceTrend}</h2>
          <p className="text-sm text-slate-600">
            {dict.products.normalizedPriceFrom.replace("{unit}", unit)}
          </p>
        </div>
        {rows.length === 1 ? (
          <p className="text-sm text-slate-500">
            {dict.products.logAnotherReceipt}
          </p>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="min-w-[640px] w-full"
          role="img"
          aria-labelledby="price-history-chart-title"
        >
          <title id="price-history-chart-title">
            {dict.products.chartTitle}
          </title>

          <line
            x1={PADDING.left}
            y1={HEIGHT - PADDING.bottom}
            x2={WIDTH - PADDING.right}
            y2={HEIGHT - PADDING.bottom}
            stroke="#cbd5e1"
          />
          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={HEIGHT - PADDING.bottom}
            stroke="#cbd5e1"
          />

          {yLabels.map((label) => (
            <text
              key={label.value}
              x={PADDING.left - 10}
              y={label.y + 4}
              textAnchor="end"
              className="fill-slate-500 text-[11px]"
            >
              {formatMoney(label.value)}
            </text>
          ))}

          <text
            x={WIDTH / 2}
            y={HEIGHT - 12}
            textAnchor="middle"
            className="fill-slate-600 text-[12px]"
          >
            {dict.products.purchaseDateAxis}
          </text>
          <text
            x={16}
            y={HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${HEIGHT / 2})`}
            className="fill-slate-600 text-[12px]"
          >
            {`${dict.products.priceAxisLabel.replace("{unit}", unit)}`}
          </text>

          {rows.length > 1 ? (
            <polyline
              points={polyline}
              fill="none"
              stroke="#047857"
              strokeWidth={2}
            />
          ) : null}

          {points.map((point) => (
            <g key={point.row.receipt_item_id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={activeIndex === point.index ? 7 : 5}
                fill="#047857"
                className="cursor-pointer"
                onMouseEnter={() => setActiveIndex(point.index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(point.index)}
                onBlur={() => setActiveIndex(null)}
                tabIndex={0}
                role="button"
                aria-label={`${formatDate(point.row.purchased_at)}, ${point.row.store_name}, ${formatUnitPrice(Number(point.row.normalized_unit_price), unit)}`}
              />
              <title>
                {`${point.row.store_name} · ${formatDate(point.row.purchased_at)} · ${formatUnitPrice(Number(point.row.normalized_unit_price), unit)}`}
              </title>
            </g>
          ))}
        </svg>
      </div>

      {activePoint ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-medium">{activePoint.row.store_name}</p>
          <p className="mt-1 tabular-nums">
            {formatDate(activePoint.row.purchased_at)} ·{" "}
            {formatUnitPrice(
              Number(activePoint.row.normalized_unit_price),
              unit,
            )}
          </p>
          <Link
            href={`/receipts/${activePoint.row.receipt_id}`}
            className="mt-2 inline-flex font-medium text-emerald-700"
          >
            {dict.products.viewSourceReceipt}
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          {dict.products.hoverHint}
        </p>
      )}
    </section>
  );
}
