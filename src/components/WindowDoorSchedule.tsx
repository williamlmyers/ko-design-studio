"use client";

import React, { useState } from "react";
import { DoorOpen, Plus, ShieldCheck, Trash2, Ruler } from "lucide-react";

interface WindowDoorScheduleProps {
  projectId: string;
  rooms: any[];
  openings: any[];
  canEdit: boolean;
  onScheduleUpdated: () => void;
}

export function WindowDoorSchedule({
  projectId,
  rooms,
  openings,
  canEdit,
  onScheduleUpdated,
}: WindowDoorScheduleProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [roomId, setRoomId] = useState(rooms[0]?.id || "");
  const [openingTag, setOpeningTag] = useState("W-05");
  const [openingType, setOpeningType] = useState("Window");
  const [widthInches, setWidthInches] = useState(60);
  const [heightInches, setHeightInches] = useState(60);
  const [sillHeightInches, setSillHeightInches] = useState(32);
  const [manufacturer, setManufacturer] = useState(
    "Pella Reserve Contemporary"
  );
  const [modelSku, setModelSku] = useState("PR-3P-6060");
  const [exteriorColor, setExteriorColor] = useState(
    "Black Anodized Aluminum Clad"
  );
  const [interiorColor, setInteriorColor] = useState("Prefinished Warm White");
  const [glassSpec, setGlassSpec] = useState(
    "Triple-Pane Low-E Argon (U-0.20)"
  );
  const [notes, setNotes] = useState(
    "Anchor PT buck into Nuform CF8i 7-7/8\" insulated form core."
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleAddOpening(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/openings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          roomId: roomId || rooms[0]?.id,
          openingTag,
          openingType,
          widthInches,
          heightInches,
          sillHeightInches,
          manufacturer,
          modelSku,
          exteriorColor,
          interiorColor,
          glassSpec,
          notes,
        }),
      });
      setShowAdd(false);
      onScheduleUpdated();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/openings?id=${id}`, { method: "DELETE" });
    onScheduleUpdated();
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-amber-400" />
            Window, Exterior Door & Garage Fire-Separation Schedule (Nuform CF8i
            Jamb-Aware)
          </h3>
          <p className="text-xs text-slate-400">
            Automatically computes{" "}
            <code className="text-amber-300">8.375&quot;</code> jamb extensions
            for furred CF8i walls (<code className="text-amber-300">7-7/8&quot;</code>{" "}
            CF8i + <code className="text-amber-300">1/2&quot;</code> drywall),{" "}
            <code className="text-emerald-300">7.875&quot;</code> for Exposed
            Nuform Polymer walls, and enforces 90-min self-closing fire doors at
            the garage separation wall.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Add Window / Door Opening
          </button>
        )}
      </div>

      {showAdd && (
        <form
          onSubmit={handleAddOpening}
          className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs"
        >
          <div>
            <label className="text-slate-400 block mb-1">Opening Tag</label>
            <input
              value={openingTag}
              onChange={(e) => setOpeningTag(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Room Location</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Opening Type</label>
            <select
              value={openingType}
              onChange={(e) => setOpeningType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
            >
              <option value="Window">Window</option>
              <option value="Exterior Door">Exterior Door</option>
              <option value="Garage Fire-Separation Door">
                Garage Fire-Separation Door (90-Min)
              </option>
              <option value="Interior Door">Interior Door (2x4 Wall)</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="text-slate-400 block mb-1">W (in)</label>
              <input
                type="number"
                value={widthInches}
                onChange={(e) => setWidthInches(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">H (in)</label>
              <input
                type="number"
                value={heightInches}
                onChange={(e) => setHeightInches(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Sill (in)</label>
              <input
                type="number"
                value={sillHeightInches}
                onChange={(e) => setSillHeightInches(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Manufacturer</label>
            <input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Model / SKU</label>
            <input
              value={modelSku}
              onChange={(e) => setModelSku(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">
              Ext / Int Finish Color
            </label>
            <input
              value={`${exteriorColor} / ${interiorColor}`}
              onChange={(e) => {
                const parts = e.target.value.split("/");
                setExteriorColor((parts[0] || "").trim());
                setInteriorColor((parts[1] || parts[0] || "").trim());
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Glass / Core Spec</label>
            <input
              value={glassSpec}
              onChange={(e) => setGlassSpec(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-slate-400 block mb-1">
              CF8i Buck & Flashing Installation Notes
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
            >
              {submitting ? "Adding..." : "Save to Schedule"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">Tag</th>
              <th className="py-2.5 px-3">Room & Wall Type</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Rough Opening</th>
              <th className="py-2.5 px-3">CF8i Jamb Depth</th>
              <th className="py-2.5 px-3">Manufacturer / Model</th>
              <th className="py-2.5 px-3">Ext / Int Color</th>
              <th className="py-2.5 px-3">Fire Rating & Glass Spec</th>
              {canEdit && <th className="py-2.5 px-2 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {openings.map((op) => {
              const isFireDoor =
                op.openingType === "Garage Fire-Separation Door" ||
                op.fireRating?.includes("90-Min");
              return (
                <tr key={op.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono font-bold text-amber-300">
                    {op.openingTag}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-white">
                      {op.room?.name || "Assigned Room"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {op.room?.cf8iInteriorFinish}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        isFireDoor
                          ? "bg-red-500/20 text-red-300 border border-red-500/40"
                          : "bg-slate-800 text-slate-200"
                      }`}
                    >
                      {op.openingType}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-200">
                    {op.widthInches}&quot; × {op.heightInches}&quot;
                    <div className="text-[10px] text-slate-400">
                      Sill: {op.sillHeightInches}&quot; AFF
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono text-amber-300 font-semibold">
                      <Ruler className="w-3 h-3" />
                      {op.jambDepthInches}&quot;
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-white">
                      {op.manufacturer}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {op.modelSku}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <div>Ext: {op.exteriorColor}</div>
                    <div className="text-slate-400">Int: {op.interiorColor}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 font-medium text-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      {op.fireRating}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {op.glassSpec}
                    </div>
                    {op.notes && (
                      <div className="text-[11px] text-amber-200/80 mt-1 italic">
                        {op.notes}
                      </div>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-3 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(op.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                        title="Remove Opening"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
