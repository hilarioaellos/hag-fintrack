"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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
    </div>
  );
}
