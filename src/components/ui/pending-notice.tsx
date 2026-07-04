import { Spinner } from "@/components/ui/spinner";

type PendingNoticeProps = {
  show: boolean;
  message: string;
};

export function PendingNotice({ show, message }: PendingNoticeProps) {
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-slate-300 bg-white px-5 py-3 shadow-lg"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="sm" />
      <span className="text-sm font-medium text-slate-700">{message}</span>
    </div>
  );
}
