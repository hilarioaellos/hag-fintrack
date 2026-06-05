"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PieChart,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  CreditCard,
  BarChart3,
  Scale,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_MAIN = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/accounts", icon: Wallet, key: "accounts" },
  { href: "/transactions", icon: ArrowLeftRight, key: "transactions" },
  { href: "/budget", icon: PieChart, key: "budget" },
  { href: "/debts", icon: TrendingDown, key: "debts" },
  { href: "/receivables", icon: TrendingUp, key: "receivables" },
  { href: "/subscriptions", icon: RefreshCw, key: "subscriptions" },
  { href: "/cards", icon: CreditCard, key: "cards" },
  { href: "/reports", icon: BarChart3, key: "reports" },
  { href: "/reconciliation", icon: Scale, key: "reconciliation" },
] as const;

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "text-[var(--color-ft-primary)]"
          : "text-[var(--color-ft-text-2)] hover:text-[var(--color-ft-text)]"
      )}
      style={active ? { backgroundColor: "var(--color-ft-surface-2)" } : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const t = useTranslations("nav");

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 border-r h-full"
      style={{
        backgroundColor: "var(--color-ft-surface-3)",
        borderColor: "var(--color-ft-border)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-ft-border)" }}>
        <span
          className="ft-num text-lg font-bold tracking-tight"
          style={{ color: "var(--color-ft-primary)" }}
        >
          FinTrack
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_MAIN.map(({ href, icon, key }) => (
          <NavLink
            key={href}
            href={href}
            icon={icon}
            label={t(key)}
            active={isActive(href)}
          />
        ))}
      </nav>

      {/* Bottom: Settings + Sign out */}
      <div
        className="px-3 py-4 space-y-0.5 border-t"
        style={{ borderColor: "var(--color-ft-border)" }}
      >
        <NavLink
          href="/settings"
          icon={Settings}
          label={t("settings")}
          active={isActive("/settings")}
        />
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-[var(--color-ft-text-2)] hover:text-[var(--color-ft-bad)]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
