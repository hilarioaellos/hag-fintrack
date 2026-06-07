"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { AlertTriangle, Pencil, Trash2, Plus, Check, X } from "lucide-react";
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

type Category = Doc<"fintrack_categories"> & { isActive: boolean; excludeFromReports: boolean };

const PRESET_COLORS = [
  "#38bdf8","#4ade80","#f87171","#fb923c","#facc15",
  "#a78bfa","#f472b6","#34d399","#60a5fa","#e879f9",
  "#94a3b8","#f59e0b",
];

type EditState = { id: string; name: string; icon: string; color: string };

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className="w-8 h-4 rounded-full transition-colors disabled:opacity-40"
      style={{ backgroundColor: on ? "var(--color-ft-good)" : "var(--color-ft-surface)", border: "1px solid var(--color-ft-border)" }}
    >
      <span className="block w-3 h-3 rounded-full bg-white transition-transform mx-0.5"
        style={{ transform: on ? "translateX(16px)" : "translateX(0)" }} />
    </button>
  );
}

interface CatRowProps {
  cat: Category;
  pending: Record<string, { isActive: boolean; excludeFromReports: boolean }>;
  editState: EditState | null;
  setEditState: React.Dispatch<React.SetStateAction<EditState | null>>;
  deleteId: string | null;
  setDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
  onToggle: (cat: Category, field: "isActive" | "excludeFromReports", current: boolean) => void;
  onUpdate: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function CatRow({ cat, pending, editState, setEditState, deleteId, setDeleteId, onToggle, onUpdate, onDelete }: CatRowProps) {
  const localState = pending[cat._id];
  const isActive = localState?.isActive ?? cat.isActive;
  const excl = localState?.excludeFromReports ?? cat.excludeFromReports;
  const locked = !!cat.forceExclude;
  const isEditing = editState?.id === cat._id;
  const isDeleting = deleteId === cat._id;

  if (isEditing && editState) {
    return (
      <div className="space-y-2 px-2 py-2 rounded-lg" style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
        <div className="flex gap-2">
          <Input value={editState.icon} onChange={(e) => setEditState((s) => s ? { ...s, icon: e.target.value } : s)}
            className="w-14 text-center text-base" placeholder="🏷️"
            style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)", color: "var(--color-ft-text)" }} />
          <Input value={editState.name} onChange={(e) => setEditState((s) => s ? { ...s, name: e.target.value } : s)}
            className="flex-1" placeholder="Name"
            style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)", color: "var(--color-ft-text)" }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setEditState((s) => s ? { ...s, color: c } : s)}
              className="w-5 h-5 rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: c, outline: editState.color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }} />
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setEditState(null)} className="p-1 rounded" style={{ color: "var(--color-ft-text-3)" }}><X className="h-4 w-4" /></button>
          <button type="button" onClick={() => void onUpdate()} className="p-1 rounded" style={{ color: "var(--color-ft-good)" }}><Check className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--color-ft-bad) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-ft-bad) 30%, transparent)" }}>
        <span className="text-xs" style={{ color: "var(--color-ft-bad)" }}>Delete &quot;{cat.name}&quot;? Transactions will lose this category.</span>
        <div className="flex gap-1 shrink-0">
          <button type="button" onClick={() => setDeleteId(null)} className="p-1 rounded" style={{ color: "var(--color-ft-text-3)" }}><X className="h-4 w-4" /></button>
          <button type="button" onClick={() => void onDelete(cat._id)} className="p-1 rounded" style={{ color: "var(--color-ft-bad)" }}><Check className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 items-center px-2 py-1 rounded-lg"
      style={{ backgroundColor: "var(--color-ft-surface-2)", gridTemplateColumns: cat.isSystem ? "1fr 80px 80px" : "1fr 80px 80px 56px" }}>
      <span className="text-sm flex items-center gap-1.5" style={{ color: "var(--color-ft-text)" }}>
        {cat.color && <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: cat.color }} />}
        {cat.icon && <span>{cat.icon}</span>}
        {cat.name}
        {locked && <span title="System required" className="text-xs">🔒</span>}
      </span>
      <div className="flex justify-center">
        <Toggle on={isActive} disabled={locked} onChange={() => onToggle(cat, "isActive", isActive)} />
      </div>
      <div className="flex justify-center">
        <Toggle on={!excl} disabled={locked} onChange={() => onToggle(cat, "excludeFromReports", excl)} />
      </div>
      {!cat.isSystem && (
        <div className="flex justify-center gap-1">
          <button type="button" onClick={() => setEditState({ id: cat._id, name: cat.name, icon: cat.icon ?? "", color: cat.color ?? "#94a3b8" })}
            className="p-1 rounded hover:bg-[var(--color-ft-surface)]" style={{ color: "var(--color-ft-text-3)" }}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setDeleteId(cat._id)}
            className="p-1 rounded hover:bg-[var(--color-ft-surface)]" style={{ color: "var(--color-ft-text-3)" }}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryPreferences() {
  const categories = useQuery(api.fintrack.categories.listWithSettings);
  const initSettings = useMutation(api.fintrack.categories.initializeSettings);
  const updateSetting = useMutation(api.fintrack.categories.updateSetting);
  const createCat = useMutation(api.fintrack.categories.create);
  const updateCat = useMutation(api.fintrack.categories.update);
  const removeCat = useMutation(api.fintrack.categories.remove);

  const [pending, setPending] = useState<Record<string, { isActive: boolean; excludeFromReports: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newCat, setNewCat] = useState<{ open: boolean; name: string; icon: string; color: string }>({
    open: false, name: "", icon: "🏷️", color: "#94a3b8",
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void initSettings(); }, []);

  const toggle = (cat: Category, field: "isActive" | "excludeFromReports", current: boolean) => {
    if (cat.forceExclude) return;
    setPending((prev) => ({
      ...prev,
      [cat._id]: {
        isActive: field === "isActive" ? !current : (prev[cat._id]?.isActive ?? cat.isActive),
        excludeFromReports: field === "excludeFromReports" ? !current : (prev[cat._id]?.excludeFromReports ?? cat.excludeFromReports),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(Object.entries(pending).map(([catId, vals]) =>
        updateSetting({ categoryId: catId as Category["_id"], isActive: vals.isActive, excludeFromReports: vals.excludeFromReports })
      ));
      setPending({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!newCat.name.trim()) return;
    await createCat({ name: newCat.name.trim(), icon: newCat.icon || undefined, color: newCat.color || undefined });
    setNewCat({ open: false, name: "", icon: "🏷️", color: "#94a3b8" });
  };

  const handleUpdate = async () => {
    if (!editState || !editState.name.trim()) return;
    await updateCat({ id: editState.id as Category["_id"], name: editState.name.trim(), icon: editState.icon || undefined, color: editState.color || undefined });
    setEditState(null);
  };

  const handleDelete = async (id: string) => {
    await removeCat({ id: id as Category["_id"] });
    setDeleteId(null);
  };

  if (!categories) return <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>Loading…</p>;

  const systemCats = categories.filter((c: Category) => c.isSystem);
  const customCats = categories.filter((c: Category) => !c.isSystem);

  const catRowProps = { pending, editState, setEditState, deleteId, setDeleteId, onToggle: toggle, onUpdate: handleUpdate, onDelete: handleDelete };

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
        Manage categories. 🔒 = required by system.
      </p>

      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_56px] gap-2 px-2 pb-1 border-b" style={{ borderColor: "var(--color-ft-border)" }}>
          {["Category", "Active", "Reports", "Edit"].map((h, i) => (
            <span key={h} className={`text-xs font-medium ${i > 0 ? "text-center" : ""}`} style={{ color: "var(--color-ft-text-3)" }}>{h}</span>
          ))}
        </div>

        {customCats.length > 0 && (
          <>
            <p className="text-xs px-2 pt-1" style={{ color: "var(--color-ft-text-3)" }}>Custom</p>
            {customCats.map((cat: Category) => <CatRow key={cat._id} cat={cat} {...catRowProps} />)}
            <p className="text-xs px-2 pt-1" style={{ color: "var(--color-ft-text-3)" }}>System</p>
          </>
        )}
        {systemCats.map((cat: Category) => <CatRow key={cat._id} cat={cat} {...catRowProps} />)}
      </div>

      {/* New category form */}
      {newCat.open ? (
        <div className="space-y-2 p-3 rounded-lg border" style={{ borderColor: "var(--color-ft-border)", backgroundColor: "var(--color-ft-surface-2)" }}>
          <div className="flex gap-2">
            <Input value={newCat.icon} onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
              className="w-14 text-center text-base" placeholder="🏷️"
              style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)", color: "var(--color-ft-text)" }} />
            <Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              className="flex-1" placeholder="Category name"
              style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)", color: "var(--color-ft-text)" }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setNewCat({ ...newCat, color: c })}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: c, outline: newCat.color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setNewCat({ open: false, name: "", icon: "🏷️", color: "#94a3b8" })}
              style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}>Cancel</Button>
            <Button size="sm" className="flex-1" disabled={!newCat.name.trim()} onClick={handleCreate}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>Add</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setNewCat({ ...newCat, open: true })}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed text-xs transition-colors hover:bg-[var(--color-ft-surface-2)]"
          style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-3)" }}>
          <Plus className="h-3.5 w-3.5" /> New category
        </button>
      )}

      <Button onClick={handleSave} disabled={saving || Object.keys(pending).length === 0}
        size="sm" className="w-full"
        style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
        {saving ? "Saving…" : saved ? "Saved!" : "Save preferences"}
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
