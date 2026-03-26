export const schemaVersion = 2 as const;

export const projectModes = ["hashed", "raw", "disabled"] as const;
export type ProjectMode = (typeof projectModes)[number];

export const usageApiKeyStatuses = ["active", "disabled"] as const;
export type UsageApiKeyStatus = (typeof usageApiKeyStatuses)[number];

export const dashboardPresets = ["1d", "7d", "30d", "custom"] as const;
export type DashboardPreset = (typeof dashboardPresets)[number];
