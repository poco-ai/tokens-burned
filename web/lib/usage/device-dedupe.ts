export type DeviceDedupeRow = {
  deviceId: string;
  hostname: string;
  deviceFingerprint?: string | null;
  firstSeenAt?: Date;
};

export type DeviceDedupeIndex = {
  canonicalDeviceIdByDeviceId: Map<string, string>;
  deviceGroupKeyByDeviceId: Map<string, string>;
  deviceIdsByCanonicalDeviceId: Map<string, string[]>;
  canonicalDevices: DeviceDedupeRow[];
};

function sortCanonicalDeviceRows(
  left: DeviceDedupeRow,
  right: DeviceDedupeRow,
) {
  const leftTime = left.firstSeenAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightTime = right.firstSeenAt?.getTime() ?? Number.MAX_SAFE_INTEGER;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.deviceId.localeCompare(right.deviceId);
}

function getDeviceGroupKey(device: DeviceDedupeRow) {
  return device.deviceFingerprint?.trim() || device.deviceId;
}

export function buildDeviceDedupeIndex(
  devices: DeviceDedupeRow[],
): DeviceDedupeIndex {
  const grouped = new Map<string, DeviceDedupeRow[]>();

  for (const device of devices) {
    const key = getDeviceGroupKey(device);
    const existing = grouped.get(key);

    if (existing) {
      existing.push(device);
      continue;
    }

    grouped.set(key, [device]);
  }

  const canonicalDeviceIdByDeviceId = new Map<string, string>();
  const deviceGroupKeyByDeviceId = new Map<string, string>();
  const deviceIdsByCanonicalDeviceId = new Map<string, string[]>();
  const canonicalDevices: DeviceDedupeRow[] = [];

  for (const [groupKey, members] of grouped) {
    const sortedMembers = [...members].sort(sortCanonicalDeviceRows);
    const canonical = sortedMembers[0];

    if (!canonical) {
      continue;
    }

    const memberIds = sortedMembers.map((device) => device.deviceId);
    deviceIdsByCanonicalDeviceId.set(canonical.deviceId, memberIds);
    canonicalDevices.push(canonical);

    for (const member of sortedMembers) {
      canonicalDeviceIdByDeviceId.set(member.deviceId, canonical.deviceId);
      deviceGroupKeyByDeviceId.set(member.deviceId, groupKey);
    }
  }

  canonicalDevices.sort(sortCanonicalDeviceRows);

  return {
    canonicalDeviceIdByDeviceId,
    deviceGroupKeyByDeviceId,
    deviceIdsByCanonicalDeviceId,
    canonicalDevices,
  };
}

export function resolveDeviceFilterIds(
  deviceIndex: DeviceDedupeIndex,
  deviceId?: string,
) {
  if (!deviceId) {
    return undefined;
  }

  const canonicalDeviceId =
    deviceIndex.canonicalDeviceIdByDeviceId.get(deviceId) ?? deviceId;

  return (
    deviceIndex.deviceIdsByCanonicalDeviceId.get(canonicalDeviceId) ?? [
      deviceId,
    ]
  );
}

export function normalizeCanonicalDeviceId(
  deviceIndex: DeviceDedupeIndex,
  deviceId: string,
) {
  return deviceIndex.canonicalDeviceIdByDeviceId.get(deviceId) ?? deviceId;
}

export function resolveDeviceGroupKey(
  deviceIndex: DeviceDedupeIndex,
  deviceId: string,
) {
  return deviceIndex.deviceGroupKeyByDeviceId.get(deviceId) ?? deviceId;
}

export function dedupeRowsByDeviceGroup<
  T extends {
    deviceId: string;
    updatedAt: Date;
  },
>(
  rows: T[],
  deviceIndex: DeviceDedupeIndex,
  buildLogicalKey: (row: T, deviceGroupKey: string) => string,
) {
  const deduped = new Map<string, T>();

  for (const row of rows) {
    const deviceGroupKey = resolveDeviceGroupKey(deviceIndex, row.deviceId);
    const canonicalDeviceId = normalizeCanonicalDeviceId(
      deviceIndex,
      row.deviceId,
    );
    const logicalKey = buildLogicalKey(row, deviceGroupKey);
    const normalizedRow =
      canonicalDeviceId === row.deviceId
        ? row
        : { ...row, deviceId: canonicalDeviceId };
    const existing = deduped.get(logicalKey);

    if (
      !existing ||
      normalizedRow.updatedAt.getTime() >= existing.updatedAt.getTime()
    ) {
      deduped.set(logicalKey, normalizedRow);
    }
  }

  return Array.from(deduped.values());
}

export function buildDeviceDisplayLabels(
  devices: Array<{ deviceId: string; hostname: string }>,
) {
  const hostnameCounts = new Map<string, number>();

  for (const device of devices) {
    hostnameCounts.set(
      device.hostname,
      (hostnameCounts.get(device.hostname) ?? 0) + 1,
    );
  }

  return new Map(
    devices.map((device) => [
      device.deviceId,
      (hostnameCounts.get(device.hostname) ?? 0) > 1
        ? `${device.hostname} · ${device.deviceId.slice(0, 8)}`
        : device.hostname,
    ]),
  );
}
