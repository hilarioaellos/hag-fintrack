"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Doc } from "@convex-api/dataModel";

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
];

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

type Category = Doc<"fintrack_categories">;

function CategoryPreferences() {
  const categories = useQuery(api.fintrack.categories.list);
  const initSettings = useMutation(api.fintrack.categories.initializeSettings);
  const updateSetting = useMutation(api.fintrack.categories.updateSetting);

  // Pending local state: categoryId → { isActive, excludeFromReports }
  const [pending, setPending] = useState<
    Record<string, { isActive: boolean; excludeFromReports: boolean }>
  >({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize settings once on mount so listActive works correctly
  useEffect(() => {
    initSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (
    cat: Category,
    field: "isActive" | "excludeFromReports",
    current: boolean
  ) => {
    if (cat.forceExclude) return;
    setPending((prev) => ({
      ...prev,
      [cat._id]: {
        isActive: field === "isActive" ? !current : (prev[cat._id]?.isActive ?? true),
        excludeFromReports:
          field === "excludeFromReports"
            ? !current
            : (prev[cat._id]?.excludeFromReports ?? false),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(pending).map(([catId, vals]) =>
          updateSetting({
            categoryId: catId as Category["_id"],
            isActive: vals.isActive,
            excludeFromReports: vals.excludeFromReports,
          })
        )
      );
      setPending({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!categories) {
    return (
      <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
        Loading categories…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
        Manage which categories appear in selectors and reports.
        Categories marked with 🔒 are required by the system.
      </p>

      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-2 pb-1 border-b"
          style={{ borderColor: "var(--color-ft-border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--color-ft-text-3)" }}>
            Category
          </span>
          <span className="text-xs font-medium text-center" style={{ color: "var(--color-ft-text-3)" }}>
            Active
          </span>
          <span className="text-xs font-medium text-center" style={{ color: "var(--color-ft-text-3)" }}>
            In Reports
          </span>
        </div>

        {categories.map((cat: Category) => {
          const localState = pending[cat._id];
          const isActive = localState?.isActive ?? true;
          const excludeFromReports = localState?.excludeFromReports ?? false;
          const locked = !!cat.forceExclude;

          return (
            <div
              key={cat._id}
              className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-2 py-1 rounded-lg"
              style={{ backgroundColor: "var(--color-ft-surface-2)" }}
            >
              <span className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-ft-text)" }}>
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
                {locked && <span title="System required" className="text-xs">🔒</span>}
              </span>

              {/* Active toggle */}
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => toggle(cat, "isActive", isActive)}
                  className="w-8 h-4 rounded-full transition-colors disabled:opacity-40"
                  style={{
                    backgroundColor: isActive
                      ? "var(--color-ft-good)"
                      : "var(--color-ft-surface)",
                    border: "1px solid var(--color-ft-border)",
                  }}
                  aria-label={isActive ? "Active" : "Inactive"}
                >
                  <span
                    className="block w-3 h-3 rounded-full bg-white transition-transform mx-0.5"
                    style={{ transform: isActive ? "translateX(16px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              {/* Exclude from reports toggle */}
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => toggle(cat, "excludeFromReports", excludeFromReports)}
                  className="w-8 h-4 rounded-full transition-colors disabled:opacity-40"
                  style={{
                    backgroundColor: !excludeFromReports
                      ? "var(--color-ft-good)"
                      : "var(--color-ft-bad)",
                    border: "1px solid var(--color-ft-border)",
                  }}
                  aria-label={excludeFromReports ? "Excluded from reports" : "Included in reports"}
                >
                  <span
                    className="block w-3 h-3 rounded-full bg-white transition-transform mx-0.5"
                    style={{ transform: !excludeFromReports ? "translateX(16px)" : "translateX(0)" }}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || Object.keys(pending).length === 0}
        size="sm"
        className="w-full"
        style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save category preferences"}
      </Button>
    </div>
  );
}

function DangerZone() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const clearUserData = useMutation(api.fintrack.user_settings.clearUserData);
  const [step, setStep] = useState<"idle" | "confirming" | "clearing" | "done">("idle");
  const [confirmText, setConfirmText] = useState("");
  const [clearError, setClearError] = useState("");

  const CONFIRM_WORD = t("clearDataConfirmWord");

  const resetConfirm = () => {
    setStep("idle");
    setConfirmText("");
    setClearError("");
  };

  const handleConfirm = async () => {
    setStep("clearing");
    setClearError("");
    try {
      await clearUserData({});
      setConfirmText("");
      setStep("done");
      setTimeout(() => setStep("idle"), 4000);
    } catch {
      setClearError(t("clearDataError"));
      setStep("confirming");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
        {t("clearDataDesc")}
      </p>

      {step === "idle" && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setStep("confirming")}
          style={{ borderColor: "var(--color-ft-bad)", color: "var(--color-ft-bad)" }}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {t("clearData")}
        </Button>
      )}

      {step === "confirming" && (
        <div className="space-y-3">
          <p className="text-xs font-medium" style={{ color: "var(--color-ft-bad)" }}>
            {t("clearDataConfirmPrompt", { word: CONFIRM_WORD })}
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            style={{
              backgroundColor: "var(--color-ft-surface-2)",
              borderColor: "var(--color-ft-bad)",
              color: "var(--color-ft-text)",
            }}
          />
          {clearError && (
            <p className="text-xs" style={{ color: "var(--color-ft-bad)" }}>{clearError}</p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={resetConfirm}
              style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}
            >
              {tc("cancel")}
            </Button>
            <Button
              className="flex-1"
              disabled={confirmText !== CONFIRM_WORD}
              onClick={handleConfirm}
              style={{ backgroundColor: "var(--color-ft-bad)", color: "#fff" }}
            >
              {t("clearDataConfirm")}
            </Button>
          </div>
        </div>
      )}

      {step === "clearing" && (
        <p className="text-sm text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("clearDataClearing")}
        </p>
      )}

      {step === "done" && (
        <p className="text-sm text-center font-medium" style={{ color: "var(--color-ft-good)" }}>
          ✓ {t("clearDataDone")}
        </p>
      )}
    </div>
  );
}

export function SettingsForm() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { setTheme: setNextTheme } = useTheme();
  const settings = useQuery(api.fintrack.user_settings.get);
  const updateSettings = useMutation(api.fintrack.user_settings.update);
  const [currency, setCurrency] = useState("USD");
  const [theme, setTheme] = useState("system");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setCurrency(settings.defaultCurrency || "USD");
      setTheme(settings.theme || "system");
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ defaultCurrency: currency, theme });
      setNextTheme(theme);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Preferences Card */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--color-ft-text)" }}>
          {t("preferences")}
        </p>

        {/* Currency */}
        <div className="space-y-1.5">
          <Label style={{ color: "var(--color-ft-text-2)" }}>{t("defaultCurrency")}</Label>
          <Select value={currency} onValueChange={(v) => { if (v) setCurrency(v); }}>
            <SelectTrigger style={inputStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Theme */}
        <div className="space-y-1.5">
          <Label style={{ color: "var(--color-ft-text-2)" }}>{t("theme")}</Label>
          <Select value={theme} onValueChange={(v) => { if (v) setTheme(v); }}>
            <SelectTrigger style={inputStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEMES.map((tm) => (
                <SelectItem key={tm.value} value={tm.value}>
                  {tm.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
        >
          {saving ? tc("loading") : saved ? t("saved") : tc("save")}
        </Button>
      </div>

      {/* Category Preferences Card */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--color-ft-text)" }}>
          Category Preferences
        </p>
        <CategoryPreferences />
      </div>

      {/* Info Card */}
      <div
        className="rounded-xl border p-5 space-y-3"
        style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--color-ft-text)" }}>
          {t("account")}
        </p>
        <div className="space-y-2 text-xs" style={{ color: "var(--color-ft-text-3)" }}>
          <p>{t("version")}: v1.0.0</p>
          <p>{t("dataBackup")}: {t("automatic")}</p>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{
          backgroundColor: "var(--color-ft-surface)",
          borderColor: "color-mix(in srgb, var(--color-ft-bad) 40%, var(--color-ft-border))",
        }}
      >
        <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--color-ft-bad)" }}>
          <AlertTriangle className="h-4 w-4" />
          {t("dangerZone")}
        </p>
        <DangerZone />
      </div>
    </div>
  );
}
