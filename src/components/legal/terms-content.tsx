import { TERMS_SECTIONS, TERMS_UPDATED_LABEL } from "~/lib/legal/terms";
import { cn } from "~/lib/utils";

export function TermsContent({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 text-sm leading-6", className)}>
      <p className="text-muted-foreground text-[13px]">
        Última actualización: {TERMS_UPDATED_LABEL}
      </p>
      {TERMS_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-foreground text-base font-semibold">
            {section.title}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
