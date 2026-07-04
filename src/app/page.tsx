import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
            Spendly
          </p>
          <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-tight">
            Track receipts, compare fair prices, and settle shared grocery
            runs.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            A focused school-project base for receipt logging, normalized unit
            price comparisons, receipt image uploads, and netted balances.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-400 px-5 text-sm font-semibold transition hover:border-emerald-600"
            >
              Open dashboard
            </Link>
            <Link
              href="/setup"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-400 px-5 text-sm font-semibold transition hover:border-emerald-600"
            >
              Setup guide
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <div className="border-b border-dashed border-slate-300 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Receipt preview</h2>
              <span className="text-sm text-slate-500">Today</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Fresh Market</p>
          </div>
          <div className="space-y-3 py-5">
            {[
              ["Milk", "$2.40 / l"],
              ["Rice", "$1.90 / kg"],
              ["Eggs", "$0.35 / each"],
            ].map(([name, price]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-sm text-slate-600">{price}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 border-t border-dashed border-slate-300 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Latest comparison</span>
              <span className="font-medium text-emerald-700">
                $0.30 cheaper
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Balance</span>
              <span className="font-medium">Alex owes you $8.20</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
