import Link from "next/link";
import type { ReactNode } from "react";

type OAuthSignInButtonProps = {
  href: string;
  label: string;
  icon?: ReactNode;
  className?: string;
};

export function OAuthSignInButton({
  href,
  label,
  icon,
  className = "",
}: OAuthSignInButtonProps) {
  return (
    <Link
      href={href}
      className={`login-button inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg px-5 text-sm font-semibold transition ${className}`.trim()}
    >
      {icon}
      {label}
    </Link>
  );
}
