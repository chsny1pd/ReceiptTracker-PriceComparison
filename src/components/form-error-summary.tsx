type FormErrorSummaryProps = {
  message: string | null;
};

export function FormErrorSummary({ message }: FormErrorSummaryProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <p className="font-medium">Could not save</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
