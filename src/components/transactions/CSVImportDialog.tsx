"use client";
import { useAction, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents } from "@/lib/money";
import { useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, CheckCircle } from "lucide-react";
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
  const accounts = useQuery(api.fintrack.accounts.list);
  const batchImport = useAction(api.fintrack.import.batchImport);

  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState("");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colDate, setColDate] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colAmount, setColAmount] = useState("");
  const [invertSign, setInvertSign] = useState(false);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [loading, setLoading] = useState(false);
  type SkippedRow = {
    date: string;
    description: string;
    amountCents: number;
    type: string;
    reason: "duplicate" | "transfer_match";
  };
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    skippedRows: SkippedRow[];
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
        if (rows.length < 2) { setError("CSV must have at least a header and one row"); return; }
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
      error: () => setError("Failed to parse CSV"),
    });
  };

  const handleMapConfirm = () => {
    if (!accountId) { setError("Select an account"); return; }
    if (colDate === "" || colDate === "-1") { setError("Select date column"); return; }
    if (colDesc === "" || colDesc === "-1") { setError("Select description column"); return; }
    if (colAmount === "" || colAmount === "-1") { setError("Select amount column"); return; }

    const di = parseInt(colDate);
    const dei = parseInt(colDesc);
    const ai = parseInt(colAmount);

    const rows: CsvRow[] = [];
    for (const row of rawRows) {
      const rawAmount = parseFloat((row[ai] ?? "").replace(/[,$\s]/g, ""));
      if (isNaN(rawAmount)) continue;
      const signedAmount = invertSign ? -rawAmount : rawAmount;
      rows.push({
        date: row[di] ?? "",
        description: (row[dei] ?? "").trim(),
        amountCents: Math.abs(dollarsToCents(Math.abs(signedAmount))),
        type: signedAmount >= 0 ? "income" : "expense",
      });
    }

    if (rows.length === 0) { setError("No valid rows found"); return; }
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
      setError(err instanceof Error ? err.message : "Import failed");
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
            Import CSV
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
                Click to upload CSV file
              </p>
              <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
                Exported from any bank
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
              {rawRows.length} rows detected. Map columns below.
            </p>

            {/* Account */}
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>Account</Label>
              <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v); }}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue placeholder="Select account" />
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
              { label: "Date column", value: colDate, set: setColDate },
              { label: "Description column", value: colDesc, set: setColDesc },
              { label: "Amount column", value: colAmount, set: setColAmount },
            ].map(({ label, value, set }) => (
              <div key={label} className="space-y-1.5">
                <Label style={{ color: "var(--color-ft-text-2)" }}>{label}</Label>
                <Select value={value} onValueChange={(v) => { if (v) set(v); }}>
                  <SelectTrigger className="w-full" style={inputStyle}>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {/* Invert sign */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invertSign}
                onChange={(e) => setInvertSign(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: "var(--color-ft-text-2)" }}>
                Invert amount sign (if expenses show as positive)
              </span>
            </label>

            {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")} style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}>
                Back
              </Button>
              <Button onClick={handleMapConfirm} style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
                Preview
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: preview */}
        {step === "preview" && (
          <div className="space-y-4 mt-2">
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
              Previewing first 5 of {parsedRows.length} rows
            </p>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-ft-border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
                    {["Date", "Description", "Amount", "Type"].map((h) => (
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
                      <td className="px-3 py-2" style={{ color: "var(--color-ft-text-3)" }}>{row.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("map")} style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading}
                style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
              >
                {loading ? `Importing…` : `Import ${parsedRows.length} rows`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: done */}
        {step === "done" && result && (
          <div className="space-y-4 mt-2">
            {/* Summary */}
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="h-9 w-9" style={{ color: "var(--color-ft-good)" }} />
              <p className="font-semibold" style={{ color: "var(--color-ft-text)" }}>
                Import complete
              </p>
              <div className="flex gap-4 text-sm">
                <span style={{ color: "var(--color-ft-good)" }}>
                  ✓ {result.imported} imported
                </span>
                {result.skipped > 0 && (
                  <span style={{ color: "var(--color-ft-warn)" }}>
                    ⚠ {result.skipped} duplicates skipped
                  </span>
                )}
              </div>
            </div>

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
                          {["Date", "Description", "Amount"].map((h) => (
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
                      label={`↔ ${transfers.length} transfer match${transfers.length > 1 ? "es" : ""} skipped`}
                      note="These deposits/withdrawals match a manual transfer you already recorded — skipped to avoid double-counting."
                    />
                  )}
                  {duplicates.length > 0 && (
                    <SkippedTable
                      rows={duplicates}
                      label={`⚠ ${duplicates.length} duplicate${duplicates.length > 1 ? "s" : ""} skipped`}
                      note="These rows were already imported in a previous CSV — skipped automatically."
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
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
