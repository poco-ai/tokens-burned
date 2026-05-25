import { redirect } from "next/navigation";

type UsageKeysPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function UsageKeysPage({ params }: UsageKeysPageProps) {
  const { locale } = await params;

  redirect(`/${locale}/usage`);
}
