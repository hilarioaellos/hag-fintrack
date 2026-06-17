import type { Metadata } from "next";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { getLocale, getMessages } from "next-intl/server";

export const metadata: Metadata = {
  title: "HAG FinTrack",
  description: "HAG FinTrack – Personal Finance",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "HAG FinTrack",
    description: "HAG FinTrack – Personal Finance",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ConvexAuthNextjsServerProvider>
      <html lang={locale} suppressHydrationWarning>
        <body>
          <ConvexClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              disableTransitionOnChange
            >
              <I18nProvider locale={locale} messages={messages}>
                {children}
              </I18nProvider>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
