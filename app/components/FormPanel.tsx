"use client";

import { ReactNode } from "react";
import { X, Trash2 } from "lucide-react";

export default function FormPanel({
  title,
  onClose,
  onSubmit,
  children,
  submitLabel = "সেভ করুন",
  wide = false,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
  submitLabel?: string;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative bg-[var(--bg-card)] border border-[var(--border-strong)] sm:border w-full ${
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        } max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-lg`}
      >
        <div className="w-10 h-1 rounded-full bg-[var(--border-strong)] mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h3 className="font-[family-name:var(--font-display)] font-medium text-base">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 -mr-1">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3.5">
          {children}
          <button
            type="submit"
            className="w-full bg-[var(--brown)] text-white font-medium rounded-lg py-3 sm:py-2.5 text-sm hover:opacity-90 transition-opacity mt-2 btn-press"
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
      {children}
      {hint && <span className="text-[var(--text-faint)] font-normal"> — {hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg py-2.5 px-3 text-[15px] sm:text-sm outline-none focus:border-[var(--brown)] transition-colors";

export interface ColumnDef<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onDelete,
  emptyMessage,
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  onDelete?: (id: string) => void;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 sm:p-10 text-center">
        <p className="text-sm text-[var(--text-faint)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden card-elevated">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`text-left px-3 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium text-[var(--text-muted)] whitespace-nowrap ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
              {onDelete && <th className="w-9 sm:w-10" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-card-soft)] transition-colors"
              >
                {columns.map((col, i) => (
                  <td key={i} className={`px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-sm whitespace-nowrap ${col.className ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
                {onDelete && (
                  <td className="px-1.5 sm:px-2">
                    <button
                      onClick={() => onDelete(row.id)}
                      className="text-[var(--text-faint)] hover:text-[var(--red)] transition-colors p-1.5 btn-press"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
