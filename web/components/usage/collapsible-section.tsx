"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  countLabel?: string;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function CollapsibleSection({
  title,
  description,
  countLabel,
  defaultOpen = false,
  className,
  contentClassName,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-foreground/10",
        className,
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-6"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base leading-none font-medium">{title}</h2>
            {countLabel ? (
              <span className="text-xs text-muted-foreground">
                {countLabel}
              </span>
            ) : null}
          </div>

          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground">
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </span>
      </button>

      {isOpen ? (
        <div
          className={cn(
            "border-t border-border/60 px-4 py-3 sm:px-6",
            contentClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
