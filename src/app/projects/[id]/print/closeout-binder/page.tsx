"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, ShieldCheck } from "lucide-react";

export default function HomeownerCloseoutBinderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<any | null>(null);

  useEffect(() => {
    // Request SUBCONTRACTOR role sanitizer so internal builder unit pricing & margins are omitted
    fetch(`/api/projects/${id}?role=SUBCONTRACTOR`)
      .then((r) => r.json())
      .then((d) => setProject(d.project));
  }, [id]);

  function handleExportBinderCsv() {
    if (!project) return;
    const headers = [
      "Room",
      "Category",
      "Installed Component",
      "Manufacturer",
      "Product Name",
      "Model / SKU",
      "Color / Paint Formula",
      "Finish / Sheen",
      "Care & Maintenance Notes",
    ];
    const rows = (project.selections || []).map((s: any) => [
      s.room?.name || "",
      s.tradeCategory?.name || "",
      s.componentName || "",
      s.manufacturer || "",
      s.productName || "",
      s.sku || "",
      `${s.colorName} (${s.colorCode || "Std"})`,
      s.finish || "",
      s.installNotes || "",
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
    a.download = `${project.name.replace(/\s+/g, "-")}-Homeowner-Closeout-Binder.csv`;
    a.click();
  }

  if (!project) {
    return (
      <div className="p-10 text-sm text-slate-300">
        Loading Digital Homeowner Closeout & Maintenance Binder...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 lg:p-10">
      {/* Top Action Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportBinderCsv}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Closeout CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Binder Cover Header */}
      <div className="border-b-2 border-slate-900 pb-5 mb-6">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          KO Builders • Digital Homeowner Closeout, Warranty & Maintenance
          Binder
        </div>
        <h1 className="text-2xl font-black text-slate-900 mt-1">
          {project.name}
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Prepared for <strong>{project.clientName}</strong> •{" "}
          {project.siteAddress}
        </p>

        {/* Core High-Efficiency Systems Care Guide */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-100 border border-slate-300 rounded-lg p-3.5 text-xs">
          <div>
            <strong className="block text-slate-900">
              1. Nuform ConForm CF8i Envelope & Garage Walls
            </strong>
            <span className="text-slate-600">
              Exposed white Nuform polymer walls in the Garage and Mechanical
              Room are washable with mild soap and water (never require painting
              or drywall patching).
            </span>
          </div>
          <div>
            <strong className="block text-slate-900">
              2. Hydronic Radiant Concrete Slab Care
            </strong>
            <span className="text-slate-600">
              Maintain slab thermostat setpoint changes within 2–3°F per day at
              seasonal startup. Never exceed 81°F floor surface temperature on
              engineered hardwood zones.
            </span>
          </div>
          <div>
            <strong className="block text-slate-900">
              3. Airtight ERV & Whole-House Dehumidifier IAQ
            </strong>
            <span className="text-slate-600">
              Inspect & vacuum Zehnder ERV MERV-13/HEPA intake filters every 90
              days; replace media filters every 6–12 months.
            </span>
          </div>
        </div>
      </div>

      {/* Room-by-Room Installed Finish & Fixture Schedule */}
      <div className="space-y-6">
        {(project.rooms || []).map((room: any) => {
          const roomSelections = (project.selections || []).filter(
            (s: any) => s.roomId === room.id
          );
          if (roomSelections.length === 0) return null;

          return (
            <div
              key={room.id}
              className="border border-slate-300 rounded-lg overflow-hidden"
            >
              <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs">
                <span className="font-bold">{room.name}</span>
                <span className="font-mono text-[11px] text-slate-300">
                  {room.lengthFt}&apos; × {room.widthFt}&apos; (
                  {room.floorAreaSqFt} sq ft) | {room.cf8iInteriorFinish}
                </span>
              </div>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 uppercase text-[10px]">
                    <th className="py-1.5 px-3">Trade / System</th>
                    <th className="py-1.5 px-3">Installed Component</th>
                    <th className="py-1.5 px-3">Manufacturer & Model</th>
                    <th className="py-1.5 px-3">SKU</th>
                    <th className="py-1.5 px-3">Color Formula & Sheen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {roomSelections.map((s: any) => (
                    <tr key={s.id}>
                      <td className="py-2 px-3 text-slate-600">
                        {s.tradeCategory?.name}
                      </td>
                      <td className="py-2 px-3 font-semibold">
                        {s.componentName}
                      </td>
                      <td className="py-2 px-3">
                        {s.manufacturer} — {s.productName}
                      </td>
                      <td className="py-2 px-3 font-mono">{s.sku}</td>
                      <td className="py-2 px-3">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 border border-slate-400 align-middle"
                          style={{ backgroundColor: s.colorHex || "#ccc" }}
                        />
                        {s.colorName} ({s.colorCode || "Std"}) • {s.finish}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
