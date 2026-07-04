import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  action,
}: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-slate-300 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {backHref ? (
          <Link
            href={backHref}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            {backLabel}
          </Link>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </header>
  );
}
