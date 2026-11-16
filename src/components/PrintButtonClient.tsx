"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintButtonClient() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
    >
      <Printer className="w-3.5 h-3.5" />
      Print / Save as PDF
    </button>
  );
}
