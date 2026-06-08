"use client";
import { useAction, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents, formatMoney } from "@/lib/money";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Papa from "papaparse";
import { Upload, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Doc } from "@convex-api/dataModel";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "categorize" | "done";
type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
type AmountMode = "single" | "debit_credit" | "type_amount";

type SkippedRow = {
  date: string;
  description: string;
  amountCents: number;
  type: string;
  reason: "duplicate" | "transfer_match";
};

interface CsvRow {
  date: string;
  description: string;
  amountCents: number;
  type: "income" | "expense";
  categoryId?: string;
}

// Unique description group for the categorize step
interface DescGroup {
  description: string;
  type: "income" | "expense" | "mixed";
  count: number;
  totalCents: number;
  categoryId: string; // "" = none
}

interface CSVProfile {
  bank: string;
  colDate: number;
  colDesc: number;
  amountMode: AmountMode;
  colAmount: number;
  colDebit: number;
  colCredit: number;
  colType: number;
  creditTypeValue: string;
  invertSign: boolean;
  dateFormat: DateFormat;
  skipDescriptions: string[];
}

// ─── Bank detection ───────────────────────────────────────────────────────────

function idx(headers: string[], ...keywords: string[]): number {
  const h = headers.map((s) => s.toLowerCase().trim());
  for (const kw of keywords) {
    const i = h.findIndex((x) => x === kw || x.includes(kw));
    if (i >= 0) return i;
  }
  return -1;
}

function detectFormat(allRows: string[][]): {
  profile: CSVProfile | null;
  headers: string[];
  dataRows: string[][];
} {
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, allRows.length); i++) {
    const row = allRows[i].map((s) => s.toLowerCase().trim());
    if (row.some((c) => c === "date" || c === "transaction date" || c === "posted date")) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = allRows[headerRowIndex].map((s) => s.trim());
  const dataRows = allRows.slice(headerRowIndex + 1);
  const h = headers.map((s) => s.toLowerCase().trim());

  if (h.includes("transaction type") && h.includes("transaction amount") && h.includes("transaction date")) {
    return { profile: { bank: "Capital One", colDate: h.indexOf("transaction date"), colDesc: h.indexOf("transaction description"), amountMode: "type_amount", colAmount: h.indexOf("transaction amount"), colDebit: -1, colCredit: -1, colType: h.indexOf("transaction type"), creditTypeValue: "credit", invertSign: false, dateFormat: "MM/DD/YYYY", skipDescriptions: [] }, headers, dataRows };
  }
  if (h.some((c) => c === "card no." || c === "card no")) {
    return { profile: { bank: "Capital One Credit", colDate: idx(headers, "transaction date"), colDesc: h.indexOf("description"), amountMode: "debit_credit", colAmount: -1, colDebit: h.indexOf("debit"), colCredit: h.indexOf("credit"), colType: -1, creditTypeValue: "", invertSign: false, dateFormat: "YYYY-MM-DD", skipDescriptions: [] }, headers, dataRows };
  }
  if (h.some((c) => c === "card member") && h.includes("amount")) {
    return { profile: { bank: "American Express", colDate: h.indexOf("date"), colDesc: h.indexOf("description"), amountMode: "single", colAmount: h.indexOf("amount"), colDebit: -1, colCredit: -1, colType: -1, creditTypeValue: "", invertSign: true, dateFormat: "MM/DD/YYYY", skipDescriptions: [] }, headers, dataRows };
  }
  if (h.includes("status") && h.includes("debit") && h.includes("credit") && h.includes("date")) {
    return { profile: { bank: "Citi", colDate: h.indexOf("date"), colDesc: h.indexOf("description"), amountMode: "debit_credit", colAmount: -1, colDebit: h.indexOf("debit"), colCredit: h.indexOf("credit"), colType: -1, creditTypeValue: "", invertSign: false, dateFormat: "MM/DD/YYYY", skipDescriptions: [] }, headers, dataRows };
  }
  if (h.some((c) => c === "post date") && h.includes("memo") && h.includes("amount")) {
    return { profile: { bank: "Chase", colDate: idx(headers, "transaction date"), colDesc: h.indexOf("description"), amountMode: "single", colAmount: h.indexOf("amount"), colDebit: -1, colCredit: -1, colType: -1, creditTypeValue: "", invertSign: false, dateFormat: "MM/DD/YYYY", skipDescriptions: [] }, headers, dataRows };
  }
  if (h.some((c) => c === "reference number") && h.includes("payee")) {
    return { profile: { bank: "Bank of America", colDate: idx(headers, "posted date"), colDesc: h.indexOf("payee"), amountMode: "single", colAmount: h.indexOf("amount"), colDebit: -1, colCredit: -1, colType: -1, creditTypeValue: "", invertSign: false, dateFormat: "MM/DD/YYYY", skipDescriptions: [] }, headers, dataRows };
  }
  if (h.some((c) => c.includes("running bal"))) {
    return { profile: { bank: "Bank of America Checking", colDate: h.indexOf("date"), colDesc: h.indexOf("description"), amountMode: "single", colAmount: h.indexOf("amount"), colDebit: -1, colCredit: -1, colType: -1, creditTypeValue: "", invertSign: false, dateFormat: "MM/DD/YYYY", skipDescriptions: ["beginning balance"] }, headers, dataRows };
  }
  return { profile: null, headers, dataRows };
}

// ─── Date normalization ───────────────────────────────────────────────────────

function normalizeDate(raw: string, format: DateFormat): string {
  const s = raw.trim();
  if (format === "YYYY-MM-DD") return s;
  const m2 = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(s);
  if (m2) {
    const [, a, b, yy] = m2;
    const yyyy = "20" + yy;
    if (format === "DD/MM/YYYY") return `${yyyy}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    return `${yyyy}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
  }
  const m4 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m4) return s;
  const [, a, b, yyyy] = m4;
  if (format === "DD/MM/YYYY") return `${yyyy}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  return `${yyyy}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
}

// ─── Shared selector (module level — ESLint static-components) ────────────────

interface ColSelectorProps {
  label: string;
  value: string;
  set: (v: string) => void;
  headers: string[];
  placeholder: string;
}

function ColSelector({ label, value, set, headers, placeholder }: ColSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label style={{ color: "var(--color-ft-text-2)" }}>{label}</Label>
      <Select value={value} onValueChange={(v) => { if (v) set(v); }}>
        <SelectTrigger className="w-full" style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)", color: "var(--color-ft-text)" }}>
          <SelectValue>
            {value !== "" && Number(value) >= 0 && headers[Number(value)] ? headers[Number(value)] : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {headers.map((h, i) => (
            <SelectItem key={i} value={String(i)}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── CategorySelect (module level) ───────────────────────────────────────────

interface CategorySelectProps {
  value: string;
  onChange: (v: string) => void;
  categories: Doc<"fintrack_categories">[];
  placeholder: string;
}

function CategorySelect({ value, onChange, categories, placeholder }: CategorySelectProps) {
  return (
    <Select value={value || "none"} onValueChange={(v) => { if (v) onChange(v === "none" ? "" : v); }}>
      <SelectTrigger className="h-7 text-xs w-40" style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)", color: value ? "var(--color-ft-text)" : "var(--color-ft-text-3)" }}>
        <SelectValue>
          {value ? (categories.find((c) => c._id === value)?.name ?? placeholder) : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
          — {placeholder}
        </SelectItem>
        {categories.map((c) => (
          <SelectItem key={c._id} value={c._id} className="text-xs">
            {c.icon} {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CSVImportDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("csvImport");
  const tc = useTranslations("common");
  const accounts = useQuery(api.fintrack.accounts.list);
  const categories = useQuery(api.fintrack.categories.listActive);
  const categorySuggestions = useQuery(api.fintrack.transactions.suggestCategories);
  const batchImport = useAction(api.fintrack.import.batchImport);

  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState("");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Column mapping
  const [colDate, setColDate] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colAmount, setColAmount] = useState("");
  const [colDebit, setColDebit] = useState("");
  const [colCredit, setColCredit] = useState("");
  const [colType, setColType] = useState("");
  const [creditTypeValue, setCreditTypeValue] = useState("credit");
  const [dateFormat, setDateFormat] = useState<DateFormat>("MM/DD/YYYY");
  const [invertSign, setInvertSign] = useState(false);
  const [amountMode, setAmountMode] = useState<AmountMode>("single");
  const [skipDescriptions, setSkipDescriptions] = useState<string[]>([]);
  const [detectedBank, setDetectedBank] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  // Map: description → categoryId (controlled during categorize step)
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    skippedRows: SkippedRow[];
    partialError?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setAccountId("");
    setRawRows([]);
    setHeaders([]);
    setColDate(""); setColDesc(""); setColAmount("");
    setColDebit(""); setColCredit(""); setColType("");
    setCreditTypeValue("credit");
    setDateFormat("MM/DD/YYYY");
    setInvertSign(false);
    setAmountMode("single");
    setSkipDescriptions([]);
    setDetectedBank(null);
    setParsedRows([]);
    setCategoryMap({});
    setLoading(false);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (res) => {
        const allRows = res.data as string[][];
        if (allRows.length < 2) { setError(t("errorMinRows")); return; }
        const { profile, headers: detectedHeaders, dataRows } = detectFormat(allRows);
        setHeaders(detectedHeaders);
        setRawRows(dataRows);
        setError("");
        if (profile) {
          setDetectedBank(profile.bank);
          setAmountMode(profile.amountMode);
          setColDate(String(profile.colDate));
          setColDesc(String(profile.colDesc));
          setColAmount(String(profile.colAmount));
          setColDebit(String(profile.colDebit));
          setColCredit(String(profile.colCredit));
          setColType(String(profile.colType));
          setCreditTypeValue(profile.creditTypeValue);
          setInvertSign(profile.invertSign);
          setDateFormat(profile.dateFormat);
          setSkipDescriptions(profile.skipDescriptions);
        } else {
          setDetectedBank(null);
          setAmountMode("single");
          const h = detectedHeaders.map((s) => s.toLowerCase());
          setColDate(String(h.findIndex((x) => x.includes("date"))));
          setColDesc(String(h.findIndex((x) => x.includes("desc") || x.includes("memo") || x.includes("narr"))));
          setColAmount(String(h.findIndex((x) => x.includes("amount") || x.includes("debit") || x.includes("credit"))));
          setSkipDescriptions([]);
        }
        setStep("map");
      },
      error: () => setError(t("errorParse")),
    });
  };

  const handleMapConfirm = () => {
    if (!accountId) { setError(t("errorSelectAccount")); return; }
    if (colDate === "" || colDate === "-1") { setError(t("errorSelectDate")); return; }
    if (colDesc === "" || colDesc === "-1") { setError(t("errorSelectDesc")); return; }

    const dateIdx = parseInt(colDate);
    const descIdx = parseInt(colDesc);
    const rows: CsvRow[] = [];

    for (const row of rawRows) {
      const desc = (row[descIdx] ?? "").trim();
      if (skipDescriptions.some((s) => desc.toLowerCase().includes(s))) continue;

      let signedAmount = 0;
      if (amountMode === "single") {
        if (colAmount === "" || colAmount === "-1") { setError(t("errorSelectAmount")); return; }
        const raw = parseFloat((row[parseInt(colAmount)] ?? "").replace(/[,$\s]/g, ""));
        if (isNaN(raw) || raw === 0) continue;
        signedAmount = invertSign ? -raw : raw;
      } else if (amountMode === "debit_credit") {
        const debitVal = parseFloat((row[parseInt(colDebit)] ?? "").replace(/[,$\s]/g, "")) || 0;
        const creditVal = parseFloat((row[parseInt(colCredit)] ?? "").replace(/[,$\s]/g, "")) || 0;
        if (debitVal === 0 && creditVal === 0) continue;
        signedAmount = creditVal > 0 ? creditVal : -debitVal;
      } else if (amountMode === "type_amount") {
        const typeVal = (row[parseInt(colType)] ?? "").toLowerCase().trim();
        const raw = parseFloat((row[parseInt(colAmount)] ?? "").replace(/[,$\s]/g, ""));
        if (isNaN(raw) || raw === 0) continue;
        signedAmount = typeVal === creditTypeValue.toLowerCase() ? raw : -raw;
      }

      rows.push({
        date: normalizeDate(row[dateIdx] ?? "", dateFormat),
        description: desc,
        amountCents: Math.abs(dollarsToCents(Math.abs(signedAmount))),
        type: signedAmount >= 0 ? "income" : "expense",
      });
    }

    if (rows.length === 0) { setError(t("errorNoValidRows")); return; }
    setParsedRows(rows);

    // Build initial categoryMap from suggestions
    const suggestions = categorySuggestions ?? {};
    const initMap: Record<string, string> = {};
    for (const row of rows) {
      const key = row.description.trim().toLowerCase();
      if (!(row.description in initMap)) {
        initMap[row.description] = suggestions[key] ?? "";
      }
    }
    setCategoryMap(initMap);
    setError("");
    setStep("categorize");
  };

  // Build description groups for the categorize step
  const descGroups: DescGroup[] = (() => {
    const map: Record<string, DescGroup> = {};
    for (const row of parsedRows) {
      if (!map[row.description]) {
        map[row.description] = { description: row.description, type: row.type, count: 0, totalCents: 0, categoryId: categoryMap[row.description] ?? "" };
      }
      const g = map[row.description];
      g.count++;
      g.totalCents += row.amountCents;
      if (g.type !== row.type) g.type = "mixed";
      g.categoryId = categoryMap[row.description] ?? "";
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  })();

  const categorizedCount = descGroups.filter((g) => g.categoryId).reduce((s, g) => s + g.count, 0);

  const handleImport = async () => {
    setLoading(true);
    setError("");
    try {
      const selectedAccount = accounts?.find((a: Doc<"fintrack_accounts">) => a._id === accountId);
      const rowsWithCategories = parsedRows.map((row) => ({
        ...row,
        categoryId: (categoryMap[row.description] || undefined) as Doc<"fintrack_categories">["_id"] | undefined,
      }));
      const res = await batchImport({
        accountId: accountId as Doc<"fintrack_accounts">["_id"],
        currencyCode: selectedAccount?.currencyCode ?? "USD",
        rows: rowsWithCategories,
      });
      setResult({ ...res, skipped: res.skippedRows.length });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorImportFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        style={{
          backgroundColor: "var(--color-ft-surface)",
          borderColor: "var(--color-ft-border)",
          maxWidth: "620px",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--color-ft-text)" }}>
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: upload ── */}
        {step === "upload" && (
          <div className="space-y-4 mt-2">
            <div
              className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer"
              style={{ borderColor: "var(--color-ft-border)" }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8" style={{ color: "var(--color-ft-text-3)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>{t("uploadPrompt")}</p>
              <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("uploadHint")}</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
            {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}
          </div>
        )}

        {/* ── Step: map columns ── */}
        {step === "map" && (
          <div className="space-y-4 mt-2">
            {detectedBank ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--color-ft-good) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-ft-good) 25%, transparent)", color: "var(--color-ft-good)" }}>
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">{t("detectedBank", { bank: detectedBank })}</span>
                <span style={{ color: "var(--color-ft-text-3)" }}>— {t("autoDetected")}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--color-ft-warn) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-ft-warn) 25%, transparent)", color: "var(--color-ft-warn)" }}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{t("notDetected")}</span>
              </div>
            )}

            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("rowsDetected", { count: rawRows.length })}</p>

            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("labelAccount")}</Label>
              <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v); }}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue>
                    {accountId && accounts ? (accounts.find((a: Doc<"fintrack_accounts">) => a._id === accountId)?.name ?? t("selectAccount")) : t("selectAccount")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((a: Doc<"fintrack_accounts">) => (
                    <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ColSelector label={t("labelDateCol")} value={colDate} set={setColDate} headers={headers} placeholder={t("selectColumn")} />
            <ColSelector label={t("labelDescCol")} value={colDesc} set={setColDesc} headers={headers} placeholder={t("selectColumn")} />

            {amountMode === "single" && (
              <ColSelector label={t("labelAmountCol")} value={colAmount} set={setColAmount} headers={headers} placeholder={t("selectColumn")} />
            )}
            {amountMode === "debit_credit" && (
              <>
                <ColSelector label={t("labelDebitCol")} value={colDebit} set={setColDebit} headers={headers} placeholder={t("selectColumn")} />
                <ColSelector label={t("labelCreditCol")} value={colCredit} set={setColCredit} headers={headers} placeholder={t("selectColumn")} />
              </>
            )}
            {amountMode === "type_amount" && (
              <>
                <ColSelector label={t("labelTypeCol")} value={colType} set={setColType} headers={headers} placeholder={t("selectColumn")} />
                <ColSelector label={t("labelAmountCol")} value={colAmount} set={setColAmount} headers={headers} placeholder={t("selectColumn")} />
              </>
            )}

            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("labelDateFormat")}</Label>
              <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
                <SelectTrigger className="w-full" style={inputStyle}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">{t("dateFormatUS")}</SelectItem>
                  <SelectItem value="DD/MM/YYYY">{t("dateFormatLatam")}</SelectItem>
                  <SelectItem value="YYYY-MM-DD">{t("dateFormatISO")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {amountMode === "single" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={invertSign} onChange={(e) => setInvertSign(e.target.checked)} className="rounded" />
                <span className="text-sm" style={{ color: "var(--color-ft-text-2)" }}>{t("invertSign")}</span>
              </label>
            )}

            {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")} style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}>{tc("back")}</Button>
              <Button onClick={handleMapConfirm} style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>{t("btnPreview")}</Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step: categorize ── */}
        {step === "categorize" && (
          <div className="space-y-4 mt-2">
            {/* Summary bar */}
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
                {t("categorizeHint", { total: parsedRows.length, groups: descGroups.length })}
              </p>
              <span className="text-xs font-medium" style={{ color: categorizedCount === parsedRows.length ? "var(--color-ft-good)" : "var(--color-ft-warn)" }}>
                {categorizedCount}/{parsedRows.length} {t("categorized")}
              </span>
            </div>

            {/* Group table */}
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-ft-border)" }}>
              <div
                className="grid text-[10px] font-medium px-3 py-1.5 border-b"
                style={{ gridTemplateColumns: "1fr auto auto", backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-3)" }}
              >
                <span>{t("colDescription")}</span>
                <span className="text-right pr-4">{t("colAmount")}</span>
                <span>{t("colCategory")}</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {descGroups.map((group) => (
                  <div
                    key={group.description}
                    className="grid items-center px-3 py-2 border-b last:border-0 gap-2"
                    style={{ gridTemplateColumns: "1fr auto auto", borderColor: "var(--color-ft-border)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs truncate font-medium" style={{ color: "var(--color-ft-text)" }}>
                        {group.description}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--color-ft-text-3)" }}>
                        {group.count} {group.count === 1 ? t("transaction") : t("transactions")}
                        {" · "}
                        <span style={{ color: group.type === "income" ? "var(--color-ft-good)" : group.type === "expense" ? "var(--color-ft-bad)" : "var(--color-ft-text-3)" }}>
                          {group.type === "income" ? t("typeIncome") : group.type === "expense" ? t("typeExpense") : t("typeMixed")}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs font-mono text-right pr-2 shrink-0" style={{ color: group.type === "income" ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}>
                      {formatMoney(group.totalCents)}
                    </span>
                    <CategorySelect
                      value={group.categoryId}
                      onChange={(v) => setCategoryMap((prev) => ({ ...prev, [group.description]: v }))}
                      categories={categories ?? []}
                      placeholder={t("noCategory")}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("map")} style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}>{tc("back")}</Button>
              <Button onClick={handleImport} disabled={loading} style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
                {loading ? t("importing") : t("importRows", { count: parsedRows.length })}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step: done ── */}
        {step === "done" && result && (
          <div className="space-y-4 mt-2">
            <div className="flex flex-col items-center gap-3 py-4">
              {result.partialError
                ? <AlertTriangle className="h-9 w-9" style={{ color: "var(--color-ft-warn)" }} />
                : <CheckCircle className="h-9 w-9" style={{ color: "var(--color-ft-good)" }} />}
              <p className="font-semibold" style={{ color: "var(--color-ft-text)" }}>
                {result.partialError ? t("partialImport") : t("importComplete")}
              </p>
              <div className="flex gap-4 text-sm">
                <span style={{ color: "var(--color-ft-good)" }}>{t("importedCount", { count: result.imported })}</span>
                {result.skipped > 0 && (
                  <span style={{ color: "var(--color-ft-warn)" }}>{t("duplicatesSkipped", { count: result.skipped })}</span>
                )}
              </div>
            </div>

            {result.partialError && (
              <div className="rounded-lg px-3 py-2.5 text-xs space-y-1" style={{ backgroundColor: "color-mix(in srgb, var(--color-ft-bad) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-ft-bad) 25%, transparent)", color: "var(--color-ft-bad)" }}>
                <p className="font-medium">{result.partialError}</p>
                <p style={{ color: "var(--color-ft-text-3)" }}>{t("rerunSafe")}</p>
              </div>
            )}

            {result.skippedRows.length > 0 && (() => {
              const duplicates = result.skippedRows.filter((r) => r.reason === "duplicate");
              const transfers = result.skippedRows.filter((r) => r.reason === "transfer_match");

              const SkippedTable = ({ rows, label, note }: { rows: typeof result.skippedRows; label: string; note: string }) => (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium" style={{ color: "var(--color-ft-text-2)" }}>{label}</p>
                  <div className="rounded-lg border overflow-hidden max-h-[160px] overflow-y-auto" style={{ borderColor: "var(--color-ft-border)" }}>
                    <table className="w-full text-xs">
                      <thead className="sticky top-0">
                        <tr style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
                          {[t("colDate"), t("colDescription"), t("colAmount")].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "var(--color-ft-text-3)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid var(--color-ft-border)" }}>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-ft-text-3)" }}>{row.date}</td>
                            <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: "var(--color-ft-text-2)" }}>{row.description}</td>
                            <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: row.type === "income" ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}>
                              {row.type === "expense" ? "-" : "+"}${(Math.abs(row.amountCents) / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{note}</p>
                </div>
              );

              return (
                <div className="space-y-4">
                  {transfers.length > 0 && <SkippedTable rows={transfers} label={t("transferMatchesSkipped", { count: transfers.length })} note={t("transferMatchNote")} />}
                  {duplicates.length > 0 && <SkippedTable rows={duplicates} label={t("duplicatesSkipped", { count: duplicates.length })} note={t("duplicateNote")} />}
                </div>
              );
            })()}

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)} style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>{t("done")}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
