"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Bell } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Doc } from "@convex-api/dataModel";

export function NotificationBell() {
  const t = useTranslations("notifications");
  const notifications = useQuery(api.fintrack.notifications.listUnread);
  const markAllAsRead = useMutation(api.fintrack.notifications.markAllAsRead);
  const [open, setOpen] = useState(false);

  const count = notifications?.length ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg transition-colors hover:bg-[var(--color-ft-surface-2)]"
        style={{ color: "var(--color-ft-text-3)" }}
        aria-label={t("ariaLabel")}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full flex items-center justify-center text-[10px] font-bold px-0.5"
            style={{ backgroundColor: "var(--color-ft-bad)", color: "#fff" }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-9 z-20 rounded-xl border shadow-xl w-72 overflow-hidden"
            style={{
              backgroundColor: "var(--color-ft-surface)",
              borderColor: "var(--color-ft-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-2 border-b"
              style={{ borderColor: "var(--color-ft-border)" }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--color-ft-text)" }}>
                {t("title")}
              </span>
              {count > 0 && (
                <button
                  onClick={() => { void markAllAsRead(); }}
                  className="text-[10px] transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-ft-primary)" }}
                >
                  {t("markAllRead")}
                </button>
              )}
            </div>

            {count === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "var(--color-ft-text-3)" }}>
                {t("noNotifications")}
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: "var(--color-ft-border)" }}>
                {notifications!.map((n: Doc<"fintrack_notifications">) => (
                  <div key={n._id} className="px-3 py-2.5">
                    <p className="text-xs leading-snug" style={{ color: "var(--color-ft-text)" }}>
                      {n.type === "payment_due"
                        ? t("paymentDue", { account: n.message })
                        : n.message}
                    </p>
                    <span
                      className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                      style={{
                        color:
                          n.severity === "urgent"
                            ? "var(--color-ft-bad)"
                            : n.severity === "warning"
                            ? "var(--color-ft-warn)"
                            : "var(--color-ft-text-3)",
                        backgroundColor:
                          n.severity === "urgent"
                            ? "color-mix(in srgb, var(--color-ft-bad) 12%, transparent)"
                            : n.severity === "warning"
                            ? "color-mix(in srgb, var(--color-ft-warn) 12%, transparent)"
                            : "var(--color-ft-border)",
                      }}
                    >
                      {t(`severity.${n.severity as "urgent" | "warning" | "info"}`)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
