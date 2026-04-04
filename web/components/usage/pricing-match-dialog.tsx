"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUsdRatePerMillion } from "@/lib/usage/format";
import type { ModelPricingRow } from "@/lib/usage/types";

type PricingMatchDialogProps = {
  rows: ModelPricingRow[];
};

function formatRate(value: number | null) {
  return value == null ? "—" : formatUsdRatePerMillion(value);
}

function getProviderLabel(row: ModelPricingRow) {
  const providerName = row.pricingProviderName?.trim();
  if (providerName) {
    return providerName;
  }

  const providerId = row.pricingProviderId?.trim();
  return providerId ? providerId : null;
}

export function PricingMatchDialog({ rows }: PricingMatchDialogProps) {
  const t = useTranslations("usage.pricing");
  const showReasoningColumn = rows.some(
    (row) => row.reasoningRateUsdPerMillion != null,
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
          aria-label={t("open")}
        >
          <Info className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden border border-border/70 bg-card p-0 shadow-2xl sm:max-w-4xl">
        <DialogHeader className="border-b border-border/60 py-5 ps-6">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="overflow-auto px-6 py-4">
          <div className="overflow-hidden rounded-xl border border-border/60">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.rawModel")}</TableHead>
                  <TableHead className="text-right">
                    {t("table.input")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("table.output")}
                  </TableHead>
                  {showReasoningColumn ? (
                    <TableHead className="text-right">
                      {t("table.reasoning")}
                    </TableHead>
                  ) : null}
                  <TableHead className="text-right">
                    {t("table.cache")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const providerLabel = getProviderLabel(row);

                  return (
                    <TableRow key={row.rawModel}>
                      <TableCell className="font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{row.rawModel}</span>
                          {providerLabel ? (
                            <Badge
                              variant="outline"
                              className="h-5 border-border/60 bg-muted/30 font-normal text-muted-foreground"
                            >
                              {providerLabel}
                            </Badge>
                          ) : null}
                        </div>
                        {!providerLabel ? (
                          <div className="mt-1 text-xs font-normal text-muted-foreground">
                            {t("table.unmatched")}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatRate(row.inputRateUsdPerMillion)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatRate(row.outputRateUsdPerMillion)}
                      </TableCell>
                      {showReasoningColumn ? (
                        <TableCell className="text-right text-muted-foreground">
                          {formatRate(row.reasoningRateUsdPerMillion)}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right text-muted-foreground">
                        {formatRate(row.cacheRateUsdPerMillion)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
