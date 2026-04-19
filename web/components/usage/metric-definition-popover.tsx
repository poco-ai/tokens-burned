"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

type MetricDefinitionPopoverProps = {
  ariaLabel: string;
  title: string;
  paragraphs: string[];
};

export function MetricDefinitionPopover({
  ariaLabel,
  title,
  paragraphs,
}: MetricDefinitionPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="size-5 text-muted-foreground hover:text-foreground"
          aria-label={ariaLabel}
        >
          <CircleHelp className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
        </PopoverHeader>
        {paragraphs.map((paragraph) => (
          <PopoverDescription key={paragraph}>{paragraph}</PopoverDescription>
        ))}
      </PopoverContent>
    </Popover>
  );
}
