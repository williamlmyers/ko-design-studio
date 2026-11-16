"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

export default function MasterTakeoffPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}?role=BUILDER_ADMIN&_t=${Date.now()}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => setProject(d.project));
  }, [id]);

  function handleExportCsv() {
    if (!project) return;
    const headers = [
      "Room",
      "Phase Gateway",
      "Trade Category",
      "Component",
      "Manufacturer",
      "Product",
      "SKU",
      "Color",
      "Qty",
      "Unit",
      "Waste %",
      "Effective Qty",
      "Unit Cost",
      "Allowance",
      "Extended Cost",
      "Variance",
      "Status",
      "Approved By",
    ];
    const rows = (project.selections || []).map((s: any) => [
      s.room?.name || "",
      s.phaseGateway || "",
      s.tradeCategory?.name || "",
      s.componentName || "",
      s.manufacturer || "",
      s.productName || "",
      s.sku || "",
      s.colorName || "",
      s.takeoffQty ?? 1,
      s.unitType || "",
      s.wasteFactorPct ?? 0,
      s.effectiveQty ?? s.takeoffQty,
      s.unitCost ?? 0,
      s.allowanceAmount ?? 0,
      s.extendedCost ?? 0,
      s.variance ?? 0,
      s.status || "",
      s.approvedByInitials || "",
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
    a.download = `${project.name.replace(/\s+/g, "-")}-Master-Takeoff.csv`;
    a.click();
  }

  if (!project) {
    return (
      <div className="p-10 text-sm text-slate-300">
        Loading Master Owner/Builder Takeoff & Pricing Sheet...
      </div>
    );
  }

  const totalAllowance = (project.selections || []).reduce(
    (sum: number, s: any) => sum + (Number(s.allowanceAmount) || 0),
    0
  );
  const totalExtended = (project.selections || []).reduce(
    (sum: number, s: any) => sum + (Number(s.extendedCost) || 0),
    0
  );
  const netVariance = totalExtended - totalAllowance;

  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 lg:p-10">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KO Builders Selections Portal
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-wrap justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-amber-700">
            KO Builders • Master Owner/Builder Takeoff & Pricing Sheet
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-0.5">
            {project.name}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Client: <strong>{project.clientName}</strong> | Site:{" "}
            {project.siteAddress} | Target Occupancy:{" "}
            {new Date(project.targetOccupancyDate).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right text-xs space-y-0.5">
          <div>
            <strong>Exterior & Fire Envelope:</strong>{" "}
            {project.envelopeWallSystem}
          </div>
          <div>
            <strong>Interior Partition Framing:</strong>{" "}
            {project.interiorFramingType}
          </div>
          <div>
            <strong>Primary Heat & IAQ:</strong> {project.hvacPrimaryHeat} •{" "}
            {project.hvacVentilationIaq}
          </div>
        </div>
      </div>

      {/* Financial Summary Box */}
      <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-100 border border-slate-300 rounded-lg p-4 text-xs">
        <div>
          <div className="text-slate-500 uppercase">Total Allowance Baseline</div>
          <div className="text-lg font-bold font-mono">
            ${totalAllowance.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-slate-500 uppercase">
            Total Selected Extended Cost
          </div>
          <div className="text-lg font-bold font-mono">
            ${totalExtended.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-slate-500 uppercase">
            Net Allowance Variance / Change Order
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              netVariance > 0 ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {netVariance > 0 ? "+" : ""}${netVariance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Full Line-Item Takeoff Table */}
      <table className="w-full text-left border-collapse text-[11px]">
        <thead>
          <tr className="border-b-2 border-slate-900 bg-slate-100 uppercase text-[10px]">
            <th className="py-2 px-2">Room</th>
            <th className="py-2 px-2">Phase</th>
            <th className="py-2 px-2">Trade</th>
            <th className="py-2 px-2">Component & Product Spec</th>
            <th className="py-2 px-2">Takeoff Qty (+Waste)</th>
            <th className="py-2 px-2 text-right">Unit Cost</th>
            <th className="py-2 px-2 text-right">Allowance</th>
            <th className="py-2 px-2 text-right">Extended</th>
            <th className="py-2 px-2 text-right">Variance</th>
            <th className="py-2 px-2">Client Sign-Off</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300">
          {(project.selections || []).map((s: any) => (
            <tr key={s.id}>
              <td className="py-2 px-2 font-semibold">{s.room?.name}</td>
              <td className="py-2 px-2 font-mono text-[10px]">
                {s.phaseGateway.split(":")[0]}
              </td>
              <td className="py-2 px-2">{s.tradeCategory?.name}</td>
              <td className="py-2 px-2">
                <div className="font-bold">{s.componentName}</div>
                <div className="text-slate-600">
                  {s.manufacturer} — {s.productName} ({s.sku}) | {s.colorName}
                </div>
                {s.isOwnerFurnished && (
                  <span className="inline-block px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-semibold text-[10px]">
                    OFCI (Owner-Furnished)
                  </span>
                )}
              </td>
              <td className="py-2 px-2 font-mono">
                {s.effectiveQty} {s.unitType}{" "}
                {s.wasteFactorPct > 0 && `(${s.wasteFactorPct}% waste)`}
              </td>
              <td className="py-2 px-2 text-right font-mono">
                ${Number(s.unitCost).toLocaleString()}
              </td>
              <td className="py-2 px-2 text-right font-mono">
                ${Number(s.allowanceAmount).toLocaleString()}
              </td>
              <td className="py-2 px-2 text-right font-mono font-semibold">
                ${Number(s.extendedCost).toLocaleString()}
              </td>
              <td
                className={`py-2 px-2 text-right font-mono font-bold ${
                  s.variance > 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {s.variance > 0 ? "+" : ""}${Number(s.variance).toLocaleString()}
              </td>
              <td className="py-2 px-2 font-mono text-[10px]">
                {s.approvedByInitials
                  ? `${s.approvedByInitials} (${new Date(
                      s.approvedAt
                    ).toLocaleDateString()})`
                  : s.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
