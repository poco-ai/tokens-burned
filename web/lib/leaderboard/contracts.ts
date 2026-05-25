import { z } from "zod";
import { leaderboardMetrics, leaderboardPeriods } from "./types";

export const leaderboardPeriodSchema = z.enum(leaderboardPeriods);
export const leaderboardMetricSchema = z.enum(leaderboardMetrics);
