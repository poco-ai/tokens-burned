import { describe, expect, it } from "vitest";
import type {
  ApiSettings,
  UploadSessionMetadata,
  UploadTokenBucket,
} from "./types";
import {
  buildUploadManifestScope,
  createUploadManifest,
  diffUploadManifest,
  getUploadBucketManifestKey,
  getUploadSessionManifestKey,
  type UploadManifest,
} from "./upload-manifest";

const settings: ApiSettings = {
  schemaVersion: 2,
  projectHashSalt: "salt-1",
  projectMode: "hashed",
  timezone: "UTC",
};

function makeBucket(
  overrides: Partial<UploadTokenBucket> = {},
): UploadTokenBucket {
  return {
    bucketStart: "2026-03-31T10:00:00.000Z",
    cachedTokens: 5,
    deviceId: "device-1",
    hostname: "host-1",
    inputTokens: 10,
    model: "gpt-5.4",
    outputTokens: 20,
    projectKey: "project-a",
    projectLabel: "Project aaaaaa",
    reasoningTokens: 2,
    source: "codex",
    totalTokens: 37,
    ...overrides,
  };
}

function makeSession(
  overrides: Partial<UploadSessionMetadata> = {},
): UploadSessionMetadata {
  return {
    activeSeconds: 180,
    cachedTokens: 5,
    deviceId: "device-1",
    durationSeconds: 240,
    firstMessageAt: "2026-03-31T10:00:00.000Z",
    hostname: "host-1",
    inputTokens: 10,
    lastMessageAt: "2026-03-31T10:04:00.000Z",
    messageCount: 4,
    modelUsages: [
      {
        cachedTokens: 5,
        inputTokens: 10,
        model: "gpt-5.4",
        outputTokens: 20,
        reasoningTokens: 2,
        totalTokens: 37,
      },
    ],
    outputTokens: 20,
    primaryModel: "gpt-5.4",
    projectKey: "project-a",
    projectLabel: "Project aaaaaa",
    reasoningTokens: 2,
    sessionHash: "session-a",
    source: "codex",
    totalTokens: 37,
    userMessageCount: 2,
    ...overrides,
  };
}

describe("diffUploadManifest", () => {
  it("uploads only new or changed records within the same scope", () => {
    const scope = buildUploadManifestScope({
      apiKey: "ta_test_1",
      apiUrl: "https://token.poco-ai.com/",
      deviceId: "device-1",
      settings,
    });
    const previousBuckets = [
      makeBucket(),
      makeBucket({
        bucketStart: "2026-03-31T10:30:00.000Z",
        projectKey: "project-b",
        projectLabel: "Project bbbbbb",
      }),
    ];
    const previousSessions = [makeSession()];
    const previous = createUploadManifest({
      buckets: previousBuckets,
      scope,
      sessions: previousSessions,
      updatedAt: "2026-03-31T10:05:00.000Z",
    });

    const changedBucket = makeBucket({
      bucketStart: "2026-03-31T10:30:00.000Z",
      outputTokens: 50,
      projectKey: "project-b",
      projectLabel: "Project bbbbbb",
      totalTokens: 67,
    });
    const newBucket = makeBucket({
      bucketStart: "2026-03-31T11:00:00.000Z",
      projectKey: "project-c",
      projectLabel: "Project cccccc",
    });
    const changedSession = makeSession({
      activeSeconds: 210,
      lastMessageAt: "2026-03-31T10:05:00.000Z",
    });
    const newSession = makeSession({
      firstMessageAt: "2026-03-31T11:00:00.000Z",
      lastMessageAt: "2026-03-31T11:03:00.000Z",
      projectKey: "project-c",
      projectLabel: "Project cccccc",
      sessionHash: "session-b",
    });

    const diff = diffUploadManifest({
      buckets: [makeBucket(), changedBucket, newBucket],
      previous,
      scope,
      sessions: [changedSession, newSession],
    });

    expect(diff.bucketsToUpload).toHaveLength(2);
    expect(
      diff.bucketsToUpload.map((bucket) => getUploadBucketManifestKey(bucket)),
    ).toEqual([
      getUploadBucketManifestKey(changedBucket),
      getUploadBucketManifestKey(newBucket),
    ]);
    expect(diff.sessionsToUpload).toHaveLength(2);
    expect(
      diff.sessionsToUpload.map((session) =>
        getUploadSessionManifestKey(session),
      ),
    ).toEqual([
      getUploadSessionManifestKey(changedSession),
      getUploadSessionManifestKey(newSession),
    ]);
    expect(diff.unchangedBuckets).toBe(1);
    expect(diff.unchangedSessions).toBe(0);
    expect(diff.removedBuckets).toBe(0);
    expect(diff.removedSessions).toBe(0);
    expect(diff.scopeChangedReasons).toEqual([]);
  });

  it("tracks records that disappeared from the local snapshot", () => {
    const scope = buildUploadManifestScope({
      apiKey: "ta_test_1",
      apiUrl: "https://token.poco-ai.com",
      deviceId: "device-1",
      settings,
    });
    const previous = createUploadManifest({
      buckets: [
        makeBucket(),
        makeBucket({
          bucketStart: "2026-03-31T10:30:00.000Z",
          projectKey: "project-b",
          projectLabel: "Project bbbbbb",
        }),
      ],
      scope,
      sessions: [
        makeSession(),
        makeSession({
          firstMessageAt: "2026-03-31T11:00:00.000Z",
          lastMessageAt: "2026-03-31T11:03:00.000Z",
          sessionHash: "session-b",
        }),
      ],
    });

    const diff = diffUploadManifest({
      buckets: [makeBucket()],
      previous,
      scope,
      sessions: [makeSession()],
    });

    expect(diff.bucketsToUpload).toEqual([]);
    expect(diff.sessionsToUpload).toEqual([]);
    expect(diff.unchangedBuckets).toBe(1);
    expect(diff.unchangedSessions).toBe(1);
    expect(diff.removedBuckets).toBe(1);
    expect(diff.removedSessions).toBe(1);
  });

  it("treats scope changes as a fresh snapshot and re-uploads current records", () => {
    const previousScope = buildUploadManifestScope({
      apiKey: "ta_test_1",
      apiUrl: "https://token.poco-ai.com",
      deviceId: "device-1",
      settings,
    });
    const nextScope = buildUploadManifestScope({
      apiKey: "ta_test_2",
      apiUrl: "https://token.poco-ai.com",
      deviceId: "device-1",
      settings,
    });
    const currentBuckets = [makeBucket()];
    const currentSessions = [makeSession()];
    const previous = createUploadManifest({
      buckets: currentBuckets,
      scope: previousScope,
      sessions: currentSessions,
    });

    const diff = diffUploadManifest({
      buckets: currentBuckets,
      previous,
      scope: nextScope,
      sessions: currentSessions,
    });

    expect(diff.scopeChangedReasons).toEqual(["server_or_api_key"]);
    expect(diff.bucketsToUpload).toEqual(currentBuckets);
    expect(diff.sessionsToUpload).toEqual(currentSessions);
    expect(diff.unchangedBuckets).toBe(0);
    expect(diff.unchangedSessions).toBe(0);
    expect(diff.removedBuckets).toBe(0);
    expect(diff.removedSessions).toBe(0);
  });

  it("treats a legacy manifest as a snapshot protocol change", () => {
    const scope = buildUploadManifestScope({
      apiKey: "ta_test_1",
      apiUrl: "https://token.poco-ai.com",
      deviceId: "device-1",
      settings,
    });
    const currentBuckets = [makeBucket()];
    const currentSessions = [makeSession()];
    const previous = createUploadManifest({
      buckets: currentBuckets,
      scope,
      sessions: currentSessions,
    });
    const legacyPrevious = JSON.parse(
      JSON.stringify(previous),
    ) as UploadManifest & {
      scope: UploadManifest["scope"] & {
        snapshotProtocolVersion?: number;
      };
    };
    delete legacyPrevious.scope.snapshotProtocolVersion;

    const diff = diffUploadManifest({
      buckets: currentBuckets,
      previous: legacyPrevious as UploadManifest,
      scope,
      sessions: currentSessions,
    });

    expect(diff.scopeChangedReasons).toEqual(["snapshot_protocol"]);
    expect(diff.bucketsToUpload).toEqual(currentBuckets);
    expect(diff.sessionsToUpload).toEqual(currentSessions);
  });
});
