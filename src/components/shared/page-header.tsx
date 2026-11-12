import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="border-border mb-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium">{eyebrow}</p>
        <h1 className="text-foreground text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[32px]">
          {title}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-6 sm:text-base">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
