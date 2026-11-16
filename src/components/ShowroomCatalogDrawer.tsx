"use client";

import React, { useMemo, useState } from "react";
import {
  Sparkles,
  Search,
  X,
  Flame,
  Link2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { getDefaultProductMedia } from "@/lib/product-media";

interface ShowroomCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  catalogItems: any[];
  initialCategory?: string;
  onApplyCatalogItem: (catalogItem: any) => void;
  applyingId?: string | null;
}

const CATEGORIES = [
  "ALL",
  "Paint",
  "Radiant-Approved Flooring & Tile",
  "Plumbing Fixtures",
  "Lighting",
  "Door/Cabinet Hardware",
  "HVAC/ERV Linear Diffusers",
] as const;

const TIERS = ["ALL", "Good", "Better", "Best"] as const;

export function ShowroomCatalogDrawer({
  isOpen,
  onClose,
  catalogItems,
  initialCategory = "ALL",
  onApplyCatalogItem,
  applyingId = null,
}: ShowroomCatalogDrawerProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<string>(initialCategory);
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  React.useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const filteredItems = useMemo(() => {
    return (catalogItems || []).filter((item) => {
      if (
        selectedCategory !== "ALL" &&
        item.category.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }
      if (
        selectedTier !== "ALL" &&
        item.tier.toLowerCase() !== selectedTier.toLowerCase()
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${item.category} ${item.tier} ${item.manufacturer} ${item.productName} ${item.sku} ${item.colorName} ${item.colorCode} ${item.finish} ${item.pairedRoughInSku || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalogItems, selectedCategory, selectedTier, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/70">
      <div className="w-full max-w-2xl h-screen max-h-screen overflow-hidden bg-slate-900 border-l border-amber-500/40 flex flex-col shadow-2xl">
        {/* Drawer Sticky Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Sparkles className="w-4 h-4" />
              KO Builders Curated Showroom Catalog (Good / Better / Best)
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Pick from KO Builders Catalog ({filteredItems.length} Options)
            </h3>
            <p className="text-xs text-slate-400">
              Clicking <strong className="text-amber-300">Apply to Selection</strong>{" "}
              auto-populates all product specs, radiant-approval status, lead
              time, and unit price—and automatically creates/updates the paired
              Phase 2 rough-in valve or housing when present.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticky Search & Tier / Category Filter Bar */}
        <div className="shrink-0 px-6 py-3 border-b border-slate-800 bg-slate-950/70 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Search Brizo, Kohler, SW 7008, Kährs, Titus, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
              />
            </div>

            {/* Tier Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              {TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    selectedTier === tier
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {tier === "ALL" ? "All Tiers" : tier}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                  selectedCategory === cat
                    ? "bg-amber-500/20 border-amber-400 text-amber-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat === "ALL" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Catalog Items List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3">
          {filteredItems.map((item) => {
            const media = getDefaultProductMedia({
              sku: item.sku,
              manufacturer: item.manufacturer,
              productName: item.productName,
              colorName: item.colorName,
              colorCode: item.colorCode,
              colorHex: item.colorHex,
            });

            const tierBadgeStyle =
              item.tier === "Best"
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : item.tier === "Better"
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-sky-500/20 border-sky-500/40 text-sky-300";

            return (
              <div
                key={item.id}
                className="bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative w-16 h-14 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-900">
                      <img
                        src={media.swatchImageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className="absolute bottom-1 right-1 w-4 h-4 rounded border border-slate-900"
                        style={{ backgroundColor: item.colorHex || "#CBD5E1" }}
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${tierBadgeStyle}`}
                        >
                          {item.tier} Tier
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.category}
                        </span>
                        {item.isRadiantFloorApproved && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">
                            <Flame className="w-2.5 h-2.5" /> Radiant OK
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">
                        {item.manufacturer} — {item.productName}
                      </h4>
                      <div className="text-[11px] font-mono text-slate-400">
                        SKU: <span className="text-slate-200">{item.sku}</span>{" "}
                        • Color: {item.colorName} ({item.colorCode}) •{" "}
                        {item.finish}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {item.unitCost !== undefined && (
                      <div className="text-sm font-bold font-mono text-amber-300">
                        ${Number(item.unitCost).toLocaleString()}
                        <span className="text-[10px] text-slate-400 font-normal">
                          /{item.unitType}
                        </span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {item.leadTimeWeeks} wk lead
                    </div>
                  </div>
                </div>

                {item.pairedRoughInSku && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      <strong>Auto-Pairs Phase 2 Rough-In:</strong>{" "}
                      {item.pairedRoughInName} (
                      <code className="text-white">{item.pairedRoughInSku}</code>
                      )
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {item.notes}
                  </p>
                  <button
                    type="button"
                    disabled={applyingId === item.id}
                    onClick={() => onApplyCatalogItem(item)}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {applyingId === item.id
                      ? "Applying..."
                      : "Apply to Selection"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
