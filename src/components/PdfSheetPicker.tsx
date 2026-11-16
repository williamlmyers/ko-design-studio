"use client";

import React from "react";
import { CheckCircle2, FileText, Sparkles } from "lucide-react";
import { PdfPagePreview } from "@/lib/pdf-floorplan-extractor";

interface PdfSheetPickerProps {
  pages: PdfPagePreview[];
  selectedPage: number;
  onSelectPage: (pageNumber: number) => void;
  fileName: string;
}

export function PdfSheetPicker({
  pages,
  selectedPage,
  onSelectPage,
  fileName,
}: PdfSheetPickerProps) {
  if (!pages || pages.length === 0) return null;

  return (
    <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Multi-Page Architectural PDF Sheet Selector ({pages.length} Sheets
            in {fileName})
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            We auto-selected{" "}
            <strong className="text-white">Page {selectedPage}</strong> for your
            2D Pin Mapper background (rendered at crisp 2x PNG resolution).
            Click any other sheet below if you prefer Upper Level, Foundation,
            or another plan sheet.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
          Selected Floor Plan Sheet: Page {selectedPage} of {pages.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
        {pages.map((p) => {
          const isSelected = p.pageNumber === selectedPage;
          return (
            <button
              key={p.pageNumber}
              type="button"
              onClick={() => onSelectPage(p.pageNumber)}
              className={`text-left rounded-xl p-2 border-2 transition flex flex-col justify-between ${
                isSelected
                  ? "bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10"
                  : "bg-slate-900/90 border-slate-800 hover:border-slate-600"
              }`}
            >
              <div className="relative w-full h-28 rounded-lg overflow-hidden bg-white border border-slate-700 mb-2">
                <img
                  src={p.thumbnailDataUrl}
                  alt={`PDF Page ${p.pageNumber}`}
                  className="w-full h-full object-contain"
                />
                <span
                  className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isSelected
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-900/90 text-white"
                  }`}
                >
                  Sheet #{p.pageNumber}
                </span>
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-emerald-500 text-slate-950 shadow">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                {p.matchLabel ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300">
                    <Sparkles className="w-2.5 h-2.5 shrink-0" />
                    {p.matchLabel}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">
                    Architectural Sheet {p.pageNumber}
                  </span>
                )}
                {p.extractedTextSnippet && (
                  <p className="text-[9px] text-slate-500 truncate">
                    {p.extractedTextSnippet}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
