export const leaderboardPeriods = ["day", "week", "month", "all_time"] as const;
export type LeaderboardPeriod = (typeof leaderboardPeriods)[number];

export const leaderboardMetrics = ["total_tokens"] as const;
export type LeaderboardMetric = (typeof leaderboardMetrics)[number];
export const defaultLeaderboardMetric: LeaderboardMetric = "total_tokens";

export type LeaderboardWindow = {
  start: Date | null;
  end: Date | null;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  username: string;
  image: string | null;
  bio: string | null;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  activeSeconds: number;
  sessions: number;
  followerCount: number;
  followingCount: number;
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
};

export type LeaderboardDataset = {
  scope: "global" | "following";
  period: LeaderboardPeriod;
  generatedAt: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  entries: LeaderboardEntry[];
};

export type LeaderboardPageData = {
  global: LeaderboardDataset;
  following: LeaderboardDataset | null;
  viewerPublicProfileEnabled: boolean | null;
};
