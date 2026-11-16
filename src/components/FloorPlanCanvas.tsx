"use client";

import React, { useState } from "react";
import {
  Flame,
  Layers,
  Maximize2,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { CF8I_FINISH_OPTIONS } from "@/lib/construction-rules";

interface FloorPlanCanvasProps {
  rooms: any[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  canEdit: boolean;
  onRoomUpdated: () => void;
  interiorFramingType: string;
}

export function FloorPlanCanvas({
  rooms,
  selectedRoomId,
  onSelectRoom,
  canEdit,
  onRoomUpdated,
  interiorFramingType,
}: FloorPlanCanvasProps) {
  const activeRoom =
    rooms.find((r) => r.id === selectedRoomId) || rooms[0] || null;
  const [editLength, setEditLength] = useState<number>(
    activeRoom?.lengthFt || 20
  );
  const [editWidth, setEditWidth] = useState<number>(activeRoom?.widthFt || 16);
  const [editCeiling, setEditCeiling] = useState<number>(
    activeRoom?.ceilingHeightFt || 10
  );
  const [editCf8iFinish, setEditCf8iFinish] = useState<string>(
    activeRoom?.cf8iInteriorFinish || "Furred Drywall + Paint"
  );
  const [editRadiant, setEditRadiant] = useState<boolean>(
    activeRoom?.hasRadiantSlab ?? true
  );
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (activeRoom) {
      setEditLength(activeRoom.lengthFt);
      setEditWidth(activeRoom.widthFt);
      setEditCeiling(activeRoom.ceilingHeightFt);
      setEditCf8iFinish(activeRoom.cf8iInteriorFinish);
      setEditRadiant(activeRoom.hasRadiantSlab);
    }
  }, [activeRoom?.id]);

  async function handleSaveRoomDimensions(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRoom) return;
    setSaving(true);
    try {
      await fetch(`/api/rooms/${activeRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lengthFt: Number(editLength),
          widthFt: Number(editWidth),
          ceilingHeightFt: Number(editCeiling),
          cf8iInteriorFinish: editCf8iFinish,
          hasRadiantSlab: editRadiant,
        }),
      });
      onRoomUpdated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 8 Cols: Interactive Architectural Blueprint & Room Grid Map */}
      <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Interactive 2D Architectural Plan & Wall Assembly Overlay
            </h3>
            <p className="text-xs text-slate-400">
              Click any zone to inspect room dimensions, Nuform{" "}
              <code className="text-amber-300">CF8i</code> perimeter & garage
              fire-wall boundaries, and live takeoff quantities.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              Nuform CF8i Perimeter (7-7/8&quot;)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              2-Hr CF8i Garage Fire Wall
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
              {interiorFramingType}
            </span>
          </div>
        </div>

        {/* Interactive Blueprint Canvas */}
        <div className="relative w-full h-[440px] rounded-xl bg-slate-950 border-2 border-amber-500/50 overflow-hidden shadow-inner p-4">
          {/* Blueprint background grid */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Interactive Room Blocks positioned via gridX / gridZ or pinX / pinY */}
          <div className="relative z-10 grid grid-cols-3 gap-3 h-full">
            {rooms.map((room) => {
              const isSelected = room.id === activeRoom?.id;
              const isExposedPolymer = room.cf8iInteriorFinish?.includes(
                "Exposed Nuform Polymer"
              );

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onSelectRoom(room.id)}
                  className={`text-left p-3.5 rounded-lg border-2 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10 scale-[1.01]"
                      : room.hasGarageFireWall
                      ? "bg-slate-900/85 border-red-500/50 hover:border-amber-400/70"
                      : "bg-slate-900/80 border-slate-700/80 hover:border-sky-400/70"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-white leading-tight line-clamp-2">
                        {room.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                        {room.lengthFt}&apos;×{room.widthFt}&apos;
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      {room.floorAreaSqFt} sq ft | {room.ceilingHeightFt}&apos;
                      Clg | Origin ({room.gridX}&apos;, {room.gridZ}&apos;)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 mt-2">
                    {room.hasExteriorCF8iWall && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        CF8i Ext
                      </span>
                    )}
                    {room.hasGarageFireWall && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-0.5">
                        <ShieldAlert className="w-2.5 h-2.5" /> 2-Hr Fire
                      </span>
                    )}
                    {room.hasRadiantSlab && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" /> Radiant Slab
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isExposedPolymer
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      }`}
                    >
                      {isExposedPolymer
                        ? "Exposed Polymer (No Drywall)"
                        : `Drywall: ${room.netWallAreaSqFt} sf`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right 4 Cols: Selected Room Dimension & Wall Assembly Takeoff Editor */}
      <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        {activeRoom ? (
          <form onSubmit={handleSaveRoomDimensions} className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
                  Selected Room Takeoff
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {activeRoom.floorLevel}
                </span>
              </div>
              <h4 className="text-lg font-bold text-white mt-0.5">
                {activeRoom.name}
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5">
                <label className="block text-[10px] uppercase text-slate-400">
                  Length (ft)
                </label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!canEdit}
                  value={editLength}
                  onChange={(e) => setEditLength(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-white"
                />
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5">
                <label className="block text-[10px] uppercase text-slate-400">
                  Width (ft)
                </label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!canEdit}
                  value={editWidth}
                  onChange={(e) => setEditWidth(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-white"
                />
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5">
                <label className="block text-[10px] uppercase text-slate-400">
                  Ceiling (ft)
                </label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!canEdit}
                  value={editCeiling}
                  onChange={(e) => setEditCeiling(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-white"
                />
              </div>
            </div>

            {/* Computed Takeoff Quantities */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 border border-slate-800/90 rounded-lg p-3 text-center">
              <div>
                <div className="text-[10px] uppercase text-slate-400">
                  Floor Area
                </div>
                <div className="text-sm font-bold font-mono text-white">
                  {activeRoom.floorAreaSqFt} sq ft
                </div>
              </div>
              <div className="border-x border-slate-800">
                <div className="text-[10px] uppercase text-slate-400">
                  Baseboard Perim
                </div>
                <div className="text-sm font-bold font-mono text-amber-300">
                  {activeRoom.perimeterLinFt} lin ft
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400">
                  Drywall/Paint
                </div>
                <div className="text-sm font-bold font-mono text-sky-300">
                  {activeRoom.netWallAreaSqFt} sq ft
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nuform CF8i Interior Wall Surface Rule
              </label>
              <select
                disabled={!canEdit}
                value={editCf8iFinish}
                onChange={(e) => setEditCf8iFinish(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                {CF8I_FINISH_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                When set to{" "}
                <strong className="text-emerald-300">
                  Exposed Nuform Polymer White/Tan
                </strong>
                , perimeter CF8i walls are automatically excluded from drywall
                and paint takeoffs.
              </p>
            </div>

            <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2.5">
              <div>
                <div className="text-xs font-medium text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Hydronic Radiant Concrete Slab Zone
                </div>
                <div className="text-[11px] text-slate-400">
                  Enforces R-value & radiant-heat compatibility on flooring
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={editRadiant}
                onChange={(e) => setEditRadiant(e.target.checked)}
                className="h-4 w-4 accent-amber-500 rounded"
              />
            </div>

            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5" />
                {saving
                  ? "Recalculating Room Takeoffs..."
                  : "Save Dimensions & Recalculate Takeoffs"}
              </button>
            )}
          </form>
        ) : null}
      </div>
    </div>
  );
}
