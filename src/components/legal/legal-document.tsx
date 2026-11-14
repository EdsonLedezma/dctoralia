import { LEGAL_UPDATED_LABEL, type LegalSection } from "~/lib/legal/company";
import { cn } from "~/lib/utils";

export function LegalDocument({
  sections,
  className,
}: {
  sections: LegalSection[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 text-sm leading-6", className)}>
      <p className="text-muted-foreground text-[13px]">
        Última actualización: {LEGAL_UPDATED_LABEL}
      </p>
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-foreground text-base font-semibold">
            {section.title}
          </h2>
          {section.content.map((block, index) =>
            Array.isArray(block) ? (
              <ul
                key={index}
                className="text-muted-foreground list-disc space-y-1 pl-5"
              >
                {block.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={index} className="text-muted-foreground">
                {block}
              </p>
            ),
          )}
        </section>
      ))}
    </div>
  );
}
