export const followTags = [
  "coworker",
  "friend",
  "peer",
  "inspiration",
] as const;

export type FollowTag = (typeof followTags)[number];

const followTagFilterValues = ["all", ...followTags] as const;
export type FollowTagFilter = (typeof followTagFilterValues)[number];

export type FollowTagSelectValue = "none" | FollowTag;

export function toFollowTagSelectValue(
  tag: FollowTag | null | undefined,
): FollowTagSelectValue {
  return tag ?? "none";
}

export function fromFollowTagSelectValue(value: FollowTagSelectValue) {
  return value === "none" ? null : value;
}
