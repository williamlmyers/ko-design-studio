"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, ShieldCheck } from "lucide-react";

export default function SubcontractorTradePacketPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<any | null>(null);
  const [selectedTradeSlug, setSelectedTradeSlug] = useState<string>("ALL");

  useEffect(() => {
    // Strictly request role=SUBCONTRACTOR so zero pricing is returned by the API
    fetch(`/api/projects/${id}?role=SUBCONTRACTOR`)
      .then((r) => r.json())
      .then((d) => setProject(d.project));
  }, [id]);

  const filteredSelections = (project?.selections || []).filter((s: any) =>
    selectedTradeSlug === "ALL"
      ? true
      : s.tradeCategory?.slug === selectedTradeSlug
  );

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
      `${s.switchGroup || ""} ${s.colorTempKelvin ? s.colorTempKelvin + "K" : ""}`.trim(),
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
    a.download = `${project.name.replace(/\s+/g, "-")}-Subcontractor-Trade-Packet.csv`;
    a.click();
  }

  if (!project) {
    return (
      <div className="p-10 text-sm text-slate-300">
        Loading Subcontractor Trade Work Order Packet (Zero Pricing)...
      </div>
    );
  }

  const uniqueTrades = Array.from(
    new Map(
      (project.selections || []).map((s: any) => [
        s.tradeCategory?.slug,
        s.tradeCategory,
      ])
    ).values()
  ).filter(Boolean) as any[];

  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 lg:p-10">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portal
          </Link>

          <select
            value={selectedTradeSlug}
            onChange={(e) => setSelectedTradeSlug(e.target.value)}
            className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900"
          >
            <option value="ALL">Filter Packet: All Trades</option>
            {uniqueTrades.map((t: any) => (
              <option key={t.slug} value={t.slug}>
                Trade: {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportTradeCsv}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Field CSV (Zero Pricing)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-wrap justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-sky-800">
            <ShieldCheck className="w-4 h-4" />
            KO Builders • Subcontractor Field Work Order & Specification Packet
            (Zero Pricing)
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-0.5">
            {project.name}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Jobsite Address: <strong>{project.siteAddress}</strong> | Target
            Completion:{" "}
            {new Date(project.targetOccupancyDate).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right text-xs space-y-0.5 bg-slate-100 p-3 rounded border border-slate-300">
          <div>
            <strong>Exterior & Garage Fire Wall:</strong>{" "}
            {project.envelopeWallSystem}
          </div>
          <div>
            <strong>Interior Partitions:</strong> {project.interiorFramingType}
          </div>
          <div>
            <strong>Slab & Mechanical:</strong> {project.hvacPrimaryHeat} •{" "}
            {project.hvacVentilationIaq}
          </div>
        </div>
      </div>

      {/* Field Specification Table (100% Zero Pricing) */}
      <table className="w-full text-left border-collapse text-[11px]">
        <thead>
          <tr className="border-b-2 border-slate-900 bg-slate-100 uppercase text-[10px]">
            <th className="py-2 px-2">Room & Wall Assembly</th>
            <th className="py-2 px-2">Phase & Trade</th>
            <th className="py-2 px-2">Component, Manufacturer & SKU</th>
            <th className="py-2 px-2">Color / Finish Spec</th>
            <th className="py-2 px-2">Takeoff Qty (incl. Waste)</th>
            <th className="py-2 px-2">Rough-In / Mount / Electrical</th>
            <th className="py-2 px-2">Field Installation & Framing Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300">
          {filteredSelections.map((s: any) => (
            <tr key={s.id}>
              <td className="py-2.5 px-2">
                <div className="font-bold text-slate-900">{s.room?.name}</div>
                <div className="text-[10px] text-slate-600">
                  {s.room?.lengthFt}&apos;×{s.room?.widthFt}&apos; (
                  {s.room?.floorAreaSqFt} sf) | {s.room?.cf8iInteriorFinish}
                </div>
              </td>
              <td className="py-2.5 px-2">
                <div className="font-mono font-semibold text-[10px]">
                  {s.phaseGateway.split(":")[0]}
                </div>
                <div className="text-slate-700">{s.tradeCategory?.name}</div>
              </td>
              <td className="py-2.5 px-2">
                <div className="font-bold">{s.componentName}</div>
                <div>
                  {s.manufacturer} — <strong>{s.productName}</strong>
                </div>
                <div className="font-mono text-[10px] text-slate-700">
                  SKU: {s.sku}
                </div>
                {s.isOwnerFurnished && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-200 text-slate-950 font-bold text-[10px]">
                    OFCI: Owner-Furnished / Contractor-Installed
                  </span>
                )}
              </td>
              <td className="py-2.5 px-2">
                <div className="font-medium">{s.colorName}</div>
                <div className="text-[10px] text-slate-600">
                  Code: {s.colorCode || "Std"} | {s.finish}
                </div>
              </td>
              <td className="py-2.5 px-2 font-mono font-bold">
                {s.effectiveQty} {s.unitType}
                {s.wasteFactorPct > 0 && (
                  <div className="text-[10px] font-normal text-slate-600">
                    (Base {s.takeoffQty} + {s.wasteFactorPct}% waste)
                  </div>
                )}
              </td>
              <td className="py-2.5 px-2 font-mono text-[10px]">
                <div>Mount: {s.mountingHeight || "Per Plan"}</div>
                {s.switchGroup && <div>Switch: {s.switchGroup}</div>}
                {s.colorTempKelvin && <div>LED: {s.colorTempKelvin}K</div>}
              </td>
              <td className="py-2.5 px-2 text-[10px] leading-snug max-w-xs">
                <div>{s.installNotes}</div>
                {s.dynamicFramingNote && (
                  <div className="mt-1 font-semibold text-slate-800">
                    [{project.interiorFramingType}]: {s.dynamicFramingNote}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
