"use client";

import { useMemo, useState } from "react";

import { useAppPreferences } from "@/components/app-preferences-provider";
import { ReceiptCard, type ReceiptCardData } from "@/components/dashboard/receipt-card";
import { Modal } from "@/components/ui/modal";
import { formatDate, formatMoney } from "@/lib/format";

const WIDTH = 800;
const HEIGHT = 320;
const PADDING = { top: 24, right: 24, bottom: 56, left: 72 };

export type DailySpendingPoint = {
  date: string;
  total: number;
  receipts: ReceiptCardData[];
};

type SpendingOverviewChartProps = {
  dailySpending: DailySpendingPoint[];
};

type ChartPoint = {
  index: number;
  x: number;
  y: number;
  point: DailySpendingPoint;
};

function buildChartPoints(dailySpending: DailySpendingPoint[]): ChartPoint[] {
  if (dailySpending.length === 0) {
    return [];
  }

  const timestamps = dailySpending.map((entry) =>
    new Date(`${entry.date}T00:00:00`).getTime(),
  );
  const totals = dailySpending.map((entry) => entry.total);

  const minX = Math.min(...timestamps);
  const maxX = Math.max(...timestamps);
  const minY = 0;
  const maxY = Math.max(...totals);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  return dailySpending.map((point, index) => {
    const timestamp = timestamps[index];
    const total = totals[index];
    const x =
      PADDING.left +
      (dailySpending.length === 1
        ? plotWidth / 2
        : ((timestamp - minX) / xRange) * plotWidth);
    const y =
      PADDING.top + plotHeight - ((total - minY) / yRange) * plotHeight;

    return { index, x, y, point };
  });
}

export function SpendingOverviewChart({
  dailySpending,
}: SpendingOverviewChartProps) {
  const { dict } = useAppPreferences();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const points = useMemo(
    () => buildChartPoints(dailySpending),
    [dailySpending],
  );
  const selectedPoint =
    selectedIndex === null ? null : (points[selectedIndex]?.point ?? null);

  const yLabels = useMemo(() => {
    if (dailySpending.length === 0) {
      return [];
    }

    const maxY = Math.max(...dailySpending.map((entry) => entry.total));

    return [
      { value: maxY, y: PADDING.top },
      { value: 0, y: HEIGHT - PADDING.bottom },
    ];
  }, [dailySpending]);

  if (dailySpending.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold">{dict.dashboard.spendingOverview}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {dict.dashboard.spendingOverviewEmpty}
        </p>
      </section>
    );
  }

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <>
      <section
        className="rounded-lg border border-slate-300 bg-white p-5"
        aria-label={dict.dashboard.spendingOverviewChartLabel}
      >
        <div>
          <h2 className="text-lg font-semibold">{dict.dashboard.spendingOverview}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {dict.dashboard.dailySpendingDescription}
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="min-w-[640px] w-full"
            role="img"
            aria-labelledby="spending-overview-chart-title"
          >
            <title id="spending-overview-chart-title">
              {dict.dashboard.dailySpendingLineChartTitle}
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
              {dict.receipts.purchaseDate}
            </text>
            <text
              x={16}
              y={HEIGHT / 2}
              textAnchor="middle"
              transform={`rotate(-90 16 ${HEIGHT / 2})`}
              className="fill-slate-600 text-[12px]"
            >
              {dict.dashboard.dailyTotalAxis}
            </text>

            {dailySpending.length > 1 ? (
              <polyline
                points={polyline}
                fill="none"
                stroke="#047857"
                strokeWidth={2}
              />
            ) : null}

            {points.map((point) => (
              <g key={point.point.date}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={selectedIndex === point.index ? 7 : 5}
                  fill="#047857"
                  className="cursor-pointer"
                  onClick={() => setSelectedIndex(point.index)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatDate(point.point.date)}, ${formatMoney(point.point.total)}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedIndex(point.index);
                    }
                  }}
                />
                <title>
                  {`${formatDate(point.point.date)} · ${formatMoney(point.point.total)} · ${point.point.receipts.length} receipt${point.point.receipts.length === 1 ? "" : "s"}`}
                </title>
              </g>
            ))}
          </svg>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          {dict.dashboard.clickPointToOpen}
        </p>
      </section>

      <Modal
        open={selectedPoint !== null}
        onClose={() => setSelectedIndex(null)}
        title={
          selectedPoint
            ? `${dict.dashboard.receiptsModalTitle} · ${formatDate(selectedPoint.date)}`
            : dict.dashboard.receiptsModalTitle
        }
        panelClassName="max-w-2xl"
      >
        {selectedPoint ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {selectedPoint.receipts.length}{" "}
              {selectedPoint.receipts.length === 1
                ? dict.dashboard.receiptSingular
                : dict.dashboard.receiptPlural}{" "}
              ·{" "}
              <span className="font-medium tabular-nums text-slate-950">
                {formatMoney(selectedPoint.total)}
              </span>{" "}
              {dict.dashboard.totalSuffix}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedPoint.receipts.map((receipt) => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
