"use client";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { NotificationBell } from "@/components/layout/NotificationBell";

type NavKey =
  | "dashboard"
  | "accounts"
  | "transactions"
  | "budget"
  | "debts"
  | "cards"
  | "reports"
  | "settings";

const ROUTES: [string, NavKey][] = [
  ["/dashboard", "dashboard"],
  ["/accounts", "accounts"],
  ["/transactions", "transactions"],
  ["/budget", "budget"],
  ["/debts", "debts"],
  ["/cards", "cards"],
  ["/reports", "reports"],
  ["/settings", "settings"],
];

export function Topbar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const locale = useLocale();

  const matched = ROUTES.find(([route]) => pathname === route || pathname.startsWith(route + "/"));
  const pageKey: NavKey = matched ? matched[1] : "dashboard";

  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 h-14 border-b shrink-0"
      style={{
        backgroundColor: "var(--color-ft-surface-3)",
        borderColor: "var(--color-ft-border)",
      }}
    >
      <span className="text-sm font-semibold" style={{ color: "var(--color-ft-text)" }}>
        {t(pageKey)}
      </span>
      <div className="flex items-center gap-1">
        <NotificationBell />
        <LanguageSelector locale={locale} />
        <ThemeToggle />
      </div>
    </header>
  );
}
