import { createHash } from "node:crypto";
import type {
  ApiSettings,
  UploadSessionMetadata,
  UploadTokenBucket,
} from "./types";

const MANIFEST_VERSION = 1 as const;
const SNAPSHOT_PROTOCOL_VERSION = 1 as const;

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.replace(/\/+$/, "");
}

export interface UploadManifestScope {
  apiKeyHash: string;
  apiUrl: string;
  deviceId: string;
  projectHashSaltHash: string;
  projectMode: ApiSettings["projectMode"];
  snapshotProtocolVersion: number;
}

export interface UploadManifest {
  buckets: Record<string, string>;
  scope: UploadManifestScope;
  sessions: Record<string, string>;
  updatedAt: string;
  version: typeof MANIFEST_VERSION;
}

export interface UploadManifestDiff {
  bucketsToUpload: UploadTokenBucket[];
  nextManifest: UploadManifest;
  removedBuckets: number;
  removedSessions: number;
  scopeChangedReasons: UploadManifestScopeChange[];
  sessionsToUpload: UploadSessionMetadata[];
  unchangedBuckets: number;
  unchangedSessions: number;
}

export type UploadManifestScopeChange =
  | "device_id"
  | "project_identity"
  | "snapshot_protocol"
  | "server_or_api_key";

export function buildUploadManifestScope(input: {
  apiKey: string;
  apiUrl: string;
  deviceId: string;
  settings: ApiSettings;
}): UploadManifestScope {
  return {
    apiKeyHash: shortHash(input.apiKey),
    apiUrl: normalizeApiUrl(input.apiUrl),
    deviceId: input.deviceId,
    projectHashSaltHash: shortHash(input.settings.projectHashSalt),
    projectMode: input.settings.projectMode,
    snapshotProtocolVersion: SNAPSHOT_PROTOCOL_VERSION,
  };
}

export function describeUploadManifestScopeChanges(
  previous: UploadManifestScope,
  current: UploadManifestScope,
): UploadManifestScopeChange[] {
  const changes: UploadManifestScopeChange[] = [];

  if (
    previous.apiUrl !== current.apiUrl ||
    previous.apiKeyHash !== current.apiKeyHash
  ) {
    changes.push("server_or_api_key");
  }

  if (previous.deviceId !== current.deviceId) {
    changes.push("device_id");
  }

  if (
    previous.projectMode !== current.projectMode ||
    previous.projectHashSaltHash !== current.projectHashSaltHash
  ) {
    changes.push("project_identity");
  }

  if (previous.snapshotProtocolVersion !== current.snapshotProtocolVersion) {
    changes.push("snapshot_protocol");
  }

  return changes;
}

export function getUploadBucketManifestKey(bucket: UploadTokenBucket): string {
  return [
    bucket.deviceId,
    bucket.source,
    bucket.model,
    bucket.projectKey,
    bucket.bucketStart,
  ].join("|");
}

export function getUploadSessionManifestKey(
  session: UploadSessionMetadata,
): string {
  return [session.deviceId, session.source, session.sessionHash].join("|");
}

function getUploadBucketContentHash(bucket: UploadTokenBucket): string {
  return shortHash(
    JSON.stringify({
      cachedTokens: bucket.cachedTokens,
      hostname: bucket.hostname,
      inputTokens: bucket.inputTokens,
      outputTokens: bucket.outputTokens,
      projectLabel: bucket.projectLabel,
      reasoningTokens: bucket.reasoningTokens,
      totalTokens: bucket.totalTokens,
    }),
  );
}

function getUploadSessionContentHash(session: UploadSessionMetadata): string {
  return shortHash(
    JSON.stringify({
      activeSeconds: session.activeSeconds,
      cachedTokens: session.cachedTokens,
      durationSeconds: session.durationSeconds,
      firstMessageAt: session.firstMessageAt,
      hostname: session.hostname,
      inputTokens: session.inputTokens,
      lastMessageAt: session.lastMessageAt,
      messageCount: session.messageCount,
      modelUsages: session.modelUsages,
      outputTokens: session.outputTokens,
      primaryModel: session.primaryModel,
      projectKey: session.projectKey,
      projectLabel: session.projectLabel,
      reasoningTokens: session.reasoningTokens,
      totalTokens: session.totalTokens,
      userMessageCount: session.userMessageCount,
    }),
  );
}

function buildRecordHashes<T>(
  items: T[],
  getKey: (item: T) => string,
  getHash: (item: T) => string,
): Record<string, string> {
  const hashes: Record<string, string> = {};

  for (const item of items) {
    hashes[getKey(item)] = getHash(item);
  }

  return hashes;
}

export function createUploadManifest(input: {
  buckets: UploadTokenBucket[];
  scope: UploadManifestScope;
  sessions: UploadSessionMetadata[];
  updatedAt?: string;
}): UploadManifest {
  return {
    buckets: buildRecordHashes(
      input.buckets,
      getUploadBucketManifestKey,
      getUploadBucketContentHash,
    ),
    scope: input.scope,
    sessions: buildRecordHashes(
      input.sessions,
      getUploadSessionManifestKey,
      getUploadSessionContentHash,
    ),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    version: MANIFEST_VERSION,
  };
}

function countRemovedRecords(
  previous: Record<string, string>,
  current: Record<string, string>,
): number {
  let removed = 0;

  for (const key of Object.keys(previous)) {
    if (!(key in current)) {
      removed++;
    }
  }

  return removed;
}

export function diffUploadManifest(input: {
  buckets: UploadTokenBucket[];
  previous: UploadManifest | null;
  scope: UploadManifestScope;
  sessions: UploadSessionMetadata[];
  updatedAt?: string;
}): UploadManifestDiff {
  const nextManifest = createUploadManifest({
    buckets: input.buckets,
    scope: input.scope,
    sessions: input.sessions,
    updatedAt: input.updatedAt,
  });

  const scopeChangedReasons = input.previous
    ? describeUploadManifestScopeChanges(input.previous.scope, input.scope)
    : [];

  const previousBuckets =
    input.previous && scopeChangedReasons.length === 0
      ? input.previous.buckets
      : {};
  const previousSessions =
    input.previous && scopeChangedReasons.length === 0
      ? input.previous.sessions
      : {};

  const bucketsToUpload = input.buckets.filter((bucket) => {
    const key = getUploadBucketManifestKey(bucket);
    return previousBuckets[key] !== nextManifest.buckets[key];
  });
  const sessionsToUpload = input.sessions.filter((session) => {
    const key = getUploadSessionManifestKey(session);
    return previousSessions[key] !== nextManifest.sessions[key];
  });

  return {
    bucketsToUpload,
    nextManifest,
    removedBuckets: countRemovedRecords(previousBuckets, nextManifest.buckets),
    removedSessions: countRemovedRecords(
      previousSessions,
      nextManifest.sessions,
    ),
    scopeChangedReasons,
    sessionsToUpload,
    unchangedBuckets: input.buckets.length - bucketsToUpload.length,
    unchangedSessions: input.sessions.length - sessionsToUpload.length,
  };
}
