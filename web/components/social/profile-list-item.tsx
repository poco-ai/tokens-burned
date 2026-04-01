import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { SocialListProfile } from "@/lib/social/queries";
import { cn } from "@/lib/utils";
import { FollowButton } from "./follow-button";

type ProfileListItemProps = {
  locale: string;
  profile: SocialListProfile;
  isAuthenticated: boolean;
  labels: {
    followers: string;
    following: string;
    mutual: string;
    private: string;
    you: string;
    tagNone: string;
    tagCoworker: string;
    tagFriend: string;
    tagPeer: string;
    tagInspiration: string;
  };
};

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export function ProfileListItem({
  locale,
  profile,
  isAuthenticated,
  labels,
}: ProfileListItemProps) {
  return (
    <Card size="sm" className="shadow-sm ring-1 ring-border/60">
      <CardContent className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {profile.image ? (
            /* biome-ignore lint/performance/noImgElement: user avatars may come from arbitrary remote URLs */
            <img
              src={profile.image}
              alt={profile.name}
              className="mt-0.5 size-10 shrink-0 rounded-full border border-border/60 object-cover"
            />
          ) : (
            <div className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-sm font-semibold text-foreground">
              {getInitial(profile.username)}
            </div>
          )}

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                {profile.publicProfileEnabled ? (
                  <Link
                    href={`/u/${profile.username}`}
                    className="min-w-0 truncate text-sm font-semibold text-foreground hover:underline"
                  >
                    {profile.name}
                  </Link>
                ) : (
                  <div className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {profile.name}
                  </div>
                )}
                <span className="shrink-0 text-sm text-muted-foreground">
                  @{profile.username}
                </span>
              </div>

              {profile.isSelf ? (
                <Badge variant="outline">{labels.you}</Badge>
              ) : null}
              {!profile.publicProfileEnabled ? (
                <Badge variant="outline">{labels.private}</Badge>
              ) : null}
              {profile.isFollowing && profile.followsYou ? (
                <Badge variant="secondary">{labels.mutual}</Badge>
              ) : null}
              {profile.isFollowing && profile.followTag ? (
                <Badge variant="secondary">
                  {profile.followTag === "coworker"
                    ? labels.tagCoworker
                    : profile.followTag === "friend"
                      ? labels.tagFriend
                      : profile.followTag === "peer"
                        ? labels.tagPeer
                        : profile.followTag === "inspiration"
                          ? labels.tagInspiration
                          : labels.tagNone}
                </Badge>
              ) : null}
            </div>

            {profile.bio ? (
              <p className="line-clamp-2 text-sm text-foreground/80">
                {profile.bio}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {profile.followerCount.toLocaleString(locale)}
              </span>
              <span>{labels.followers}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="tabular-nums">
                {profile.followingCount.toLocaleString(locale)}
              </span>
              <span>{labels.following}</span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-nowrap items-center gap-2",
            profile.isSelf ? "sm:self-center" : undefined,
          )}
        >
          <FollowButton
            locale={locale}
            username={profile.username}
            initialFollowing={profile.isFollowing}
            initialTag={profile.followTag}
            isAuthenticated={isAuthenticated}
            isSelf={profile.isSelf}
            canFollow={profile.publicProfileEnabled || profile.isFollowing}
          />
        </div>
      </CardContent>
    </Card>
  );
}
