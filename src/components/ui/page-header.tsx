import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-9 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {icon && (
          <div
            className="mb-5 flex size-12 items-center justify-center rounded-[10px] border border-line bg-subtle text-muted"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <h1 className="text-[26px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-base text-muted [overflow-wrap:anywhere]">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}
