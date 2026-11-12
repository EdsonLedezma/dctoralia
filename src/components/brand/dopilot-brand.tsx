import { cn } from "~/lib/utils";

/** Official vector geometry, painted with the surrounding surface's ink color.
 * Alpha masks follow the app theme, including manual overrides of system theme. */
export function DopilotBrand({
  markOnly = false,
  className,
}: {
  markOnly?: boolean;
  className?: string;
}) {
  const asset = markOnly ? "/dopilot-icono.svg" : "/dopilot-logo.svg";
  return (
    <span
      role="img"
      aria-label="Dopilot"
      data-brand-asset={asset}
      className={cn(
        "inline-block shrink-0 bg-current align-middle",
        markOnly ? "size-9" : "h-10 w-[102px]",
        className,
      )}
      style={{
        maskImage: `url(${asset})`,
        WebkitMaskImage: `url(${asset})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskMode: "alpha",
      }}
    />
  );
}
