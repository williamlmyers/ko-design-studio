"use client";

import React, { useRef, useState } from "react";
import {
  Flame,
  Layers,
  ShieldAlert,
  Sliders,
  MapPin,
  Move,
  CheckCircle2,
  Lock,
  FileUp,
  Trash2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import { CF8I_FINISH_OPTIONS } from "@/lib/construction-rules";

interface FloorPlanCanvasProps {
  project?: any;
  rooms: any[];
  selections?: any[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  canEdit: boolean;
  isBuilderAdmin?: boolean;
  onRoomUpdated: () => void;
  onOpenUpdatePlansModal?: () => void;
  interiorFramingType: string;
  compactMode?: boolean;
}

export function FloorPlanCanvas({
  project,
  rooms,
  selections = [],
  selectedRoomId,
  onSelectRoom,
  canEdit,
  isBuilderAdmin = false,
  onRoomUpdated,
  onOpenUpdatePlansModal,
  interiorFramingType,
  compactMode = false,
}: FloorPlanCanvasProps) {
  const activeRoom =
    rooms.find((r) => r.id === selectedRoomId) || rooms[0] || null;
  const [editRoomName, setEditRoomName] = useState<string>(
    activeRoom?.name || ""
  );
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);

  // Interactive Pin Drag, Solo Active Pin, & Zoom/Pan Viewport State
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerPlanRef = useRef<HTMLDivElement | null>(null);
  const imageBoundsRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLElement | SVGSVGElement | null>(null);
  const [draggingRoomId, setDraggingRoomId] = useState<string | null>(null);
  const [pinOverrides, setPinOverrides] = useState<
    Record<string, { pinX: number; pinY: number }>
  >({});
  const [clickToPlaceMode, setClickToPlaceMode] = useState<boolean>(false);
  const [addRoomPinMode, setAddRoomPinMode] = useState<boolean>(false);
  const [newRoomPinCoords, setNewRoomPinCoords] = useState<{
    pinX: number;
    pinY: number;
  } | null>(null);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [newRoomFloorLevel, setNewRoomFloorLevel] =
    useState<string>("Main Level");
  const [newRoomLength, setNewRoomLength] = useState<number>(14);
  const [newRoomWidth, setNewRoomWidth] = useState<number>(12);
  const [newRoomCeiling, setNewRoomCeiling] = useState<number>(10);
  const [newRoomIsRadiant, setNewRoomIsRadiant] = useState<boolean>(true);
  const [newRoomWallSystem, setNewRoomWallSystem] = useState<string>(
    "Nuform CF8i Perimeter + 2x4 Interior"
  );
  const [creatingNewRoom, setCreatingNewRoom] = useState<boolean>(false);
  const [soloActivePin, setSoloActivePin] = useState<boolean>(false);

  // Auto-Read Room Dimensions from Pins Modal State
  const [showPinDimModal, setShowPinDimModal] = useState<boolean>(false);
  const [readingPinDims, setReadingPinDims] = useState<boolean>(false);
  const [applyingPinDims, setApplyingPinDims] = useState<boolean>(false);
  const [pinDimNotice, setPinDimNotice] = useState<string>("");
  const [pinDimRows, setPinDimRows] = useState<any[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{
    clientX: number;
    clientY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const didPanMoveRef = useRef<boolean>(false);
  const [pinSavingStatus, setPinSavingStatus] = useState<string>("");

  React.useEffect(() => {
    if (activeRoom) {
      setEditRoomName(activeRoom.name);
      setEditLength(activeRoom.lengthFt);
      setEditWidth(activeRoom.widthFt);
      setEditCeiling(activeRoom.ceilingHeightFt);
      setEditCf8iFinish(activeRoom.cf8iInteriorFinish);
      setEditRadiant(activeRoom.hasRadiantSlab);
      setConfirmDeleteOpen(false);
    }
  }, [activeRoom?.id]);

  async function persistPinPosition(
    roomId: string,
    pinX: number,
    pinY: number
  ) {
    setPinSavingStatus("Saving pin coordinates...");
    try {
      await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinX: Number(pinX.toFixed(1)),
          pinY: Number(pinY.toFixed(1)),
        }),
      });
      setPinSavingStatus(`Saved pin (${pinX.toFixed(1)}%, ${pinY.toFixed(1)}%)`);
      onRoomUpdated();
      setTimeout(() => setPinSavingStatus(""), 2200);
    } catch {
      setPinSavingStatus("Failed to save pin");
    }
  }

  function computePercentFromClientEvent(e: {
    clientX: number;
    clientY: number;
  }): { pinX: number; pinY: number } | null {
    const imageRect =
      imageRef.current?.getBoundingClientRect() ||
      imageBoundsRef.current?.getBoundingClientRect() ||
      innerPlanRef.current?.getBoundingClientRect() ||
      containerRef.current?.getBoundingClientRect();
    if (!imageRect || imageRect.width === 0 || imageRect.height === 0) {
      return null;
    }
    const rawX = ((e.clientX - imageRect.left) / imageRect.width) * 100;
    const rawY = ((e.clientY - imageRect.top) / imageRect.height) * 100;
    return {
      pinX: Math.max(1, Math.min(99, Number(rawX.toFixed(2)))),
      pinY: Math.max(1, Math.min(99, Number(rawY.toFixed(2)))),
    };
  }

  function handleZoomChange(nextZoom: number) {
    const clamped = Math.max(1, Math.min(3, Number(nextZoom.toFixed(2))));
    setZoom(clamped);
    if (clamped === 1) {
      setPan({ x: 0, y: 0 });
    }
  }

  function handleWheelZoom(e: React.WheelEvent<HTMLDivElement>) {
    if (e.ctrlKey || e.metaKey || zoom > 1 || e.deltaY !== 0) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      handleZoomChange(zoom + delta);
    }
  }

  function handleViewportPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (draggingRoomId) return;
    if (zoom > 1 && !clickToPlaceMode && !addRoomPinMode) {
      setIsPanning(true);
      didPanMoveRef.current = false;
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        originX: pan.x,
        originY: pan.y,
      };
    }
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (didPanMoveRef.current) {
      didPanMoveRef.current = false;
      return;
    }
    if (!isBuilderAdmin) return;

    if (addRoomPinMode) {
      const coords = computePercentFromClientEvent(e);
      if (!coords) return;
      setNewRoomPinCoords(coords);
      return;
    }

    if (!clickToPlaceMode || !activeRoom) return;
    const coords = computePercentFromClientEvent(e);
    if (!coords) return;
    setPinOverrides((prev) => ({
      ...prev,
      [activeRoom.id]: coords,
    }));
    persistPinPosition(activeRoom.id, coords.pinX, coords.pinY);
  }

  async function handleCreateNewRoomAtPin(e: React.FormEvent) {
    e.preventDefault();
    const targetProjectId = project?.id || activeRoom?.projectId;
    if (!targetProjectId || !newRoomPinCoords || !newRoomName.trim()) return;

    setCreatingNewRoom(true);
    try {
      const res = await fetch(`/api/projects/${targetProjectId}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoomName.trim(),
          floorLevel: newRoomFloorLevel,
          lengthFt: Number(newRoomLength) || 14,
          widthFt: Number(newRoomWidth) || 12,
          ceilingHeightFt: Number(newRoomCeiling) || 10,
          pinX: newRoomPinCoords.pinX,
          pinY: newRoomPinCoords.pinY,
          isRadiantZone: newRoomIsRadiant,
          exteriorWallSystem: newRoomWallSystem,
        }),
      });
      const data = await res.json();
      if (data.room?.id) {
        setNewRoomName("");
        setNewRoomPinCoords(null);
        setAddRoomPinMode(false);
        onSelectRoom(data.room.id);
        onRoomUpdated();
      }
    } finally {
      setCreatingNewRoom(false);
    }
  }

  async function handleAutoReadPinDimensions() {
    const targetProjectId = project?.id || activeRoom?.projectId;
    if (!targetProjectId) return;
    setReadingPinDims(true);
    setShowPinDimModal(true);
    try {
      const res = await fetch(
        `/api/projects/${targetProjectId}/read-pin-dimensions`,
        {
          method: "POST",
        }
      );
      const data = await res.json();
      setPinDimNotice(data.notice || "");
      setPinDimRows(
        (data.rooms || []).map((r: any) => ({
          ...r,
          selected: true,
        }))
      );
    } finally {
      setReadingPinDims(false);
    }
  }

  function updatePinDimRow(index: number, field: string, value: any) {
    setPinDimRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  async function handleApplySelectedPinDimensions() {
    const selectedRows = pinDimRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setShowPinDimModal(false);
      return;
    }
    setApplyingPinDims(true);
    try {
      for (const row of selectedRows) {
        await fetch(`/api/rooms/${row.roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lengthFt: Number(row.detectedLengthFt),
            widthFt: Number(row.detectedWidthFt),
            ceilingHeightFt: Number(row.detectedCeilingHeightFt),
          }),
        });
      }
      setShowPinDimModal(false);
      onRoomUpdated();
    } finally {
      setApplyingPinDims(false);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (draggingRoomId && isBuilderAdmin) {
      const coords = computePercentFromClientEvent(e);
      if (!coords) return;
      setPinOverrides((prev) => ({
        ...prev,
        [draggingRoomId]: coords,
      }));
      return;
    }

    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didPanMoveRef.current = true;
      }
      setPan({
        x: panStartRef.current.originX + dx,
        y: panStartRef.current.originY + dy,
      });
    }
  }

  function handlePointerUp() {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
    if (!draggingRoomId || !isBuilderAdmin) return;
    const current = pinOverrides[draggingRoomId];
    const roomId = draggingRoomId;
    setDraggingRoomId(null);
    if (current) {
      persistPinPosition(roomId, current.pinX, current.pinY);
    }
  }

  async function handleSaveRoomDimensions(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRoom) return;
    setSaving(true);
    try {
      await fetch(`/api/rooms/${activeRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editRoomName.trim() || activeRoom.name,
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

  async function handleDeleteActiveRoom() {
    if (!activeRoom || !isBuilderAdmin) return;
    setDeletingRoom(true);
    try {
      const nextRoom = rooms.find((r) => r.id !== activeRoom.id);
      const res = await fetch(`/api/rooms/${activeRoom.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.deleted) {
        setConfirmDeleteOpen(false);
        if (nextRoom) {
          onSelectRoom(nextRoom.id);
        }
        onRoomUpdated();
      }
    } finally {
      setDeletingRoom(false);
    }
  }

  // Compute per-room completion stats
  function getRoomStats(roomId: string) {
    const roomItems = selections.filter((s) => s.roomId === roomId);
    const total = roomItems.length;
    const locked = roomItems.filter(
      (s) => s.status === "Client Approved & Locked"
    ).length;
    const pct = total > 0 ? Math.round((locked / total) * 100) : 100;
    return { total, locked, pct, items: roomItems };
  }

  const activeStats = activeRoom ? getRoomStats(activeRoom.id) : null;
  const hasCustomFloorPlanImage = Boolean(
    project?.floorPlanUrl && project.floorPlanUrl.trim() !== ""
  );

  // Compute bounding box for the dynamic architectural SVG fallback from room gridX, gridZ, lengthFt, widthFt
  const interiorRooms = rooms.filter(
    (r) => !r.name.toLowerCase().includes("exterior")
  );
  const svgRooms = interiorRooms.length > 0 ? interiorRooms : rooms;
  const maxGridX = Math.max(
    80,
    ...svgRooms.map((r) => (Number(r.gridX) || 0) + (Number(r.lengthFt) || 16))
  );
  const maxGridZ = Math.max(
    52,
    ...svgRooms.map((r) => (Number(r.gridZ) || 0) + (Number(r.widthFt) || 14))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Auto-Read Room Dimensions from Placed Pins Modal */}
      {showPinDimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-amber-500/50 shadow-2xl">
            {/* Sticky Header */}
            <div className="shrink-0 border-b border-slate-800 px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  Auto-Read Architectural Room Dimensions from Placed Pins
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Pin-Coordinate Dimension Extraction & Takeoff Sync
                </h3>
                <p className="text-xs text-slate-400">
                  Reads feet-and-inches callouts at each placed room pin&apos;s{" "}
                  <code className="text-amber-300">(pinX%, pinY%)</code>{" "}
                  coordinate and converts them into decimal feet for automated
                  floor, baseboard, and drywall/paint takeoffs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPinDimModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {readingPinDims ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-7 h-7 text-amber-400 animate-spin mx-auto" />
                  <div className="text-sm font-semibold text-white">
                    Inspecting Floor Plan at Placed Pin Coordinates...
                  </div>
                  <div className="text-xs text-slate-400">
                    Converting architectural feet-and-inches callouts into
                    decimal takeoff dimensions
                  </div>
                </div>
              ) : (
                <>
                  {pinDimNotice && (
                    <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl px-4 py-2.5 text-xs text-sky-200">
                      {pinDimNotice}
                    </div>
                  )}

                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                          <th className="py-2.5 px-3 text-center">Apply</th>
                          <th className="py-2.5 px-3">Room & Pin Coord</th>
                          <th className="py-2.5 px-3">Current (L × W × H)</th>
                          <th className="py-2.5 px-3">
                            Detected Plan Callout
                          </th>
                          <th className="py-2.5 px-2">New L (ft)</th>
                          <th className="py-2.5 px-2">New W (ft)</th>
                          <th className="py-2.5 px-2">New H (ft)</th>
                          <th className="py-2.5 px-3">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {pinDimRows.map((row, idx) => (
                          <tr key={row.roomId} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={(e) =>
                                  updatePinDimRow(
                                    idx,
                                    "selected",
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-white">
                                {row.roomName}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Pin: ({Number(row.pinX).toFixed(1)}%,{" "}
                                {Number(row.pinY).toFixed(1)}%)
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">
                              {row.currentLengthFt}&apos; × {row.currentWidthFt}
                              &apos; × {row.currentCeilingHeightFt}&apos;
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono text-amber-300 font-semibold">
                                {row.rawCalloutText}
                              </span>
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                step="0.25"
                                value={row.detectedLengthFt}
                                onChange={(e) =>
                                  updatePinDimRow(
                                    idx,
                                    "detectedLengthFt",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                step="0.25"
                                value={row.detectedWidthFt}
                                onChange={(e) =>
                                  updatePinDimRow(
                                    idx,
                                    "detectedWidthFt",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                step="0.5"
                                value={row.detectedCeilingHeightFt}
                                onChange={(e) =>
                                  updatePinDimRow(
                                    idx,
                                    "detectedCeilingHeightFt",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
                                {row.confidence}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 border-t border-slate-800 px-6 py-3 flex items-center justify-between gap-3 bg-slate-900">
              <span className="text-xs text-slate-400">
                Updates room floor area, baseboard perimeter, and drywall/paint
                takeoff quantities automatically.
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPinDimModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={readingPinDims || applyingPinDims}
                  onClick={handleApplySelectedPinDimensions}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg whitespace-nowrap flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {applyingPinDims
                    ? "Applying & Recalculating Takeoffs..."
                    : "Apply Selected Dimensions & Recalculate Takeoffs"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left 8 Cols: Interactive Visual Floor-Plan Pin Mapper */}
      <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              Interactive Visual Floor-Plan Pin Mapper (
              {hasCustomFloorPlanImage
                ? "Uploaded Architectural Plan"
                : "Computed Architectural SVG Plan from gridX/gridZ"}
              )
            </h3>
            <p className="text-xs text-slate-400">
              Click any room pin to highlight its completion status, radiant
              slab zone, and active selections.{" "}
              {isBuilderAdmin &&
                "Builder Admins can drag any pin or toggle Click-to-Place to update pinX / pinY."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {pinSavingStatus && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[11px]">
                {pinSavingStatus}
              </span>
            )}

            {/* Quick Active Room Selector for Solo Mode & Pin Placement */}
            <select
              value={activeRoom?.id || ""}
              onChange={(e) => onSelectRoom(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium"
              title="Select Active Room Pin"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Active Pin: {r.name}
                </option>
              ))}
            </select>

            {/* Solo Active Pin Toggle */}
            <button
              type="button"
              onClick={() => setSoloActivePin(!soloActivePin)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 border transition whitespace-nowrap ${
                soloActivePin
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow"
                  : "bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800"
              }`}
              title="Hide all other room pins so only the active room pin is visible"
            >
              <Eye className="w-3.5 h-3.5" />
              {soloActivePin ? "Solo Active Pin: ON" : "Solo Active Pin"}
            </button>

            {isBuilderAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !addRoomPinMode;
                    setAddRoomPinMode(nextState);
                    if (nextState) {
                      setClickToPlaceMode(false);
                    } else {
                      setNewRoomPinCoords(null);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition whitespace-nowrap ${
                    addRoomPinMode
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow"
                      : "bg-slate-950 text-emerald-300 border-emerald-500/40 hover:bg-slate-800"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addRoomPinMode
                    ? "Click Plan to Drop New Room Pin..."
                    : "+ Add Room Pin"}
                </button>

                <button
                  type="button"
                  onClick={handleAutoReadPinDimensions}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-sky-500/50 text-sky-300 font-semibold text-xs flex items-center gap-1.5 transition whitespace-nowrap"
                  title="Inspect placed (pinX%, pinY%) coordinates on the floor plan to read architectural room dimensions"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Auto-Read Dimensions from Pins
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextState = !clickToPlaceMode;
                    setClickToPlaceMode(nextState);
                    if (nextState) {
                      setAddRoomPinMode(false);
                      setNewRoomPinCoords(null);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 border transition whitespace-nowrap ${
                    clickToPlaceMode
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                      : "bg-slate-950 text-amber-300 border-amber-500/40 hover:bg-slate-800"
                  }`}
                >
                  <Move className="w-3.5 h-3.5" />
                  {clickToPlaceMode
                    ? `Click Plan to Place "${activeRoom?.name?.slice(0, 16)}..."`
                    : "Click-to-Place / Drag Pin"}
                </button>
              </>
            )}

            {isBuilderAdmin && onOpenUpdatePlansModal && (
              <button
                type="button"
                onClick={onOpenUpdatePlansModal}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition whitespace-nowrap"
              >
                <FileUp className="w-3.5 h-3.5" />
                Upload / Replace Floor Plan
              </button>
            )}

            {/* Zoom & Pan Controls (100% to 300%) */}
            <div className="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - 0.25)}
                disabled={zoom <= 1}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[11px] font-bold text-amber-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleZoomChange(zoom + 0.25)}
                disabled={zoom >= 3}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoom > 1 && (
                <button
                  type="button"
                  onClick={() => handleZoomChange(1)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 flex items-center gap-0.5"
                  title="Reset Zoom to 100%"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  100%
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Visual Floor Plan Viewport with Shared Transform Container for Image + Room Pins */}
        <div
          ref={containerRef}
          onWheel={handleWheelZoom}
          onPointerDown={handleViewportPointerDown}
          onClick={handleCanvasClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`relative w-full ${
            compactMode ? "h-[360px]" : "h-[440px]"
          } rounded-xl bg-slate-950 border-2 border-amber-500/50 overflow-hidden shadow-inner select-none ${
            clickToPlaceMode || addRoomPinMode
              ? "cursor-crosshair"
              : zoom > 1
              ? isPanning
                ? "cursor-grabbing"
                : "cursor-grab"
              : ""
          }`}
        >
          {/* Inline "New Room at Pin Location" Modal Overlay when user clicks on floor plan in + Add Room Pin mode */}
          {newRoomPinCoords && isBuilderAdmin && (
            <div
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <form
                onSubmit={handleCreateNewRoomAtPin}
                className="w-full max-w-md bg-slate-900 border border-emerald-500/50 rounded-xl p-4 shadow-2xl space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      New Room at Pin Location ({newRoomPinCoords.pinX}%,{" "}
                      {newRoomPinCoords.pinY}%)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Computes floor, perimeter, and drywall/paint takeoff
                      quantities automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewRoomPinCoords(null)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-slate-400 block mb-1 font-medium">
                      Room Name
                    </label>
                    <input
                      required
                      autoFocus
                      placeholder="e.g., Study / Office, Mudroom & Drop Zone, Covered Lanai"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-emerald-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">
                      Floor Level
                    </label>
                    <select
                      value={newRoomFloorLevel}
                      onChange={(e) => {
                        const lvl = e.target.value;
                        setNewRoomFloorLevel(lvl);
                        if (lvl === "Exterior") {
                          setNewRoomIsRadiant(false);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="Main Level">Main Level</option>
                      <option value="Upper Level">Upper Level</option>
                      <option value="Lower Level">Lower Level</option>
                      <option value="Exterior">Exterior</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">
                      Wall System
                    </label>
                    <select
                      value={newRoomWallSystem}
                      onChange={(e) => setNewRoomWallSystem(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="Nuform CF8i Perimeter + 2x4 Interior">
                        Nuform CF8i Perimeter + 2x4 Interior
                      </option>
                      <option value="2x4 Interior Partition">
                        2x4 Interior Partition
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">
                        Length (ft)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={newRoomLength}
                        onChange={(e) =>
                          setNewRoomLength(Number(e.target.value))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">
                        Width (ft)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={newRoomWidth}
                        onChange={(e) =>
                          setNewRoomWidth(Number(e.target.value))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">
                        Ceiling (ft)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={newRoomCeiling}
                        onChange={(e) =>
                          setNewRoomCeiling(Number(e.target.value))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>

                  <label className="sm:col-span-2 flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 cursor-pointer">
                    <span className="font-medium text-white flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      Hydronic Radiant Slab Zone
                    </span>
                    <input
                      type="checkbox"
                      checked={newRoomIsRadiant}
                      onChange={(e) => setNewRoomIsRadiant(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setNewRoomPinCoords(null);
                      setAddRoomPinMode(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingNewRoom}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow"
                  >
                    {creatingNewRoom
                      ? "Creating Room Pin..."
                      : "Create Room & Drop Pin"}
                  </button>
                </div>
              </form>
            </div>
          )}
          {/* Shared Zoom & Pan Transform Layer */}
          <div
            ref={innerPlanRef}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
            className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
          >
            {/* Exact Image-Bounds Container (Eliminates Letterbox Coordinate Drift) */}
            <div
              ref={imageBoundsRef}
              style={
                !hasCustomFloorPlanImage
                  ? { aspectRatio: `${maxGridX + 12} / ${maxGridZ + 12}` }
                  : undefined
              }
              className={`relative inline-block ${
                hasCustomFloorPlanImage
                  ? "max-w-full max-h-full"
                  : "w-full max-w-full max-h-full"
              }`}
            >
              {hasCustomFloorPlanImage ? (
                project.floorPlanUrl.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={project.floorPlanUrl}
                    title={`${project.name} PDF Floor Plan`}
                    className={`block w-[760px] max-w-full ${
                      compactMode ? "h-[352px]" : "h-[432px]"
                    } opacity-85 pointer-events-none border-0`}
                  />
                ) : (
                  <img
                    ref={(el) => {
                      imageRef.current = el;
                    }}
                    src={project.floorPlanUrl}
                    alt={`${project.name} Floor Plan`}
                    className={`block w-auto h-auto max-w-full ${
                      compactMode ? "max-h-[352px]" : "max-h-[432px]"
                    } opacity-90 pointer-events-none select-none`}
                  />
                )
              ) : (
                /* Clean Architectural SVG Floor Plan Fallback computed from gridX, gridZ, lengthFt, widthFt */
                <svg
                  ref={(el) => {
                    imageRef.current = el;
                  }}
                  viewBox={`-6 -6 ${maxGridX + 12} ${maxGridZ + 12}`}
                  preserveAspectRatio="none"
                  className={`block w-full ${
                    compactMode ? "max-h-[352px]" : "max-h-[432px]"
                  } pointer-events-none select-none`}
                >
                  <defs>
                    <pattern
                      id="koBlueprintGrid"
                      width="4"
                      height="4"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 4 0 L 0 0 0 4"
                        fill="none"
                        stroke="#1E293B"
                        strokeWidth="0.18"
                      />
                    </pattern>
                  </defs>

                  {/* Blueprint Grid Background */}
                  <rect
                    x="-6"
                    y="-6"
                    width={maxGridX + 12}
                    height={maxGridZ + 12}
                    fill="url(#koBlueprintGrid)"
                  />

                  {/* Outer Nuform CF8i Envelope Perimeter */}
                  <rect
                    x="0"
                    y="0"
                    width={maxGridX}
                    height={maxGridZ}
                    fill="#0F172A"
                    fillOpacity="0.65"
                    stroke="#F59E0B"
                    strokeWidth="0.9"
                  />

                  {/* Individual Room Footprints from gridX, gridZ, lengthFt, widthFt */}
                  {svgRooms.map((room) => {
                    const isSelected = room.id === activeRoom?.id;
                    const rx = Number(room.gridX) || 0;
                    const rz = Number(room.gridZ) || 0;
                    const rw = Number(room.lengthFt) || 16;
                    const rh = Number(room.widthFt) || 14;
                    const strokeColor = room.hasGarageFireWall
                      ? "#EF4444"
                      : room.hasExteriorCF8iWall
                      ? "#F59E0B"
                      : "#38BDF8";

                    return (
                      <g key={room.id}>
                        <rect
                          x={rx}
                          y={rz}
                          width={rw}
                          height={rh}
                          fill={
                            isSelected
                              ? "rgba(245, 158, 11, 0.22)"
                              : room.hasRadiantSlab
                              ? "rgba(30, 41, 59, 0.78)"
                              : "rgba(15, 23, 42, 0.85)"
                          }
                          stroke={strokeColor}
                          strokeWidth={isSelected ? "0.7" : "0.4"}
                          strokeDasharray={
                            room.hasGarageFireWall ? "1.4 0.7" : undefined
                          }
                        />
                        <text
                          x={rx + rw / 2}
                          y={rz + rh / 2 - 0.8}
                          textAnchor="middle"
                          fill="#E2E8F0"
                          fontSize="1.9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {room.name.slice(0, 22)}
                        </text>
                        <text
                          x={rx + rw / 2}
                          y={rz + rh / 2 + 1.6}
                          textAnchor="middle"
                          fill="#94A3B8"
                          fontSize="1.5"
                          fontFamily="monospace"
                        >
                          {room.lengthFt}&apos; × {room.widthFt}&apos; (
                          {room.floorAreaSqFt} sf)
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Exact Image-Bounds Pin Overlay Layer */}
              <div className="absolute inset-0">
                {rooms.map((room) => {
                  const isSelected = room.id === activeRoom?.id;
                  const isDraggingThisPin = draggingRoomId === room.id;
                  const isPrecisionCrosshairMode =
                    isDraggingThisPin ||
                    (isSelected && (clickToPlaceMode || addRoomPinMode));
                  const isHiddenInSolo = soloActivePin && !isSelected;
                  const override = pinOverrides[room.id];
                  const pinX = override
                    ? override.pinX
                    : Number(room.pinX) || 50;
                  const pinY = override
                    ? override.pinY
                    : Number(room.pinY) || 50;
                  const stats = getRoomStats(room.id);
                  const isFullyLocked = stats.pct === 100 && stats.total > 0;
                  const shortRoomLabel = room.name.split("&")[0].trim();

                  return (
                    /* 1. Zero-Size Exact Coordinate Anchor (0px x 0px at left: pinX%, top: pinY%) */
                    <div
                      key={room.id}
                      style={{
                        left: `${pinX}%`,
                        top: `${pinY}%`,
                        transform: `scale(${1 / zoom})`,
                        transformOrigin: "0 0",
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onSelectRoom(room.id);
                        if (isBuilderAdmin) {
                          setDraggingRoomId(room.id);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRoom(room.id);
                      }}
                      className={`absolute w-0 h-0 overflow-visible group transition-opacity ${
                        isHiddenInSolo
                          ? "opacity-0 pointer-events-none"
                          : "opacity-100"
                      } ${
                        isBuilderAdmin
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-pointer"
                      } ${isSelected ? "z-30" : "z-20 hover:z-30"}`}
                    >
                      {isPrecisionCrosshairMode ? (
                        /* 2. Precision Bullseye Crosshair While Dragging / Placing (Centered on 0,0) */
                        <div className="relative w-0 h-0 overflow-visible pointer-events-none">
                          {/* Outer translucent bullseye ring */}
                          <div className="w-7 h-7 rounded-full border border-amber-400/90 bg-amber-500/15 -translate-x-1/2 -translate-y-1/2 shadow-sm" />
                          {/* Horizontal hairline */}
                          <div className="absolute left-0 top-0 w-9 h-[1px] bg-amber-300/90 -translate-x-1/2 -translate-y-1/2" />
                          {/* Vertical hairline */}
                          <div className="absolute left-0 top-0 w-[1px] h-9 bg-amber-300/90 -translate-x-1/2 -translate-y-1/2" />
                          {/* Exact (0, 0) center target dot */}
                          <div className="absolute left-0 top-0 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white -translate-x-1/2 -translate-y-1/2 shadow" />
                          {/* Subtle semi-transparent coordinate micro-badge offset above bullseye */}
                          <div className="absolute left-0 -top-5 -translate-x-1/2 -translate-y-full px-1.5 py-0.5 rounded bg-slate-950/75 border border-amber-400/50 text-[9px] font-mono text-amber-200 whitespace-nowrap">
                            {shortRoomLabel} ({pinX.toFixed(1)}%, {pinY.toFixed(1)}%)
                          </div>
                        </div>
                      ) : (
                        /* 1. Unified Teardrop / Pointer-Tip Geometry (Attached directly above 0,0 with zero gap) */
                        <>
                          <div
                            style={{
                              transform: "translate(-50%, -100%)",
                              transformOrigin: "bottom center",
                            }}
                            className="flex flex-col items-center"
                          >
                            {/* Attached Label Pill */}
                            <div
                              className={`px-2 py-0.5 rounded-full border shadow-md inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-white shadow-amber-500/40"
                                  : isFullyLocked
                                  ? "bg-slate-900/95 text-emerald-200 border-emerald-500/80 hover:border-white"
                                  : "bg-slate-900/95 text-slate-100 border-amber-500/80 hover:border-white"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isSelected
                                    ? "bg-slate-950"
                                    : isFullyLocked
                                    ? "bg-emerald-400"
                                    : "bg-amber-400"
                                }`}
                              />
                              <span>{shortRoomLabel}</span>

                              {/* Full lock count & radiant icon revealed on hover or when selected */}
                              <span
                                className={`${
                                  isSelected
                                    ? "inline-flex"
                                    : "hidden group-hover:inline-flex"
                                } items-center gap-1 pl-1 border-l ${
                                  isSelected
                                    ? "border-slate-950/30 text-slate-950"
                                    : "border-slate-700 text-amber-300"
                                } text-[10px] font-mono`}
                              >
                                <span>
                                  {stats.locked}/{stats.total}
                                </span>
                                {room.hasRadiantSlab && (
                                  <Flame
                                    className={`w-2.5 h-2.5 ${
                                      isSelected
                                        ? "text-slate-950"
                                        : "text-orange-400"
                                    }`}
                                  />
                                )}
                              </span>
                            </div>

                            {/* 6px Downward Triangle Pointer whose sharp tip touches (0, 0) with zero gap */}
                            <div
                              className={`w-0 h-0 -mt-[1px] border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] ${
                                isSelected
                                  ? "border-t-amber-500"
                                  : isFullyLocked
                                  ? "border-t-emerald-500"
                                  : "border-t-amber-500"
                              }`}
                            />
                          </div>

                          {/* Exact (0, 0) tip anchor point dot */}
                          <div
                            className={`w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 ring-1 ring-white shadow ${
                              isSelected
                                ? "bg-amber-500"
                                : isFullyLocked
                                ? "bg-emerald-400"
                                : "bg-amber-400"
                            }`}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              Nuform CF8i Perimeter (7-7/8&quot;)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              2-Hr CF8i Garage Fire Wall
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
              {interiorFramingType}
            </span>
          </div>
          {activeRoom && (
            <span className="font-mono text-[11px] text-slate-400">
              Active Pin: ({(pinOverrides[activeRoom.id]?.pinX ?? activeRoom.pinX).toFixed(1)}%,{" "}
              {(pinOverrides[activeRoom.id]?.pinY ?? activeRoom.pinY).toFixed(1)}%) | Grid Origin: ({activeRoom.gridX}&apos;, {activeRoom.gridZ}&apos;)
            </span>
          )}
        </div>
      </div>

      {/* Right 4 Cols: Highlighted Room Status, Active Items & Dimension Editor */}
      <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4">
        {activeRoom ? (
          <>
            <div className="space-y-3">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
                    Highlighted Room Pin Inspector
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {activeRoom.floorLevel}
                  </span>
                </div>
                <div className="mt-1.5">
                  <label className="sr-only">Room Name</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={editRoomName}
                    onChange={(e) => setEditRoomName(e.target.value)}
                    placeholder="Room Name..."
                    className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white outline-none transition"
                  />
                </div>

                {/* Completion & Radiant Status Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {activeStats?.locked}/{activeStats?.total} Locked (
                    {activeStats?.pct}%)
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      activeRoom.hasRadiantSlab
                        ? "bg-orange-500/15 border border-orange-500/40 text-orange-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    {activeRoom.hasRadiantSlab
                      ? "Hydronic Radiant Slab Active"
                      : "Non-Radiant Zone"}
                  </span>
                </div>
              </div>

              {/* Active Selection Items in Highlighted Room */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Active Selection Items in Room ({activeStats?.items.length || 0})
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {(activeStats?.items || []).map((it: any) => (
                    <div
                      key={it.id}
                      className="bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-slate-700"
                          style={{ backgroundColor: it.colorHex || "#CBD5E1" }}
                        />
                        <span className="text-slate-200 truncate font-medium">
                          {it.componentName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ${
                          it.status === "Client Approved & Locked"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-amber-300"
                        }`}
                      >
                        {it.status === "Client Approved & Locked" ? (
                          <span className="inline-flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        ) : (
                          it.sku
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Room Dimension & Wall Takeoff Form */}
            <form onSubmit={handleSaveRoomDimensions} className="space-y-3 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                  <label className="block text-[10px] uppercase text-slate-400">
                    Length (ft)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!canEdit}
                    value={editLength}
                    onChange={(e) => setEditLength(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                  <label className="block text-[10px] uppercase text-slate-400">
                    Width (ft)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!canEdit}
                    value={editWidth}
                    onChange={(e) => setEditWidth(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                  <label className="block text-[10px] uppercase text-slate-400">
                    Ceiling (ft)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!canEdit}
                    value={editCeiling}
                    onChange={(e) => setEditCeiling(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 border border-slate-800/90 rounded-lg p-2.5 text-center">
                <div>
                  <div className="text-[10px] uppercase text-slate-400">
                    Floor Area
                  </div>
                  <div className="text-xs font-bold font-mono text-white">
                    {activeRoom.floorAreaSqFt} sf
                  </div>
                </div>
                <div className="border-x border-slate-800">
                  <div className="text-[10px] uppercase text-slate-400">
                    Perimeter
                  </div>
                  <div className="text-xs font-bold font-mono text-amber-300">
                    {activeRoom.perimeterLinFt} lf
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">
                    Drywall/Paint
                  </div>
                  <div className="text-xs font-bold font-mono text-sky-300">
                    {activeRoom.netWallAreaSqFt} sf
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Nuform CF8i Interior Wall Surface Rule
                </label>
                <select
                  disabled={!canEdit}
                  value={editCf8iFinish}
                  onChange={(e) => setEditCf8iFinish(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  {CF8I_FINISH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {canEdit && (
                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    {saving
                      ? "Recalculating Room Takeoffs..."
                      : "Save Dimensions & Recalculate Takeoffs"}
                  </button>

                  {isBuilderAdmin && (
                    <>
                      {!confirmDeleteOpen ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteOpen(true)}
                          className="w-full py-2 px-4 rounded-lg bg-transparent hover:bg-red-500/15 border border-red-500/60 text-red-400 font-semibold text-xs transition flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Room
                        </button>
                      ) : (
                        <div className="bg-red-950/40 border border-red-500/60 rounded-lg p-3 space-y-2 text-xs">
                          <p className="text-red-200 font-medium text-center">
                            Remove this room pin and its{" "}
                            <strong>{activeStats?.total || 0}</strong> selection
                            item(s)?
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteOpen(false)}
                              className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={deletingRoom}
                              onClick={handleDeleteActiveRoom}
                              className="flex-1 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold"
                            >
                              {deletingRoom ? "Deleting..." : "Confirm Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
