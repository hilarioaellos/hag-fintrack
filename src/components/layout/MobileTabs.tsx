"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Wallet, ArrowLeftRight, PieChart, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/accounts", icon: Wallet, key: "accounts" },
  { href: "/transactions", icon: ArrowLeftRight, key: "transactions" },
  { href: "/budget", icon: PieChart, key: "budget" },
  { href: "/reports", icon: BarChart3, key: "reports" },
] as const;

export function MobileTabs() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t flex z-50"
      style={{
        backgroundColor: "var(--color-ft-surface-3)",
        borderColor: "var(--color-ft-border)",
      }}
    >
      {TABS.map(({ href, icon: Icon, key }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-col items-center gap-1 flex-1 py-2 text-[10px] font-medium transition-colors",
            isActive(href)
              ? "text-[var(--color-ft-primary)]"
              : "text-[var(--color-ft-text-2)]"
          )}
        >
          <Icon className="h-5 w-5" />
          <span>{t(key)}</span>
        </Link>
      ))}
    </nav>
  );
}
