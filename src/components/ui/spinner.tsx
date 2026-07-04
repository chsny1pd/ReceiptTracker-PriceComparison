type SpinnerProps = {
  size?: "sm" | "md";
  className?: string;
};

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-slate-300 border-t-emerald-600 ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    />
  );
}
