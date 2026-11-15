import Link from "next/link";

type MetricItem = {
  label: string;
  value: number | string | null | undefined;
  href?: string;
};

/** Small operating figures, never individual dashboard cards. */
export function MetricStrip({
  items,
  label = "Indicadores",
}: {
  items: readonly MetricItem[];
  label?: string;
}) {
  return (
    <section
      aria-label={label}
      className="border-border/60 mb-5 flex flex-wrap gap-x-7 gap-y-3 border-b pb-4"
    >
      {items.map((item) => {
        const content = (
          <>
            <span className="text-muted-foreground text-xs">{item.label}</span>
            <span className="text-foreground text-lg leading-none font-semibold tabular-nums">
              {item.value ?? "—"}
            </span>
          </>
        );
        const className =
          "flex min-h-11 min-w-24 flex-col justify-center gap-1.5";
        return item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className={`${className} focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none`}
          >
            {content}
          </Link>
        ) : (
          <div key={item.label} className={className}>
            {content}
          </div>
        );
      })}
    </section>
  );
}
