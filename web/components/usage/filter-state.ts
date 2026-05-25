import type {
  DashboardPreset,
  UsageFilterOptions,
  UsageFilters,
} from "@/lib/usage/types";

type ActiveFilterChip = {
  key: keyof UsageFilters;
  label: string;
  value: string;
};

export type FilterMeta = {
  icon: "key" | "device" | "tool" | "model" | "project";
  shortLabel: string;
};

const filterOrder: Array<keyof UsageFilters> = [
  "apiKeyId",
  "deviceId",
  "source",
  "model",
  "projectKey",
];

export function getFilterMeta(key: keyof UsageFilters): FilterMeta {
  switch (key) {
    case "apiKeyId":
      return { icon: "key", shortLabel: "Keys" };
    case "deviceId":
      return { icon: "device", shortLabel: "Devices" };
    case "source":
      return { icon: "tool", shortLabel: "Tools" };
    case "model":
      return { icon: "model", shortLabel: "Models" };
    case "projectKey":
      return { icon: "project", shortLabel: "Projects" };
    default:
      return { icon: "project", shortLabel: "Filters" };
  }
}

function getFilterLabel(
  key: keyof UsageFilters,
  value: string,
  options: UsageFilterOptions,
) {
  switch (key) {
    case "apiKeyId":
      return (
        options.apiKeys.find((option) => option.id === value)?.name ?? value
      );
    case "deviceId":
      return (
        options.devices.find((option) => option.value === value)?.label ?? value
      );
    case "source":
      return (
        options.sources.find((option) => option.value === value)?.label ?? value
      );
    case "model":
      return (
        options.models.find((option) => option.value === value)?.label ?? value
      );
    case "projectKey":
      return (
        options.projects.find((option) => option.value === value)?.label ??
        value
      );
    default:
      return value;
  }
}

export function hasActiveDashboardState(
  preset: DashboardPreset,
  filters: UsageFilters,
) {
  return (
    preset !== "7d" ||
    Boolean(
      filters.apiKeyId ||
        filters.deviceId ||
        filters.source ||
        filters.model ||
        filters.projectKey,
    )
  );
}

export function getActiveFilterChips(
  filters: UsageFilters,
  options: UsageFilterOptions,
  maxVisible = 3,
) {
  const active = filterOrder.flatMap((key) => {
    const value = filters[key];

    if (!value) {
      return [];
    }

    return [
      {
        key,
        label: getFilterLabel(key, value, options),
        value,
      } satisfies ActiveFilterChip,
    ];
  });

  return {
    visible: active.slice(0, maxVisible),
    hiddenCount: Math.max(0, active.length - maxVisible),
    totalCount: active.length,
  };
}
