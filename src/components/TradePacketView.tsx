"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Flame,
  LayoutGrid,
  Link2,
  Lock,
  Printer,
  ShieldCheck,
  Table2,
  Wrench,
} from "lucide-react";

interface TradePacketViewProps {
  project: any;
  isTokenizedExternalView?: boolean;
  lockedTrade?: {
    id: string;
    name: string;
    slug: string;
    defaultLeadTimeWeeks?: number;
  } | null;
  initialTradeSlug?: string;
}

export function TradePacketView({
  project,
  isTokenizedExternalView = false,
  lockedTrade = null,
  initialTradeSlug = "ALL",
}: TradePacketViewProps) {
  const [viewMode, setViewMode] = useState<"visual" | "print">("visual");
  const [selectedTradeSlug, setSelectedTradeSlug] = useState<string>(
    lockedTrade?.slug || initialTradeSlug
  );
  const [copiedFieldLink, setCopiedFieldLink] = useState<boolean>(false);

  const uniqueTrades = useMemo(() => {
    const map = new Map<string, any>();
    for (const tc of project?.tradeCategories || []) {
      if (tc?.slug) {
        map.set(tc.slug, tc);
      }
    }
    for (const s of project?.selections || []) {
      if (s.tradeCategory?.slug && !map.has(s.tradeCategory.slug)) {
        map.set(s.tradeCategory.slug, s.tradeCategory);
      }
    }
    return Array.from(map.values());
  }, [project?.tradeCategories, project?.selections]);

  const activeTradeSlug = isTokenizedExternalView
    ? lockedTrade?.slug || initialTradeSlug
    : selectedTradeSlug;

  const activeTradeObj = useMemo(() => {
    if (lockedTrade) return lockedTrade;
    if (activeTradeSlug === "ALL") return null;
    return (
      uniqueTrades.find((t) => t.slug === activeTradeSlug) || {
        name: activeTradeSlug,
        slug: activeTradeSlug,
      }
    );
  }, [lockedTrade, activeTradeSlug, uniqueTrades]);

  const filteredSelections = useMemo(() => {
    const list = project?.selections || [];
    if (isTokenizedExternalView && lockedTrade) {
      return list.filter(
        (s: any) => s.tradeCategory?.slug === lockedTrade.slug
      );
    }
    if (activeTradeSlug === "ALL") return list;
    return list.filter((s: any) => s.tradeCategory?.slug === activeTradeSlug);
  }, [
    project?.selections,
    isTokenizedExternalView,
    lockedTrade,
    activeTradeSlug,
  ]);

  function getTokenizedFieldPath(slugOverride?: string): string {
    const slug = slugOverride || activeTradeSlug;
    if (!project || !slug || slug === "ALL") return "#";
    const hmacToken = project.tradeShareTokens?.[slug] || "";
    return `/trade-packet/${project.id}/${slug}?token=${encodeURIComponent(
      hmacToken
    )}`;
  }

  function handleCopyFieldLink() {
    if (!project || activeTradeSlug === "ALL") return;
    const fullUrl = `${window.location.origin}${getTokenizedFieldPath(
      activeTradeSlug
    )}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedFieldLink(true);
    setTimeout(() => setCopiedFieldLink(false), 2500);
  }

  function handleExportTradeCsv() {
    if (!project) return;
    const headers = [
      "Room Location",
      "Wall Assembly & Finish",
      "Phase Gateway",
      "Trade",
      "Component",
      "Manufacturer",
      "Model / Product",
      "SKU",
      "Color / Code",
      "Finish",
      "Takeoff Qty (incl. Waste)",
      "Unit",
      "Mounting / Rough-In Height",
      "Switch / Kelvin Spec",
      "OFCI Flag",
      "Field Installation Notes",
    ];

    const rows = filteredSelections.map((s: any) => [
      s.room?.name || "",
      s.room?.cf8iInteriorFinish || "",
      s.phaseGateway || "",
      s.tradeCategory?.name || "",
      s.componentName || "",
      s.manufacturer || "",
      s.productName || "",
      s.sku || "",
      `${s.colorName} (${s.colorCode || "Std"})`,
      s.finish || "",
      s.effectiveQty ?? s.takeoffQty,
      s.unitType || "",
      s.mountingHeight || "Per Plan",
      `${s.switchGroup || ""} ${
        s.colorTempKelvin ? s.colorTempKelvin + "K" : ""
      }`.trim(),
      s.isOwnerFurnished ? "YES - OFCI" : "Builder Supplied",
      `${s.installNotes || ""} ${s.dynamicFramingNote || ""}`.trim(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r: any[]) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = activeTradeObj ? activeTradeObj.slug : "all-trades";
    a.download = `${project.name.replace(/\s+/g, "-")}-${suffix}-Trade-Packet.csv`;
    a.click();
  }

  return (
    <div
      className={`min-h-screen transition-colors ${
        viewMode === "visual"
          ? "bg-slate-950 text-slate-100"
          : "bg-white text-slate-900"
      } print:bg-white print:text-slate-900 p-4 sm:p-8`}
    >
      {/* Unified Top Toolbar (Hidden when printing) */}
      <div
        className={`no-print max-w-6xl mx-auto mb-6 pb-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          viewMode === "visual" ? "border-slate-800" : "border-slate-200"
        }`}
      >
        {/* Left Side: Back Button / Trade Selector (Builder/Admin) OR Strict Trade Lock Badge (External Subcontractor) */}
        <div className="flex flex-wrap items-center gap-3">
          {!isTokenizedExternalView ? (
            <>
              <Link
                href="/"
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                  viewMode === "visual"
                    ? "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
                    : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Portal
              </Link>

              <select
                value={selectedTradeSlug}
                onChange={(e) => setSelectedTradeSlug(e.target.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border outline-none ${
                  viewMode === "visual"
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-slate-100 border-slate-300 text-slate-900"
                }`}
              >
                <option value="ALL">
                  Select Trade to Share / Filter: All Trades ({project?.selections?.length || 0})
                </option>
                {uniqueTrades.map((t: any) => (
                  <option key={t.slug} value={t.slug}>
                    Trade: {t.name}
                  </option>
                ))}
              </select>

              {/* One-Click Copy Field Link when a specific Trade is selected */}
              {selectedTradeSlug !== "ALL" && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyFieldLink}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow whitespace-nowrap"
                  >
                    {copiedFieldLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied HMAC Field Link!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Field Link
                      </>
                    )}
                  </button>

                  <Link
                    href={getTokenizedFieldPath(selectedTradeSlug)}
                    target="_blank"
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                      viewMode === "visual"
                        ? "bg-slate-900 border-sky-500/40 text-sky-300 hover:bg-slate-800"
                        : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                    }`}
                    title="Open Trade-Locked HMAC Field View in New Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview Link
                  </Link>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                HMAC-Verified Field Crew Access (Zero Pricing)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                Locked Trade: {activeTradeObj?.name} ({filteredSelections.length}{" "}
                Items)
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Segmented "Visual Field View" / "Print Sheet View" Toggle + Export & Print */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center rounded-xl p-1 border ${
              viewMode === "visual"
                ? "bg-slate-900 border-slate-800"
                : "bg-slate-100 border-slate-300"
            }`}
          >
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                viewMode === "visual"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Visual Field View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("print")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                viewMode === "print"
                  ? "bg-slate-900 text-white shadow"
                  : viewMode === "visual"
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Print Sheet View
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportTradeCsv}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border whitespace-nowrap ${
              viewMode === "visual"
                ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200"
                : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Main Unified Container */}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Project & Structural Assembly Header */}
        <div
          className={`border-b-2 pb-4 flex flex-wrap justify-between gap-4 ${
            viewMode === "visual"
              ? "border-slate-800 print:border-slate-900"
              : "border-slate-900"
          }`}
        >
          <div>
            <div
              className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                viewMode === "visual"
                  ? "text-amber-400 print:text-slate-900"
                  : "text-sky-800 print:text-slate-900"
              }`}
            >
              <Wrench className="w-4 h-4" />
              KO Builders • Subcontractor Field Work Order & Specification
              Packet (Zero Pricing)
            </div>
            <h1
              className={`text-2xl font-black mt-0.5 ${
                viewMode === "visual"
                  ? "text-white print:text-slate-900"
                  : "text-slate-900"
              }`}
            >
              {project.name}
              {activeTradeObj ? ` — ${activeTradeObj.name}` : ""}
            </h1>
            <p
              className={`text-xs mt-1 ${
                viewMode === "visual"
                  ? "text-slate-400 print:text-slate-700"
                  : "text-slate-600"
              }`}
            >
              Jobsite Address: <strong>{project.siteAddress}</strong> | Target
              Completion:{" "}
              {new Date(project.targetOccupancyDate).toLocaleDateString()} |
              Trade Scope:{" "}
              <strong>
                {activeTradeObj ? activeTradeObj.name : "All Trades"}
              </strong>
            </p>
          </div>

          <div
            className={`text-xs rounded-xl p-3.5 space-y-1 border ${
              viewMode === "visual"
                ? "bg-slate-900 border-slate-800 text-slate-200 print:bg-white print:border-slate-400 print:text-slate-900"
                : "bg-slate-100 border-slate-300 text-slate-900"
            }`}
          >
            <div>
              <strong>Exterior & Garage Fire Wall:</strong>{" "}
              {project.envelopeWallSystem}
            </div>
            <div>
              <strong>Interior Partitions:</strong>{" "}
              {project.interiorFramingType}
            </div>
            <div>
              <strong>Slab & Mechanical:</strong> {project.hvacPrimaryHeat} •{" "}
              {project.hvacVentilationIaq}
            </div>
          </div>
        </div>

        {/* Dedicated Hydronic Radiant Slab Zone Schedule & Nuform CF8i Slab-Edge Thermal Insulation Banner */}
        {activeTradeSlug === "hydronic-radiant" && (
          <div
            className={`rounded-2xl p-5 border space-y-4 ${
              viewMode === "visual"
                ? "bg-orange-950/20 border-orange-500/40 text-slate-100 print:bg-white print:border-slate-900 print:text-slate-900"
                : "bg-orange-50 border-slate-900 text-slate-900"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div
                  className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    viewMode === "visual"
                      ? "text-orange-400 print:text-slate-900"
                      : "text-orange-800"
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  Hydronic Radiant Concrete Slab Zone Schedule &amp; Nuform CF8i
                  Slab-Edge Thermal Insulation
                </div>
                <p
                  className={`text-xs mt-1 ${
                    viewMode === "visual"
                      ? "text-slate-300 print:text-slate-700"
                      : "text-slate-700"
                  }`}
                >
                  <strong>Nuform CF8i Slab-Edge Thermal Break Spec:</strong>{" "}
                  Install continuous <strong>R-10</strong> closed-cell vertical
                  thermal break between the 4&quot; heated concrete slab and the
                  Nuform ConForm CF8i 7-7/8&quot; foundation/perimeter wall
                  junction (5.47&quot; concrete core + 2.13&quot; exterior
                  polyurethane insulation), over 2&quot; high-density underslab
                  EPS + 10-mil vapor retarder. Staple 1/2&quot; oxygen-barrier
                  PEX-a loops @ 9&quot; O.C. and hold 100 PSI pressure test
                  throughout concrete pour.
                </p>
              </div>
              <div
                className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold shrink-0 ${
                  viewMode === "visual"
                    ? "bg-slate-950 border-orange-500/40 text-orange-300 print:bg-white print:border-slate-900 print:text-slate-900"
                    : "bg-white border-slate-900 text-slate-900"
                }`}
              >
                Total Heated Radiant Slab:{" "}
                {(project.rooms || [])
                  .filter((r: any) => r.hasRadiantSlab)
                  .reduce(
                    (sum: number, r: any) =>
                      sum + (Number(r.floorAreaSqFt) || 0),
                    0
                  )
                  .toLocaleString()}{" "}
                sq ft
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b uppercase text-[10px] ${
                      viewMode === "visual"
                        ? "border-slate-800 text-slate-400 print:border-slate-900 print:text-slate-900"
                        : "border-slate-900 text-slate-800"
                    }`}
                  >
                    <th className="py-1.5 px-2.5">Room / Zone Name</th>
                    <th className="py-1.5 px-2.5">Floor Level</th>
                    <th className="py-1.5 px-2.5">
                      Hydronic Radiant Slab Zone (isRadiantZone)
                    </th>
                    <th className="py-1.5 px-2.5">Dimensions</th>
                    <th className="py-1.5 px-2.5 text-right">
                      Floor Area (sq ft)
                    </th>
                    <th className="py-1.5 px-2.5">
                      Nuform CF8i Perimeter &amp; Slab-Edge Detail
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    viewMode === "visual"
                      ? "divide-slate-800/80 print:divide-slate-300"
                      : "divide-slate-300"
                  }`}
                >
                  {(project.rooms || []).map((r: any) => (
                    <tr key={r.id}>
                      <td className="py-1.5 px-2.5 font-semibold">{r.name}</td>
                      <td className="py-1.5 px-2.5">{r.floorLevel}</td>
                      <td className="py-1.5 px-2.5">
                        {r.hasRadiantSlab ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[11px] ${
                              viewMode === "visual"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 print:border-slate-900 print:text-slate-900"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-700"
                            }`}
                          >
                            <Flame className="w-3 h-3" /> Active Radiant Zone (
                            <code>isRadiantZone: true</code>)
                          </span>
                        ) : (
                          <span className="text-[11px] opacity-75 font-mono">
                            Unheated Envelope (<code>isRadiantZone: false</code>)
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono">
                        {r.lengthFt}&apos; × {r.widthFt}&apos;
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold">
                        {r.floorAreaSqFt} sq ft
                      </td>
                      <td className="py-1.5 px-2.5 text-[11px]">
                        {r.hasExteriorCF8iWall
                          ? "CF8i 7-7/8\" Exterior Wall — R-10 Vertical Slab-Edge Break"
                          : "Interior Partition Zone"}
                        {r.hasGarageFireWall
                          ? " + 2-Hr CF8i Garage Thermal/Fire Separation"
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dedicated Plumbing Fixtures Nuform CF8i / 2x4 Backing-Plate & Rough-In Valve Depth Banner */}
        {activeTradeSlug === "plumbing-fixtures" && (
          <div
            className={`rounded-2xl p-4 border space-y-2 ${
              viewMode === "visual"
                ? "bg-sky-950/20 border-sky-500/40 text-slate-100 print:bg-white print:border-slate-900 print:text-slate-900"
                : "bg-sky-50 border-slate-900 text-slate-900"
            }`}
          >
            <div
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                viewMode === "visual"
                  ? "text-sky-300 print:text-slate-900"
                  : "text-sky-900"
              }`}
            >
              <Wrench className="w-4 h-4" />
              Plumbing Fixtures • Nuform CF8i / 2x4 Backing-Plate &amp;
              Rough-In Valve Depth Specification
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div
                className={`p-3 rounded-xl border ${
                  viewMode === "visual"
                    ? "bg-slate-950/90 border-slate-800 print:bg-white print:border-slate-400"
                    : "bg-white border-slate-300"
                }`}
              >
                <strong>1. 2x4 Partition Backing &amp; Stud Protection:</strong>{" "}
                Active system is <strong>{project.interiorFramingType}</strong>.{" "}
                {project.interiorFramingType?.includes("Metal")
                  ? "Install snap-in plastic/neoprene grommets in all 2x4 metal stud web knockouts before pulling PEX-a; bolt wall-hung vanities, carriers, and shower rough-in bridges to 16-ga continuous steel strap + 3/4\" fire-treated plywood backing."
                  : "Bore centered 1-1/4\" holes with 16-ga steel nail plates on 2x4 wood studs; anchor wall-hung vanities, carriers, and shower rough-in valves to solid 2x8 wood blocking."}
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  viewMode === "visual"
                    ? "bg-slate-950/90 border-slate-800 print:bg-white print:border-slate-400"
                    : "bg-white border-slate-300"
                }`}
              >
                <strong>2. Rough-In Valve Depth &amp; Paired Trim:</strong> Set
                thermostatic shower rough-in valve bodies (e.g. Brizo{" "}
                <code>R60000-UNBXHF</code>) to exact{" "}
                <strong>2-3/4&quot; plaster guard depth</strong> accounting for
                1/2&quot; Kerdi-Board + thinset + porcelain tile thickness.
                Verify paired Phase 4 trim SKU before closing wall.
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  viewMode === "visual"
                    ? "bg-slate-950/90 border-slate-800 print:bg-white print:border-slate-400"
                    : "bg-white border-slate-300"
                }`}
              >
                <strong>3. Nuform CF8i 7-7/8&quot; Shell Penetrations:</strong>{" "}
                Pre-set Schedule 40 PVC sleeves through the Nuform CF8i
                7-7/8&quot; exterior concrete wall (5.47&quot; concrete core +
                2.13&quot; exterior polyurethane insulation) for frost-free hose
                bibs and vent/drain lines prior to concrete pour; fire-stop all
                garage separation penetrations per ASTM E119.
              </div>
            </div>
          </div>
        )}

        {/* 1. VISUAL FIELD VIEW (Shown on screen when viewMode === 'visual'; automatically hidden during @media print) */}
        {viewMode === "visual" && (
          <div className="print:hidden space-y-3">
            {filteredSelections.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-400">
                No specification items found for this trade filter.
              </div>
            ) : (
              filteredSelections.map((s: any) => (
                <div
                  key={s.id}
                  className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3"
                >
                  {/* Card Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-amber-300 text-xs font-bold">
                        {s.room?.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-semibold">
                        {s.tradeCategory?.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-mono">
                        {s.phaseGateway}
                      </span>
                      {s.room?.hasExteriorCF8iWall && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px]">
                          Nuform CF8i Wall
                        </span>
                      )}
                      {s.room?.hasRadiantSlab && (
                        <span className="px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[11px] flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Radiant Slab Zone
                        </span>
                      )}
                      {s.isOwnerFurnished && (
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold">
                          OFCI (Owner-Furnished / Contractor-Installed)
                        </span>
                      )}
                    </div>

                    <div className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-300">
                      Takeoff Qty: {s.effectiveQty} {s.unitType}{" "}
                      {s.wasteFactorPct > 0 &&
                        `(+${s.wasteFactorPct}% waste incl.)`}
                    </div>
                  </div>

                  {/* Card Main Content */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-6 flex items-start gap-3.5">
                      <div className="relative w-24 h-20 rounded-xl border border-slate-700 bg-slate-950 shrink-0 overflow-hidden shadow">
                        {s.swatchImageUrl && (
                          <img
                            src={s.swatchImageUrl}
                            alt={s.productName}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <span
                          className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded border border-slate-900 text-[9px] font-mono font-bold text-slate-950 shadow"
                          style={{
                            backgroundColor: s.colorHex || "#CBD5E1",
                          }}
                        >
                          {s.colorCode?.slice(0, 6) || "SWATCH"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-white">
                          {s.componentName}
                        </h3>
                        <div className="text-xs text-slate-200 font-medium">
                          {s.manufacturer} •{" "}
                          <span className="text-amber-300">
                            {s.productName}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          SKU: <strong className="text-white">{s.sku}</strong>{" "}
                          | Color: {s.colorName} ({s.colorCode || "Std"}) |
                          Finish: {s.finish}
                        </div>
                        {s.productUrl && (
                          <a
                            href={s.productUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-[11px] font-medium text-sky-300 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Manufacturer Spec Sheet ({s.vendorName || s.manufacturer})
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-6 bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-xs space-y-1.5">
                      <div className="text-[11px] text-slate-300">
                        <strong className="text-slate-400">
                          Room Dimensions & CF8i Surface:
                        </strong>{" "}
                        {s.room?.lengthFt}&apos; × {s.room?.widthFt}&apos; (
                        {s.room?.floorAreaSqFt} sq ft) •{" "}
                        <span className="text-amber-300">
                          {s.room?.cf8iInteriorFinish}
                        </span>
                      </div>

                      {(s.mountingHeight ||
                        s.switchGroup ||
                        s.colorTempKelvin) && (
                        <div className="text-[11px] text-sky-300 font-mono">
                          {s.mountingHeight &&
                            `Rough-In / Mount: ${s.mountingHeight} `}
                          {s.switchGroup && `| Switch: ${s.switchGroup} `}
                          {s.colorTempKelvin && `| ${s.colorTempKelvin}K LED`}
                        </div>
                      )}

                      {s.parentItem && (
                        <div className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded px-2.5 py-1 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            <strong>Paired Phase 2 Rough-In:</strong>{" "}
                            {s.parentItem.componentName} ({s.parentItem.sku})
                          </span>
                        </div>
                      )}

                      {s.installNotes && (
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          <strong className="text-slate-400">
                            Field Note:
                          </strong>{" "}
                          {s.installNotes}
                        </p>
                      )}

                      {s.dynamicFramingNote && (
                        <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                          {s.dynamicFramingNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. PRINT SHEET VIEW (Shown on screen when viewMode === 'print' AND always rendered during @media print) */}
        <div
          className={`${
            viewMode === "print" ? "block" : "hidden print:block"
          } bg-white text-slate-900`}
        >
          <table className="w-full text-left border-collapse text-[11px] border border-slate-900">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 uppercase text-[10px] text-slate-900">
                <th className="py-2 px-2 border-r border-slate-400">
                  Room & Wall Assembly
                </th>
                <th className="py-2 px-2 border-r border-slate-400">
                  Phase & Trade
                </th>
                <th className="py-2 px-2 border-r border-slate-400">
                  Component, Manufacturer & SKU
                </th>
                <th className="py-2 px-2 border-r border-slate-400">
                  Color / Finish Spec
                </th>
                <th className="py-2 px-2 border-r border-slate-400">
                  Takeoff Qty (incl. Waste)
                </th>
                <th className="py-2 px-2 border-r border-slate-400">
                  Rough-In / Mount / Electrical
                </th>
                <th className="py-2 px-2">
                  Field Installation & Framing Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400">
              {filteredSelections.map((s: any) => (
                <tr key={s.id} className="align-top">
                  <td className="py-2 px-2 border-r border-slate-300">
                    <div className="font-bold text-slate-950">
                      {s.room?.name}
                    </div>
                    <div className="text-[10px] text-slate-700">
                      {s.room?.lengthFt}&apos;×{s.room?.widthFt}&apos; (
                      {s.room?.floorAreaSqFt} sf) | {s.room?.cf8iInteriorFinish}
                    </div>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300">
                    <div className="font-mono font-bold text-[10px]">
                      {s.phaseGateway.split(":")[0]}
                    </div>
                    <div className="text-slate-800">
                      {s.tradeCategory?.name}
                    </div>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300">
                    <div className="font-bold text-slate-950">
                      {s.componentName}
                    </div>
                    <div>
                      {s.manufacturer} — <strong>{s.productName}</strong>
                    </div>
                    <div className="font-mono text-[10px] font-bold text-slate-900">
                      SKU: {s.sku}
                    </div>
                    {s.isOwnerFurnished && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 border border-slate-900 font-bold text-[10px]">
                        OFCI: Owner-Furnished / Contractor-Installed
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300">
                    <div className="font-semibold">{s.colorName}</div>
                    <div className="text-[10px] text-slate-700">
                      Code: {s.colorCode || "Std"} | {s.finish}
                    </div>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 font-mono font-bold">
                    {s.effectiveQty} {s.unitType}
                    {s.wasteFactorPct > 0 && (
                      <div className="text-[10px] font-normal text-slate-700">
                        (Base {s.takeoffQty} + {s.wasteFactorPct}% waste)
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 font-mono text-[10px]">
                    <div>Mount: {s.mountingHeight || "Per Plan"}</div>
                    {s.switchGroup && <div>Switch: {s.switchGroup}</div>}
                    {s.colorTempKelvin && <div>LED: {s.colorTempKelvin}K</div>}
                    {s.parentItem && (
                      <div className="font-bold mt-0.5">
                        Paired Rough-In: {s.parentItem.sku}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-[10px] leading-snug max-w-xs">
                    <div>{s.installNotes}</div>
                    {s.dynamicFramingNote && (
                      <div className="mt-1 font-semibold text-slate-900">
                        [{project.interiorFramingType}]: {s.dynamicFramingNote}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
