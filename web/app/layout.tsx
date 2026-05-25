import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { getLocale } from "next-intl/server";
import { ClarityInit } from "@/components/providers/clarity-init";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeScript } from "@/components/providers/theme-script";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { defaultLocale } from "@/lib/i18n";
import { getAppOrigin } from "@/lib/site-url";
import { getThemeMode, themeCookieName } from "@/lib/theme";
import "./globals.css";

const appOrigin = getAppOrigin();

export const metadata: Metadata = {
  ...(appOrigin ? { metadataBase: new URL(appOrigin) } : {}),
  title: "Token Arena",
  description:
    "Open-source AI usage tracking: sync local AI coding CLI sessions to a web dashboard for token usage, activity, and analytics.",
  keywords: [
    "AI usage",
    "token",
    "token arena",
    "token tracking",
    "token usage",
    "LLM",
    "CLI",
    "Agent",
    "dashboard",
    "open source",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Token Arena",
    description:
      "Usage over time, breakdowns by device, tool, model, and project—privacy-first with hashed project names by default.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Token Arena",
    description:
      "Open-source platform to collect AI CLI usage locally and explore token metrics, badges, and leaderboards on the web.",
  },
  appleWebApp: {
    title: "Token Arena",
    statusBarStyle: "black-translucent",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaSecret = process.env.GA_SECRET;
  const clarityId = process.env.CLARITY_ID?.trim();
  const wechatShareEnabled = Boolean(
    process.env.WECHAT_OPEN_APP_ID?.trim() && getAppOrigin(),
  );
  const cookieStore = await cookies();
  const locale =
    (await getLocale().catch(() => defaultLocale)) ?? defaultLocale;
  const initialThemeMode = getThemeMode(
    cookieStore.get(themeCookieName)?.value,
  );

  return (
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeScript initialThemeMode={initialThemeMode} />
        {gaSecret ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaSecret}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaSecret}');`}
            </Script>
          </>
        ) : null}
        {clarityId ? <ClarityInit projectId={clarityId} /> : null}
        {wechatShareEnabled ? (
          <Script
            src="https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxopensdk.js"
            strategy="afterInteractive"
          />
        ) : null}
        <ThemeProvider initialThemeMode={initialThemeMode}>
          <TooltipProvider>
            {children}
            <Toaster position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
