import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Setup | Token Arena",
};

type UsageSetupPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function UsageSetupPage({ params }: UsageSetupPageProps) {
  const { locale } = await params;

  redirect(`/${locale}/usage`);
}
