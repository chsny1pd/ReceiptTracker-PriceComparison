export default function AppLoading() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <div className="space-y-3 border-b border-slate-300 pb-6">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-64 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-lg border border-slate-300 bg-white" />
        <div className="h-36 animate-pulse rounded-lg border border-slate-300 bg-white" />
      </div>
      <div className="h-56 animate-pulse rounded-lg border border-slate-300 bg-white" />
      <p className="sr-only">Loading page content...</p>
    </div>
  );
}
