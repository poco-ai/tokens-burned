import { redirect } from "next/navigation";

type UsageSetupPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function UsageSetupPage({ params }: UsageSetupPageProps) {
  const { locale } = await params;

  redirect(`/${locale}/usage`);
}
