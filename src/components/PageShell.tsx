import Link from "next/link";
import { ReactNode } from "react";

interface PageShellProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  backHref?: string;
  children: ReactNode;
  className?: string;
}

export default function PageShell({
  title,
  subtitle,
  action,
  backHref,
  children,
  className = "",
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-[1400px] mx-auto px-4 py-6 sm:py-8">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          {(title || subtitle || action || backHref) && (
            <div className="bg-slate-900 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
                  {backHref && (
                    <Link
                      href={backHref}
                      className="inline-flex items-center rounded-2xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                    >
                      ← Back
                    </Link>
                  )}
                  <div>
                    {title && <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>}
                    {subtitle && <p className="text-sm text-slate-300 mt-1">{subtitle}</p>}
                  </div>
                </div>
                {action && <div className="flex items-center gap-3">{action}</div>}
              </div>
            </div>
          )}
          <div className={`px-4 py-5 sm:px-6 sm:py-6 ${className}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
