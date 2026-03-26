import { z } from "zod";
import {
  dashboardPresets,
  projectModes,
  schemaVersion,
  usageApiKeyStatuses,
} from "./types";

export const projectModeSchema = z.enum(projectModes);
export const usageApiKeyStatusSchema = z.enum(usageApiKeyStatuses);
export const dashboardPresetSchema = z.enum(dashboardPresets);

export const usageSettingsSchema = z.object({
  schemaVersion: z.literal(schemaVersion),
  projectMode: projectModeSchema,
  projectHashSalt: z.string().min(1),
  timezone: z.string().trim().min(1),
});

export const dashboardQuerySchema = z
  .object({
    preset: dashboardPresetSchema.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    apiKeyId: z.string().trim().min(1).optional(),
    deviceId: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1).optional(),
    projectKey: z.string().trim().min(1).optional(),
  })
  .refine(
    (input) => input.preset !== "custom" || Boolean(input.from && input.to),
    {
      message: "Custom ranges require both from and to.",
      path: ["from"],
    },
  );

export const usageKeyCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
});

export const usageKeyUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(80).optional(),
    status: usageApiKeyStatusSchema.optional(),
  })
  .refine((input) => input.name !== undefined || input.status !== undefined, {
    message: "At least one field is required.",
  });

export const usagePreferenceUpdateSchema = z
  .object({
    timezone: z.string().trim().min(1).max(100).optional(),
    projectMode: projectModeSchema.optional(),
  })
  .refine(
    (input) => input.timezone !== undefined || input.projectMode !== undefined,
    {
      message: "At least one field is required.",
    },
  );
