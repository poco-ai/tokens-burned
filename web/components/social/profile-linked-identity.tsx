import Image from "next/image";
import type { ReactNode } from "react";
import { SiGithub } from "react-icons/si";
import type { LinkedProfileProviderId } from "@/lib/social/linked-provider-profile";

function ProviderIcon({
  providerId,
}: {
  providerId: LinkedProfileProviderId;
}): ReactNode {
  switch (providerId) {
    case "github":
      return <SiGithub className="size-4 shrink-0" aria-hidden />;
    case "linuxdo":
      return (
        <Image
          src="https://linux.do/logo-128.svg"
          alt=""
          width={16}
          height={16}
          className="size-4 shrink-0"
        />
      );
    case "watcha":
      return (
        <Image
          src="https://watcha.tos-cn-beijing.volces.com/products/logo/1752064513_guan-cha-insights.png?x-tos-process=image/resize,w_72/format,webp"
          alt=""
          width={16}
          height={16}
          className="size-4 shrink-0"
        />
      );
  }
}

export function ProfileLinkedIdentityLink({
  providerId,
  profileUrl,
  ariaLabel,
}: {
  providerId: LinkedProfileProviderId;
  profileUrl: string;
  ariaLabel: string;
}) {
  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center justify-center rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      aria-label={ariaLabel}
    >
      <ProviderIcon providerId={providerId} />
    </a>
  );
}
