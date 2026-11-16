"use client";

import React, { useState } from "react";
import {
  FileUp,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  X,
  Layers,
  RotateCcw,
} from "lucide-react";
import { CF8I_FINISH_OPTIONS } from "@/lib/construction-rules";
import {
  extractPdfPageThumbnails,
  PdfPagePreview,
  renderPdfPageAt2xToPngBlob,
  uploadBlobViaStorageAdapter,
} from "@/lib/pdf-floorplan-extractor";
import { PdfSheetPicker } from "./PdfSheetPicker";

interface UpdateProjectPlansModalProps {
  isOpen: boolean;
  project: any;
  onClose: () => void;
  onUpdated: () => void;
}

export function UpdateProjectPlansModal({
  isOpen,
  project,
  onClose,
  onUpdated,
}: UpdateProjectPlansModalProps) {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(
    project?.floorPlanUrl || ""
  );
  const [fullPdfPacketUrl, setFullPdfPacketUrl] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedMimeType, setUploadedMimeType] =
    useState<string>("image/png");
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Multi-Page PDF Sheet Extraction State
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfPagePreviews, setPdfPagePreviews] = useState<PdfPagePreview[]>([]);
  const [selectedPdfPageNum, setSelectedPdfPageNum] = useState<number>(1);
  const [extractingPdfPages, setExtractingPdfPages] = useState<boolean>(false);

  // Optional Re-Parse & Sync Staging State
  const [showMergeStaging, setShowMergeStaging] = useState<boolean>(false);
  const [stagedRooms, setStagedRooms] = useState<any[]>([]);
  const [stagedOpenings, setStagedOpenings] = useState<any[]>([]);

  React.useEffect(() => {
    if (project) {
      setUploadedUrl(project.floorPlanUrl || "");
    }
  }, [project?.id, project?.floorPlanUrl]);

  if (!isOpen || !project) return null;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      setSelectedPdfFile(file);
      setUploadedFileName(file.name);
      setUploadedMimeType("application/pdf");
      setExtractingPdfPages(true);
      setStatusMessage(
        `Rendering page thumbnails for "${file.name}" and scanning for "Floor Plan" / "Main Level"...`
      );

      try {
        const { pages, autoSelectedPage } = await extractPdfPageThumbnails(
          file
        );
        setPdfPagePreviews(pages);
        setSelectedPdfPageNum(autoSelectedPage);

        // Immediately perform dual upload for the auto-selected sheet (and re-run if user clicks another page)
        await performDualPdfUpload(file, autoSelectedPage);
      } catch (err: any) {
        setStatusMessage(
          err?.message || "Failed to extract PDF pages in browser."
        );
      } finally {
        setExtractingPdfPages(false);
      }
      return;
    }

    // Standard Image Upload (PNG / JPG / WEBP / SVG)
    setPdfPagePreviews([]);
    setSelectedPdfFile(null);
    setUploading(true);
    setStatusMessage("Uploading floor plan image via dual-mode storage adapter...");

    try {
      const publicUrl = await uploadBlobViaStorageAdapter(file, file.name);
      setUploadedUrl(publicUrl);
      setUploadedFileName(file.name);
      setUploadedMimeType(file.type || "image/png");

      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorPlanUrl: publicUrl }),
      });

      setStatusMessage(
        `Saved "${file.name}" as active floor plan background! Existing room pins are ready to drag.`
      );
      onUpdated();
    } catch (err: any) {
      setStatusMessage(err?.message || "Floor plan upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function performDualPdfUpload(pdfFile: File, pageNumber: number) {
    setUploading(true);
    setStatusMessage(
      `Extracting Sheet #${pageNumber} at 2x PNG resolution and uploading both full PDF packet & floor-plan PNG...`
    );

    try {
      // 1. Render selected floor-plan sheet at 2x resolution onto offscreen <canvas> -> PNG Blob
      const pngBlob = await renderPdfPageAt2xToPngBlob(pdfFile, pageNumber);
      const baseSafeName = pdfFile.name.replace(/\.[^/.]+$/, "");
      const pngFileName = `${baseSafeName}-sheet-${pageNumber}-2x.png`;

      // 2. Upload BOTH the full multi-page PDF packet AND the 2x extracted PNG sheet in parallel
      const [pdfUrl, pngUrl] = await Promise.all([
        fullPdfPacketUrl
          ? Promise.resolve(fullPdfPacketUrl)
          : uploadBlobViaStorageAdapter(pdfFile, pdfFile.name),
        uploadBlobViaStorageAdapter(pngBlob, pngFileName),
      ]);

      setFullPdfPacketUrl(pdfUrl);
      setUploadedUrl(pngUrl);

      // 3. Persist the extracted 2x floor-plan PNG URL as the project's `floorPlanUrl`
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorPlanUrl: pngUrl }),
      });

      setStatusMessage(
        `Dual upload complete! Full PDF saved for AI parsing & Sheet #${pageNumber} (2x PNG) set as active 2D Pin Mapper background.`
      );
      onUpdated();
    } catch (err: any) {
      setStatusMessage(
        err?.message || "Failed to extract & upload 2x floor-plan PNG."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSelectDifferentPdfPage(pageNumber: number) {
    setSelectedPdfPageNum(pageNumber);
    if (selectedPdfFile) {
      await performDualPdfUpload(selectedPdfFile, pageNumber);
    }
  }

  async function handleUseBuiltInBlueprintSample() {
    setUploading(true);
    try {
      const sampleUrl = "/titko-floorplan-preview.svg";
      setUploadedUrl(sampleUrl);
      setUploadedFileName("Titko-Residence-Blueprint-A101.svg");
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorPlanUrl: sampleUrl }),
      });
      setStatusMessage(
        "Applied architectural blueprint drawing behind existing draggable room pins!"
      );
      onUpdated();
    } finally {
      setUploading(false);
    }
  }

  async function handleResetToComputedSvg() {
    setUploading(true);
    try {
      setUploadedUrl("");
      setPdfPagePreviews([]);
      setSelectedPdfFile(null);
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorPlanUrl: null }),
      });
      setStatusMessage(
        "Reset background to computed gridX/gridZ architectural SVG layout."
      );
      onUpdated();
    } finally {
      setUploading(false);
    }
  }

  async function handleParseAndStageMerge() {
    setParsing(true);
    setStatusMessage("Running AI Architectural Plan Parser on updated plan...");
    try {
      // Pass the full multi-page PDF packet URL (or the floor plan image URL) to Gemini
      const parseTargetUrl =
        fullPdfPacketUrl || uploadedUrl || "/titko-floorplan-preview.svg";
      const parseMime = fullPdfPacketUrl
        ? "application/pdf"
        : uploadedMimeType;

      const res = await fetch("/api/projects/parse-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: parseTargetUrl,
          fileName: uploadedFileName || `${project.name}-Updated-Plan.pdf`,
          mimeType: parseMime,
        }),
      });
      const data = await res.json();
      setStagedRooms(data.rooms || []);
      setStagedOpenings(data.openings || []);
      setShowMergeStaging(true);
      setStatusMessage(
        `Extracted ${data.rooms?.length || 0} rooms and ${
          data.openings?.length || 0
        } openings. Review below to merge without touching locked selections.`
      );
    } finally {
      setParsing(false);
    }
  }

  function updateStagedRoom(index: number, field: string, value: any) {
    setStagedRooms((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function addStagedRoomRow() {
    setStagedRooms((prev) => [
      ...prev,
      {
        name: `New Sunroom / Bonus Suite ${prev.length + 1}`,
        floorLevel: "Main Level",
        lengthFt: 16,
        widthFt: 14,
        ceilingHeightFt: 10,
        pinX: 72,
        pinY: 45,
        gridX: 56,
        gridZ: 28,
        hasRadiantSlab: true,
        hasExteriorCF8iWall: true,
        hasGarageFireWall: false,
        cf8iInteriorFinish: "Furred Drywall + Paint",
      },
    ]);
  }

  function removeStagedRoomRow(index: number) {
    setStagedRooms((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmNonDestructiveMerge() {
    setMerging(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge_parsed_plan",
          floorPlanUrl: uploadedUrl || project.floorPlanUrl,
          rooms: stagedRooms,
          openings: stagedOpenings,
        }),
      });
      const result = await res.json();
      if (result.ok) {
        setStatusMessage(
          `Synced ${result.updatedRoomsCount} existing rooms, added ${result.addedRoomsCount} new rooms, and updated ${result.syncedOpeningsCount} openings (all locked selections preserved!).`
        );
        onUpdated();
        setTimeout(() => {
          onClose();
        }, 900);
      }
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-amber-500/50 shadow-2xl">
        {/* Sticky Header */}
        <div className="shrink-0 border-b border-slate-800 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Layers className="w-4 h-4" />
              Upload / Replace Background Floor Plan & Sync Rooms
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              {project.name} — Architectural Plan Manager
            </h3>
            <p className="text-xs text-slate-400">
              Upload a multi-page architectural PDF packet (auto-extracts the
              floor-plan sheet at 2x PNG resolution) or image behind your
              draggable room pins (<code className="text-amber-300">pinX</code>{" "}
              / <code className="text-amber-300">pinY</code>).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {statusMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-200">
              {uploading || extractingPdfPages ? (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Step 1: Upload / Replace Background Floor Plan */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            <label className="md:col-span-7 flex flex-col items-center justify-center border-2 border-dashed border-amber-500/40 hover:border-amber-400 rounded-xl p-6 cursor-pointer bg-slate-950/70 transition text-center">
              <FileUp className="w-7 h-7 text-amber-400 mb-2" />
              <span className="text-sm font-bold text-white">
                {uploading || extractingPdfPages
                  ? "Extracting 2x Floor-Plan Sheet & Uploading..."
                  : "Upload / Replace Floor Plan (PDF / PNG / JPG)"}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Multi-page PDFs automatically render page thumbnails, detect{" "}
                <strong className="text-amber-300">
                  &quot;Floor Plan&quot; / &quot;Main Level&quot;
                </strong>
                , and export a 2x PNG for the 2D Pin Mapper
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="md:col-span-5 bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 text-xs">
              <div>
                <div className="font-bold text-white">
                  Current Background Plan Mode
                </div>
                <p className="text-slate-400 mt-0.5 break-all">
                  {uploadedUrl
                    ? `Active 2D Background PNG: ${uploadedUrl}`
                    : "Active: Computed Architectural SVG Layout (gridX / gridZ)"}
                </p>
                {fullPdfPacketUrl && (
                  <p className="text-emerald-300 text-[11px] mt-1 break-all">
                    Full PDF Packet Stored: {fullPdfPacketUrl}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleUseBuiltInBlueprintSample}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 font-semibold text-xs"
                >
                  Load Blueprint Drawing Overlay
                </button>
                {uploadedUrl && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleResetToComputedSvg}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Use Computed SVG
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Multi-Page PDF Sheet Thumbnail Selector (When a PDF packet was selected) */}
          {pdfPagePreviews.length > 0 && (
            <PdfSheetPicker
              pages={pdfPagePreviews}
              selectedPage={selectedPdfPageNum}
              onSelectPage={handleSelectDifferentPdfPage}
              fileName={uploadedFileName}
            />
          )}

          {/* Step 2: Optional "Parse Updated Plans & Merge Rooms" Mode */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Optional: Re-Parse & Sync Rooms / Openings from Updated Plans
                </h4>
                <p className="text-xs text-slate-400">
                  Decomposes the uploaded plan into an editable staging table so
                  you can add new rooms/openings or update room dimensions{" "}
                  <strong className="text-emerald-300">
                    without deleting or overwriting existing locked selections
                  </strong>
                  .
                </p>
              </div>
              <button
                type="button"
                disabled={parsing}
                onClick={handleParseAndStageMerge}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow whitespace-nowrap"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Parsing Updated Plans...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Parse Updated Plans & Merge Rooms
                  </>
                )}
              </button>
            </div>

            {showMergeStaging && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300">
                    Editable Room & Dimension Merge Table ({stagedRooms.length}{" "}
                    Rooms, {stagedOpenings.length} Window/Door Openings)
                  </span>
                  <button
                    type="button"
                    onClick={addStagedRoomRow}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add New Room to Project
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <th className="py-2 px-3">Room Name</th>
                        <th className="py-2 px-2">L (ft)</th>
                        <th className="py-2 px-2">W (ft)</th>
                        <th className="py-2 px-2">Clg (ft)</th>
                        <th className="py-2 px-2">Area</th>
                        <th className="py-2 px-2 text-center">Radiant</th>
                        <th className="py-2 px-3">CF8i Wall Finish</th>
                        <th className="py-2 px-2 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {stagedRooms.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3">
                            <input
                              value={r.name}
                              onChange={(e) =>
                                updateStagedRoom(idx, "name", e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={r.lengthFt}
                              onChange={(e) =>
                                updateStagedRoom(
                                  idx,
                                  "lengthFt",
                                  Number(e.target.value)
                                )
                              }
                              className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={r.widthFt}
                              onChange={(e) =>
                                updateStagedRoom(
                                  idx,
                                  "widthFt",
                                  Number(e.target.value)
                                )
                              }
                              className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={r.ceilingHeightFt}
                              onChange={(e) =>
                                updateStagedRoom(
                                  idx,
                                  "ceilingHeightFt",
                                  Number(e.target.value)
                                )
                              }
                              className="w-12 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                            />
                          </td>
                          <td className="py-2 px-2 font-mono text-amber-300">
                            {(
                              Number(r.lengthFt || 0) * Number(r.widthFt || 0)
                            ).toFixed(0)}{" "}
                            sf
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={r.hasRadiantSlab}
                              onChange={(e) =>
                                updateStagedRoom(
                                  idx,
                                  "hasRadiantSlab",
                                  e.target.checked
                                )
                              }
                              className="accent-orange-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={r.cf8iInteriorFinish}
                              onChange={(e) =>
                                updateStagedRoom(
                                  idx,
                                  "cf8iInteriorFinish",
                                  e.target.value
                                )
                              }
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                            >
                              {CF8I_FINISH_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeStagedRoomRow(idx)}
                              className="p-1 text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 border-t border-slate-800 px-6 py-3 flex items-center justify-between gap-3 bg-slate-900">
          <span className="text-xs text-slate-400">
            Locked homeowner selections are strictly protected during plan
            merges.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 whitespace-nowrap"
            >
              Done / Close
            </button>
            {showMergeStaging && (
              <button
                type="button"
                disabled={merging}
                onClick={handleConfirmNonDestructiveMerge}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg whitespace-nowrap flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {merging
                  ? "Merging Rooms & Preserving Locked Specs..."
                  : "Merge Rooms & Openings into Project"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
