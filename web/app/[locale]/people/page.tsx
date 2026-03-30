import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileListItem } from "@/components/social/profile-list-item";
import { SocialShell } from "@/components/social/social-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Link } from "@/i18n/navigation";
import { getOptionalSession } from "@/lib/session";
import {
  listFollowerProfiles,
  listFollowingProfiles,
  type SocialListProfile,
  searchPublicProfiles,
} from "@/lib/social/queries";
import { cn } from "@/lib/utils";

type PeoplePageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type PeopleTab = "all" | "following" | "followers";

const PAGE_SIZE = 5;

function buildPageRange(
  current: number,
  total: number,
): ({ type: "ellipsis"; key: string } | { type: "page"; value: number })[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({
      type: "page" as const,
      value: i + 1,
    }));
  }
  const pages: (
    | { type: "ellipsis"; key: string }
    | { type: "page"; value: number }
  )[] = [{ type: "page", value: 1 }];
  if (current > 3) {
    pages.push({ type: "ellipsis", key: "start" });
  }
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push({ type: "page", value: i });
  }
  if (current < total - 2) {
    pages.push({ type: "ellipsis", key: "end" });
  }
  pages.push({ type: "page", value: total });
  return pages;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePeopleTab(
  value: string | undefined,
  authenticated: boolean,
): PeopleTab {
  if (!authenticated) {
    return "all";
  }

  if (value === "following" || value === "followers") {
    return value;
  }

  return "all";
}

function filterProfiles(profiles: SocialListProfile[], query: string) {
  if (!query) {
    return profiles;
  }

  const normalized = query.toLowerCase();

  return profiles.filter((profile) => {
    const haystack = [profile.username, profile.name, profile.bio ?? ""]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "social.people" });

  return {
    title: `${t("title")} | Token Arena`,
    description: t("description"),
  };
}

export default async function PeoplePage({
  params,
  searchParams,
}: PeoplePageProps) {
  const { locale } = await params;
  const viewer = await getOptionalSession();
  const t = await getTranslations({ locale, namespace: "social.people" });
  const tNetwork = await getTranslations({
    locale,
    namespace: "social.network",
  });
  const tCard = await getTranslations({ locale, namespace: "social.card" });
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = firstValue(resolvedSearchParams?.query)?.trim() ?? "";
  const tab = normalizePeopleTab(
    firstValue(resolvedSearchParams?.tab),
    Boolean(viewer),
  );
  const pageParam = firstValue(resolvedSearchParams?.page);
  const currentPage = Math.max(1, Number(pageParam ?? 1));

  const allProfiles = await (async () => {
    if (tab === "following" && viewer) {
      return filterProfiles(await listFollowingProfiles(viewer.user.id), query);
    }

    if (tab === "followers" && viewer) {
      return filterProfiles(await listFollowerProfiles(viewer.user.id), query);
    }

    return searchPublicProfiles({
      query,
      viewerUserId: viewer?.user.id ?? null,
    });
  })();

  const totalPages = Math.max(1, Math.ceil(allProfiles.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const profiles = allProfiles.slice(
    (validPage - 1) * PAGE_SIZE,
    validPage * PAGE_SIZE,
  );

  const tabs: Array<{ value: PeopleTab; label: string }> = [
    { value: "all", label: t("title") },
    ...(viewer
      ? [
          { value: "following" as const, label: tNetwork("followingTitle") },
          { value: "followers" as const, label: tNetwork("followersTitle") },
        ]
      : []),
  ];

  const emptyText =
    tab === "following"
      ? tNetwork("emptyFollowing")
      : tab === "followers"
        ? tNetwork("emptyFollowers")
        : t("empty");
  const isNetworkEmptyState = tab === "following" || tab === "followers";

  function buildPageUrl(pageNum: number) {
    const params = new URLSearchParams();
    if (tab !== "all") {
      params.set("tab", tab);
    }
    if (query) {
      params.set("query", query);
    }
    if (pageNum > 1) {
      params.set("page", pageNum.toString());
    }

    const queryString = params.toString();
    return queryString ? `/people?${queryString}` : "/people";
  }

  const pages = buildPageRange(validPage, totalPages);

  return (
    <SocialShell
      locale={locale}
      viewer={
        viewer
          ? {
              id: viewer.user.id,
              email: viewer.user.email,
              name: viewer.user.name,
              image: viewer.user.image,
              username: viewer.user.username,
            }
          : null
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav
            aria-label={t("title")}
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {tabs.map((item) => (
              <Link
                key={item.value}
                href={
                  item.value === "all"
                    ? query
                      ? { pathname: "/people", query: { query } }
                      : "/people"
                    : query
                      ? {
                          pathname: "/people",
                          query: { tab: item.value, query },
                        }
                      : { pathname: "/people", query: { tab: item.value } }
                }
                aria-current={tab === item.value ? "page" : undefined}
                className={cn(
                  "inline-flex items-center border-b-2 border-transparent py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  tab === item.value && "border-foreground text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form className="flex flex-col gap-2 sm:flex-row">
            {tab !== "all" ? (
              <input type="hidden" name="tab" value={tab} />
            ) : null}
            <Input
              type="search"
              name="query"
              defaultValue={query}
              placeholder={t("searchPlaceholder")}
              className="w-full sm:w-72"
            />
            <Button type="submit">{t("search")}</Button>
          </form>
        </div>

        {profiles.length > 0 ? (
          <div className="space-y-6">
            <div className="space-y-3">
              {profiles.map((profile) => (
                <ProfileListItem
                  key={profile.id}
                  locale={locale}
                  profile={profile}
                  isAuthenticated={Boolean(viewer)}
                  labels={{
                    followers: tCard("followers"),
                    following: tCard("following"),
                    mutual: tCard("mutual"),
                    private: tCard("private"),
                    you: tCard("you"),
                    viewProfile: tCard("viewProfile"),
                  }}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={buildPageUrl(validPage - 1)}
                        className={
                          validPage <= 1
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>
                    {pages.map((p) =>
                      p.type === "ellipsis" ? (
                        <PaginationItem key={p.key}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p.value}>
                          <PaginationLink
                            href={buildPageUrl(p.value)}
                            isActive={p.value === validPage}
                          >
                            {p.value}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href={buildPageUrl(validPage + 1)}
                        className={
                          validPage >= totalPages
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        ) : (
          <Card
            size={isNetworkEmptyState ? "sm" : "default"}
            className="shadow-sm ring-1 ring-border/60"
          >
            {isNetworkEmptyState ? (
              <CardContent className="flex min-h-12 items-center py-1 text-sm text-muted-foreground">
                {emptyText}
              </CardContent>
            ) : (
              <CardContent className="py-6 text-sm text-muted-foreground">
                {emptyText}
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </SocialShell>
  );
}
