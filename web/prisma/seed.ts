import { randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { FollowTag } from "../generated/prisma/enums";
import {
  resolveLeaderboardWindow,
  startOfShanghaiDay,
} from "../lib/leaderboard/date";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// use `pnpm db:seed` to seed the database with mock data

const MOCK_USER_NUM = 20;

const MOCK_RANDOM_SEED = 0x5eed5eed;

const NAME_POOL = [
  "Alice",
  "Bob",
  "Carol",
  "David",
  "Erin",
  "Frank",
  "Grace",
  "Henry",
  "Ivy",
  "Jack",
  "Kate",
  "Leo",
  "Mia",
  "Noah",
  "Olivia",
  "Paul",
  "Quinn",
  "Rose",
  "Sam",
  "Tara",
] as const;

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type MockUser = {
  id: string;
  name: string;
  username: string;
  email: string;
};

function buildMockUsers(rng: () => number): MockUser[] {
  const users: MockUser[] = [];
  for (let i = 0; i < MOCK_USER_NUM; i++) {
    const n = String(i + 1).padStart(3, "0");
    const id = `mock_user_${n}`;
    const pick = NAME_POOL[Math.floor(rng() * NAME_POOL.length)] ?? "User";
    users.push({
      id,
      name: `Mock ${pick} ${n}`,
      username: `mock_user_${n}`,
      email: `mock-user-${n}@local.test`,
    });
  }
  return users;
}

/** Weekly totalTokens targets per user (random spread; leaderboard ranks by aggregate). */
function buildWeeklyTotals(rng: () => number, count: number) {
  const min = 150_000;
  const max = 2_800_000;
  return Array.from({ length: count }, () =>
    Math.floor(rng() * (max - min + 1) + min),
  );
}

function buildRandomFollowEdges(
  userIds: string[],
  rng: () => number,
  edgeCount: number,
): Array<[string, string]> {
  const edges: Array<[string, string]> = [];
  const seen = new Set<string>();
  let guard = 0;
  const maxAttempts = edgeCount * 50;

  while (edges.length < edgeCount && guard < maxAttempts) {
    guard += 1;
    const a = userIds[Math.floor(rng() * userIds.length)] ?? userIds[0];
    const b = userIds[Math.floor(rng() * userIds.length)] ?? userIds[0];
    if (a === b) {
      continue;
    }
    const key = `${a}\t${b}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    edges.push([a, b]);
  }

  return edges;
}

const SEED_DEVICE_ID = "mock_seed_device";
const SEED_SOURCE = "seed";
const SEED_MODEL = "gpt-4o";
const SEED_PROJECT_KEY = "seed-proj";
const SEED_PROJECT_LABEL = "Seed project";

function randomProjectHashSalt() {
  return randomBytes(32).toString("hex");
}

function splitWeeklyTotalAcrossDays(weeklyTotal: number, dayCount: number) {
  const base = Math.floor(weeklyTotal / dayCount);
  const remainder = weeklyTotal - base * dayCount;
  return Array.from({ length: dayCount }, (_, index) =>
    index === 0 ? base + remainder : base,
  );
}

function distributeTokens(total: number) {
  const inputTokens = Math.floor(total * 0.45);
  const outputTokens = total - inputTokens;
  return { inputTokens, outputTokens };
}

async function seedLeaderboardDaysAndBuckets(
  userIds: string[],
  weeklyTotals: number[],
) {
  const now = new Date();
  const week = resolveLeaderboardWindow("week", now);
  if (!week.start || !week.end) {
    return;
  }

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(week.start, i);
    if (day.getTime() >= week.end.getTime()) {
      break;
    }
    weekDays.push(startOfShanghaiDay(day));
  }

  if (weekDays.length === 0) {
    return;
  }

  for (let userIndex = 0; userIndex < userIds.length; userIndex++) {
    const userId = userIds[userIndex];
    const weeklyTotal = weeklyTotals[userIndex] ?? 100_000;
    const perDayTotals = splitWeeklyTotalAcrossDays(
      weeklyTotal,
      weekDays.length,
    );

    for (let d = 0; d < weekDays.length; d++) {
      const statDate = weekDays[d];
      const totalTokens = perDayTotals[d] ?? 0;
      const { inputTokens, outputTokens } = distributeTokens(totalTokens);
      const sessions = 4 + (userIndex % 5) + (d % 3);
      const activeSeconds = 900 * sessions;

      await prisma.leaderboardUserDay.upsert({
        where: {
          userId_statDate: {
            userId,
            statDate,
          },
        },
        create: {
          userId,
          statDate,
          inputTokens: BigInt(inputTokens),
          outputTokens: BigInt(outputTokens),
          reasoningTokens: BigInt(0),
          cachedTokens: BigInt(0),
          totalTokens: BigInt(totalTokens),
          activeSeconds,
          sessions,
          messages: 20 + d * 5,
          userMessages: 10 + d * 3,
        },
        update: {
          inputTokens: BigInt(inputTokens),
          outputTokens: BigInt(outputTokens),
          reasoningTokens: BigInt(0),
          cachedTokens: BigInt(0),
          totalTokens: BigInt(totalTokens),
          activeSeconds,
          sessions,
          messages: 20 + d * 5,
          userMessages: 10 + d * 3,
        },
      });

      await prisma.usageBucket.upsert({
        where: {
          userId_deviceId_source_model_projectKey_bucketStart: {
            userId,
            deviceId: SEED_DEVICE_ID,
            source: SEED_SOURCE,
            model: SEED_MODEL,
            projectKey: SEED_PROJECT_KEY,
            bucketStart: statDate,
          },
        },
        create: {
          userId,
          deviceId: SEED_DEVICE_ID,
          source: SEED_SOURCE,
          model: SEED_MODEL,
          projectKey: SEED_PROJECT_KEY,
          projectLabel: SEED_PROJECT_LABEL,
          bucketStart: statDate,
          inputTokens: BigInt(inputTokens),
          outputTokens: BigInt(outputTokens),
          reasoningTokens: BigInt(0),
          cachedTokens: BigInt(0),
          totalTokens: BigInt(totalTokens),
        },
        update: {
          inputTokens: BigInt(inputTokens),
          outputTokens: BigInt(outputTokens),
          reasoningTokens: BigInt(0),
          cachedTokens: BigInt(0),
          totalTokens: BigInt(totalTokens),
          projectLabel: SEED_PROJECT_LABEL,
        },
      });
    }
  }
}

async function seedFollows(edges: Array<[string, string]>) {
  for (const [followerId, followingId] of edges) {
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
      create: {
        followerId,
        followingId,
        tag: FollowTag.peer,
      },
      update: {
        tag: FollowTag.peer,
      },
    });
  }
}

async function main() {
  const rng = mulberry32(MOCK_RANDOM_SEED);
  const mockUsers = buildMockUsers(rng);
  const weeklyTotals = buildWeeklyTotals(rng, MOCK_USER_NUM);
  const resolvedIds: string[] = [];

  for (const u of mockUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        emailVerified: true,
        usernameNeedsSetup: false,
        usernameAutoAdjusted: false,
      },
      update: {
        name: u.name,
        username: u.username,
        emailVerified: true,
        usernameNeedsSetup: false,
        usernameAutoAdjusted: false,
      },
    });

    resolvedIds.push(user.id);

    await prisma.usagePreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        projectHashSalt: randomProjectHashSalt(),
        publicProfileEnabled: true,
        bio: `Seeded mock account (${u.username})`,
      },
      update: {
        publicProfileEnabled: true,
        bio: `Seeded mock account (${u.username})`,
      },
    });
  }

  await seedLeaderboardDaysAndBuckets(resolvedIds, weeklyTotals);

  const followRng = mulberry32(MOCK_RANDOM_SEED + 1);
  const followEdges = buildRandomFollowEdges(
    resolvedIds,
    followRng,
    Math.min(48, MOCK_USER_NUM * (MOCK_USER_NUM - 1)),
  );
  await seedFollows(followEdges);

  console.log(
    `Seeded ${MOCK_USER_NUM} mock users (MOCK_USER_NUM=${MOCK_USER_NUM}, seed=${MOCK_RANDOM_SEED}), leaderboard days + usage buckets for the current Shanghai week, and ${followEdges.length} random follow edges.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
