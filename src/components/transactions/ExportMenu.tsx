"use client";
import { Menu } from "@base-ui/react/menu";
import { useTranslations } from "next-intl";
import { Download, Printer, ChevronDown } from "lucide-react";
import Papa from "papaparse";
import { toLocalDateInput } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Doc } from "@convex-api/dataModel";

interface ExportMenuProps {
  transactions: Doc<"fintrack_transactions">[];
  accountMap: Record<string, Doc<"fintrack_accounts">>;
  categoryMap: Record<string, Doc<"fintrack_categories">>;
  dateFrom: string;
  dateTo: string;
  disabled?: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Prevents formula injection in Excel/Google Sheets.
// Strips leading whitespace first, then prefixes with ' if the first non-space char
// would be interpreted as a formula operator.
function escapeCsvCell(s: string): string {
  const trimmed = s.trimStart();
  if (/^[=+\-@\t\r]/.test(trimmed)) return "'" + s;
  return s;
}

const itemCls =
  "flex items-center gap-2 px-3 py-2 text-sm cursor-default outline-none " +
  "data-[highlighted]:bg-[var(--color-ft-surface-2)] transition-colors";

export function ExportMenu({
  transactions,
  accountMap,
  categoryMap,
  dateFrom,
  dateTo,
  disabled,
}: ExportMenuProps) {
  const t = useTranslations("transactions");

  const handleDownloadCsv = () => {
    const rows = transactions.map((tx) => ({
      Date:     escapeCsvCell(toLocalDateInput(tx.date)),
      Type:     escapeCsvCell(tx.type),
      Account:  escapeCsvCell(accountMap[tx.accountId as string]?.name ?? ""),
      Category: escapeCsvCell(categoryMap[tx.categoryId as string]?.name ?? ""),
      Notes:    escapeCsvCell(tx.notes ?? ""),
      Amount:   tx.amountCents / 100,   // signed numeric — no symbol for clean spreadsheet import
      Currency: tx.currencyCode,
    }));

    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${toLocalDateInput(Date.now())}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    // Build print title from whichever date bounds are set
    let title = "All Transactions";
    if (dateFrom && dateTo) title = `Transactions ${dateFrom} – ${dateTo}`;
    else if (dateFrom)       title = `Transactions from ${dateFrom}`;
    else if (dateTo)         title = `Transactions to ${dateTo}`;

    // Compute totals per currency (transfers excluded — same as transaction list)
    const totalsByCurrency: Record<string, { income: number; expenses: number }> = {};
    for (const tx of transactions) {
      if (tx.type === "transfer") continue;
      const cur = tx.currencyCode;
      if (!totalsByCurrency[cur]) totalsByCurrency[cur] = { income: 0, expenses: 0 };
      if (tx.type === "income")  totalsByCurrency[cur].income   += tx.amountCents;
      if (tx.type === "expense") totalsByCurrency[cur].expenses += Math.abs(tx.amountCents);
    }

    const footerRows = Object.entries(totalsByCurrency).map(([cur, { income, expenses }]) => {
      const net = income - expenses;
      return `<tr style="font-weight:600;border-top:2px solid #000">
        <td colspan="5">${escapeHtml(cur)} — Income: ${escapeHtml(formatMoney(income, cur))} &nbsp; Expenses: ${escapeHtml(formatMoney(expenses, cur))} &nbsp; Net: ${escapeHtml(formatMoney(net, cur))}</td>
        <td></td><td></td>
      </tr>`;
    }).join("");

    const bodyRows = transactions.map((tx) => {
      const amtSign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
      const amtDisplay = `${amtSign}${escapeHtml(formatMoney(Math.abs(tx.amountCents), tx.currencyCode))}`;
      return `<tr>
        <td>${escapeHtml(toLocalDateInput(tx.date))}</td>
        <td>${escapeHtml(tx.type)}</td>
        <td>${escapeHtml(accountMap[tx.accountId as string]?.name ?? "")}</td>
        <td>${escapeHtml(categoryMap[tx.categoryId as string]?.name ?? "")}</td>
        <td>${escapeHtml(tx.notes ?? "")}</td>
        <td style="text-align:right;white-space:nowrap">${amtDisplay}</td>
        <td>${escapeHtml(tx.currencyCode)}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: system-ui, sans-serif; font-size: 12px; margin: 16px; }
        h2   { font-size: 14px; margin-bottom: 12px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        @media print { @page { margin: 1cm; } body { margin: 0; } }
      </style>
    </head><body>
      <h2>${escapeHtml(title)}</h2>
      <table>
        <thead><tr>
          <th>Date</th><th>Type</th><th>Account</th><th>Category</th>
          <th>Notes</th><th>Amount</th><th>Currency</th>
        </tr></thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>${footerRows}</tfoot>
      </table>
    </body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Please allow popups for this site to use the print feature.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Small timeout improves reliability across browsers vs relying solely on onload
    setTimeout(() => win.print(), 250);
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={disabled}
        render={
          <button
            className="flex items-center gap-1 px-2.5 h-7 rounded-lg border text-[0.8rem] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: "var(--color-ft-border)",
              color: "var(--color-ft-text-2)",
              backgroundColor: "var(--color-ft-surface)",
            }}
          />
        }
      >
        <Download className="h-3.5 w-3.5" />
        {t("exportMenu")}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4} style={{ zIndex: 50 }}>
          <Menu.Popup
            className="min-w-[148px] rounded-lg border shadow-md py-1 outline-none"
            style={{
              backgroundColor: "var(--color-ft-surface)",
              borderColor: "var(--color-ft-border)",
            }}
          >
            <Menu.Item
              className={itemCls}
              style={{ color: "var(--color-ft-text)" }}
              onClick={handleDownloadCsv}
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              {t("exportCsv")}
            </Menu.Item>
            <Menu.Item
              className={itemCls}
              style={{ color: "var(--color-ft-text)" }}
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5 shrink-0" />
              {t("exportPrint")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
