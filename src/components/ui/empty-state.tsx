import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="flex min-h-72 flex-col items-center justify-center rounded-[10px] border border-line px-5 py-12 text-center sm:px-8">
      <div
        aria-hidden="true"
        className="mb-5 flex size-12 items-center justify-center rounded-full bg-subtle text-muted"
      >
        {icon}
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        {children}
      </div>
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
