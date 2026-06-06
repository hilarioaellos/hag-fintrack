"use client";
import { useAction, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents } from "@/lib/money";
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

type Step = "upload" | "map" | "preview" | "done";
type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

type SkippedRow = {
  date: string;
  description: string;
  amountCents: number;
  type: string;
  reason: "duplicate" | "transfer_match";
};

function normalizeDate(raw: string, format: DateFormat): string {
  const s = raw.trim();
  if (format === "YYYY-MM-DD") return s;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!match) return s; // let backend reject with a clear error
  if (format === "DD/MM/YYYY") {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // MM/DD/YYYY
  const [, mm, dd, yyyy] = match;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

interface CsvRow {
  date: string;
  description: string;
  amountCents: number;
  type: "income" | "expense";
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CSVImportDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("csvImport");
  const tc = useTranslations("common");
  const accounts = useQuery(api.fintrack.accounts.list);
  const batchImport = useAction(api.fintrack.import.batchImport);

  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState("");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colDate, setColDate] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colAmount, setColAmount] = useState("");
  const [dateFormat, setDateFormat] = useState<DateFormat>("MM/DD/YYYY");
  const [invertSign, setInvertSign] = useState(false);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
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
    setColDate("");
    setColDesc("");
    setColAmount("");
    setDateFormat("MM/DD/YYYY");
    setInvertSign(false);
    setParsedRows([]);
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
        const rows = res.data as string[][];
        if (rows.length < 2) { setError(t("errorMinRows")); return; }
        setHeaders(rows[0]);
        setRawRows(rows.slice(1));
        // Auto-detect common column names
        const h = rows[0].map((s) => s.toLowerCase());
        setColDate(String(h.findIndex((x) => x.includes("date"))));
        setColDesc(String(h.findIndex((x) => x.includes("desc") || x.includes("memo") || x.includes("narr"))));
        setColAmount(String(h.findIndex((x) => x.includes("amount") || x.includes("debit") || x.includes("credit"))));
        setError("");
        setStep("map");
      },
      error: () => setError(t("errorParse")),
    });
  };

  const handleMapConfirm = () => {
    if (!accountId) { setError(t("errorSelectAccount")); return; }
    if (colDate === "" || colDate === "-1") { setError(t("errorSelectDate")); return; }
    if (colDesc === "" || colDesc === "-1") { setError(t("errorSelectDesc")); return; }
    if (colAmount === "" || colAmount === "-1") { setError(t("errorSelectAmount")); return; }

    const di = parseInt(colDate);
    const dei = parseInt(colDesc);
    const ai = parseInt(colAmount);

    const rows: CsvRow[] = [];
    for (const row of rawRows) {
      const rawAmount = parseFloat((row[ai] ?? "").replace(/[,$\s]/g, ""));
      if (isNaN(rawAmount)) continue;
      const signedAmount = invertSign ? -rawAmount : rawAmount;
      rows.push({
        date: normalizeDate(row[di] ?? "", dateFormat),
        description: (row[dei] ?? "").trim(),
        amountCents: Math.abs(dollarsToCents(Math.abs(signedAmount))),
        type: signedAmount >= 0 ? "income" : "expense",
      });
    }

    if (rows.length === 0) { setError(t("errorNoValidRows")); return; }
    setParsedRows(rows);
    setError("");
    setStep("preview");
  };

  const handleImport = async () => {
    setLoading(true);
    setError("");
    try {
      const selectedAccount = accounts?.find((a: Doc<"fintrack_accounts">) => a._id === accountId);
      const res = await batchImport({
        accountId: accountId as Doc<"fintrack_accounts">["_id"],
        currencyCode: selectedAccount?.currencyCode ?? "USD",
        rows: parsedRows,
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
          maxWidth: "560px",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--color-ft-text)" }}>
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {/* Step: upload */}
        {step === "upload" && (
          <div className="space-y-4 mt-2">
            <div
              className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer"
              style={{ borderColor: "var(--color-ft-border)" }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8" style={{ color: "var(--color-ft-text-3)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
                {t("uploadPrompt")}
              </p>
              <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
                {t("uploadHint")}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFile}
              />
            </div>
            {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}
          </div>
        )}

        {/* Step: map columns */}
        {step === "map" && (
          <div className="space-y-4 mt-2">
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
              {t("rowsDetected", { count: rawRows.length })}
            </p>

            {/* Account */}
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("labelAccount")}</Label>
              <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v); }}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue>
                    {accountId && accounts
                      ? (accounts.find((a: Doc<"fintrack_accounts">) => a._id === accountId)?.name ?? t("selectAccount"))
                      : t("selectAccount")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((a: Doc<"fintrack_accounts">) => (
                    <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Column mapping */}
            {[
              { labelKey: "labelDateCol" as const, value: colDate, set: setColDate },
              { labelKey: "labelDescCol" as const, value: colDesc, set: setColDesc },
              { labelKey: "labelAmountCol" as const, value: colAmount, set: setColAmount },
            ].map(({ labelKey, value, set }) => (
              <div key={labelKey} className="space-y-1.5">
                <Label style={{ color: "var(--color-ft-text-2)" }}>{t(labelKey)}</Label>
                <Select value={value} onValueChange={(v) => { if (v) set(v); }}>
                  <SelectTrigger className="w-full" style={inputStyle}>
                    <SelectValue>
                      {value !== "" && Number(value) >= 0 && headers[Number(value)]
                        ? headers[Number(value)]
                        : t("selectColumn")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {/* Date format */}
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("labelDateFormat")}</Label>
              <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">{t("dateFormatUS")}</SelectItem>
                  <SelectItem value="DD/MM/YYYY">{t("dateFormatLatam")}</SelectItem>
                  <SelectItem value="YYYY-MM-DD">{t("dateFormatISO")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Invert sign */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invertSign}
                onChange={(e) => setInvertSign(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: "var(--color-ft-text-2)" }}>
                {t("invertSign")}
              </span>
            </label>

            {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")} style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}>
                {tc("back")}
              </Button>
              <Button onClick={handleMapConfirm} style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
                {t("btnPreview")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: preview */}
        {step === "preview" && (
          <div className="space-y-4 mt-2">
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
              {t("previewingRows", { count: parsedRows.length })}
            </p>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-ft-border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
                    {[t("colDate"), t("colDescription"), t("colAmount"), t("colType")].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "var(--color-ft-text-3)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--color-ft-border)" }}>
                      <td className="px-3 py-2" style={{ color: "var(--color-ft-text-2)" }}>{row.date}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: "var(--color-ft-text)" }}>{row.description}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: row.type === "income" ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}>
                        {row.type === "expense" ? "-" : "+"}${(row.amountCents / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--color-ft-text-3)" }}>{row.type === "income" ? t("typeIncome") : t("typeExpense")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("map")} style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}>
                {tc("back")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading}
                style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
              >
                {loading ? t("importing") : t("importRows", { count: parsedRows.length })}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: done */}
        {step === "done" && result && (
          <div className="space-y-4 mt-2">
            {/* Summary */}
            <div className="flex flex-col items-center gap-3 py-4">
              {result.partialError
                ? <AlertTriangle className="h-9 w-9" style={{ color: "var(--color-ft-warn)" }} />
                : <CheckCircle className="h-9 w-9" style={{ color: "var(--color-ft-good)" }} />
              }
              <p className="font-semibold" style={{ color: "var(--color-ft-text)" }}>
                {result.partialError ? t("partialImport") : t("importComplete")}
              </p>
              <div className="flex gap-4 text-sm">
                <span style={{ color: "var(--color-ft-good)" }}>
                  {t("importedCount", { count: result.imported })}
                </span>
                {result.skipped > 0 && (
                  <span style={{ color: "var(--color-ft-warn)" }}>
                    {t("duplicatesSkipped", { count: result.skipped })}
                  </span>
                )}
              </div>
            </div>

            {/* Partial error banner */}
            {result.partialError && (
              <div
                className="rounded-lg px-3 py-2.5 text-xs space-y-1"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-ft-bad) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-ft-bad) 25%, transparent)",
                  color: "var(--color-ft-bad)",
                }}
              >
                <p className="font-medium">{result.partialError}</p>
                <p style={{ color: "var(--color-ft-text-3)" }}>
                  {t("rerunSafe")}
                </p>
              </div>
            )}

            {/* Skipped rows report */}
            {result.skippedRows.length > 0 && (() => {
              const duplicates = result.skippedRows.filter((r) => r.reason === "duplicate");
              const transfers = result.skippedRows.filter((r) => r.reason === "transfer_match");

              const SkippedTable = ({ rows, label, note }: {
                rows: typeof result.skippedRows;
                label: string;
                note: string;
              }) => (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium" style={{ color: "var(--color-ft-text-2)" }}>
                    {label}
                  </p>
                  <div
                    className="rounded-lg border overflow-hidden max-h-[160px] overflow-y-auto"
                    style={{ borderColor: "var(--color-ft-border)" }}
                  >
                    <table className="w-full text-xs">
                      <thead className="sticky top-0">
                        <tr style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
                          {[t("colDate"), t("colDescription"), t("colAmount")].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "var(--color-ft-text-3)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid var(--color-ft-border)" }}>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-ft-text-3)" }}>
                              {row.date}
                            </td>
                            <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: "var(--color-ft-text-2)" }}>
                              {row.description}
                            </td>
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
                  {transfers.length > 0 && (
                    <SkippedTable
                      rows={transfers}
                      label={t("transferMatchesSkipped", { count: transfers.length })}
                      note={t("transferMatchNote")}
                    />
                  )}
                  {duplicates.length > 0 && (
                    <SkippedTable
                      rows={duplicates}
                      label={t("duplicatesSkipped", { count: duplicates.length })}
                      note={t("duplicateNote")}
                    />
                  )}
                </div>
              );
            })()}

            <DialogFooter>
              <Button
                onClick={() => handleOpenChange(false)}
                style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
              >
                {t("done")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
