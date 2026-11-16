"use client";

import React, { useState } from "react";
import {
  FileUp,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Building2,
  Copy,
  Loader2,
} from "lucide-react";
import { CF8I_FINISH_OPTIONS } from "@/lib/construction-rules";

interface PlanUploadWizardProps {
  existingProjects: any[];
  onProjectCreated: (projectId: string) => void;
  onClose: () => void;
}

export function PlanUploadWizard({
  existingProjects,
  onProjectCreated,
  onClose,
}: PlanUploadWizardProps) {
  const [step, setStep] = useState<"upload" | "staging">("upload");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [parserMetadata, setParserMetadata] = useState<{
    parserSource: string;
    modelUsed: string;
  } | null>(null);

  // Project Staging State
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("client@kobuilders.com");
  const [siteAddress, setSiteAddress] = useState("");
  const [totalAllowanceBudget, setTotalAllowanceBudget] = useState(185000);
  const [interiorFramingType, setInteriorFramingType] = useState(
    "2x4 Light-Gauge Metal Framing"
  );
  const [stagedRooms, setStagedRooms] = useState<any[]>([]);
  const [stagedOpenings, setStagedOpenings] = useState<any[]>([]);

  // Clone Existing Project / Template State
  const [cloneSourceId, setCloneSourceId] = useState(
    existingProjects[0]?.id || ""
  );
  const [cloneName, setCloneName] = useState(
    "Miller Residence — Delaware OH (Cloned ICF Spec)"
  );
  const [cloneAsTemplate, setCloneAsTemplate] = useState(false);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await runUploadAndParse(file);
  }

  async function runUploadAndParse(file?: File) {
    setUploading(true);
    try {
      let publicUrl = "/titko-floorplan-preview.svg";
      let fileName = file?.name || "Custom-ICF-Architectural-Set-A101.pdf";
      let mimeType = file?.type || "application/pdf";

      if (file) {
        // Step 1: Check signed URL adapter (`POST /api/upload/signed-url`)
        const signedRes = await fetch("/api/upload/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name }),
        });
        const signedData = await signedRes.json();

        if (signedData.mode === "supabase" && signedData.signedUrl) {
          await fetch(signedData.signedUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type || "application/pdf",
            },
          });
          publicUrl = signedData.publicUrl;
        } else {
          // Local disk fallback (`POST /api/upload`)
          const formData = new FormData();
          formData.append("file", file);
          const localRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const localData = await localRes.json();
          if (localData.publicUrl) {
            publicUrl = localData.publicUrl;
          }
        }
      }

      setUploadedFileUrl(publicUrl);
      setUploadedFileName(fileName);

      // Step 2: Decompose architectural plans via `POST /api/projects/parse-plan`
      const parseRes = await fetch("/api/projects/parse-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: publicUrl,
          fileName,
          mimeType,
        }),
      });
      const parsed = await parseRes.json();

      setParserMetadata({
        parserSource: parsed.parserSource,
        modelUsed: parsed.modelUsed,
      });
      setProjectName(parsed.suggestedProjectName || "New KO Builders ICF Home");
      setClientName(parsed.suggestedClientName || "Custom Build Homeowner");
      setSiteAddress(parsed.suggestedSiteAddress || "Sunbury, OH");
      setStagedRooms(parsed.rooms || []);
      setStagedOpenings(parsed.openings || []);
      setStep("staging");
    } finally {
      setUploading(false);
    }
  }

  function updateStagedRoom(index: number, field: string, value: any) {
    setStagedRooms((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function addStagedRoom() {
    setStagedRooms((prev) => [
      ...prev,
      {
        name: `Bonus Guest Suite ${prev.length + 1}`,
        floorLevel: "Main Level",
        lengthFt: 15,
        widthFt: 14,
        ceilingHeightFt: 10,
        gridX: 40,
        gridZ: 30,
        pinX: 60,
        pinY: 70,
        hasRadiantSlab: true,
        hasExteriorCF8iWall: true,
        hasGarageFireWall: false,
        cf8iInteriorFinish: "Furred Drywall + Paint",
      },
    ]);
  }

  function removeStagedRoom(index: number) {
    setStagedRooms((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmAndGenerateProject() {
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "from-plan",
          name: projectName,
          clientName,
          clientEmail,
          siteAddress,
          totalAllowanceBudget,
          floorPlanUrl: uploadedFileUrl || "/titko-floorplan-preview.svg",
          interiorFramingType,
          rooms: stagedRooms,
          openings: stagedOpenings,
        }),
      });
      const data = await res.json();
      if (data.projectId) {
        onProjectCreated(data.projectId);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleCloneExistingProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "clone",
          sourceProjectId: cloneSourceId,
          name: cloneName,
          isTemplate: cloneAsTemplate,
        }),
      });
      const data = await res.json();
      if (data.projectId) {
        onProjectCreated(data.projectId);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Plan-to-Project Onboarding Wizard
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            New Project from Architectural Plans (PDF / Image) or Master
            Template
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
        >
          Close Wizard
        </button>
      </div>

      {step === "upload" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Option A: Upload Architectural Plan PDF / Image */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileUp className="w-4 h-4 text-amber-400" />
                Option 1: AI Architectural Plan Uploader (PDF / PNG / JPG)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Uploads your floor plan via{" "}
                <code className="text-amber-300">src/lib/storage.ts</code>{" "}
                (Supabase signed URL in cloud or{" "}
                <code className="text-amber-300">/public/uploads/</code>{" "}
                locally) and decomposes rooms, dimensions, Nuform{" "}
                <code className="text-amber-300">CF8i</code> exterior/garage
                fire walls, window/door schedules, and room selection
                checklists.
              </p>

              <label className="mt-4 flex flex-col items-center justify-center border-2 border-dashed border-amber-500/40 hover:border-amber-400 rounded-xl p-8 cursor-pointer bg-slate-900/50 transition">
                <FileUp className="w-8 h-8 text-amber-400 mb-2" />
                <span className="text-sm font-semibold text-white">
                  Click to Upload Architectural Floor Plan (PDF, PNG, JPG)
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Supports multi-sheet architectural PDF sets & blueprint scans
                </span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileSelected}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Want to test decomposition immediately?
              </span>
              <button
                type="button"
                disabled={uploading}
                onClick={() => runUploadAndParse()}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Decomposing Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Run Smart Demo Plan Decomposition
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Option B: Clone Existing Project or Master Build Template */}
          <form
            onSubmit={handleCloneExistingProject}
            className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-sky-400" />
                Option 2: Clone Existing Build or Save Master Template
              </h3>
              <p className="text-xs text-slate-400">
                Duplicate all rooms, Nuform CF8i wall rules, window/door
                schedules, and baseline allowances from an existing project or
                template.
              </p>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Source Project / Master Template
                </label>
                <select
                  value={cloneSourceId}
                  onChange={(e) => setCloneSourceId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {existingProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.isTemplate ? "[MASTER TEMPLATE] " : ""}
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  New Project / Template Title
                </label>
                <input
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={cloneAsTemplate}
                  onChange={(e) => setCloneAsTemplate(e.target.checked)}
                  className="accent-amber-500"
                />
                Save as reusable KO Builders Master Build Template
              </label>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              {creating ? "Cloning Project..." : "Clone Project & Schedule"}
            </button>
          </form>
        </div>
      ) : (
        /* Step 2: Interactive Decomposition Review Staging Screen */
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-emerald-200">
                  Architectural Plan Decomposed Successfully ({uploadedFileName}
                  )
                </div>
                <div className="text-[11px] text-slate-300">
                  Parser Engine:{" "}
                  <span className="font-mono text-amber-300">
                    {parserMetadata?.modelUsed}
                  </span>{" "}
                  — Review and tweak extracted rooms, dimensions, and CF8i wall
                  classifications below before generating the full project
                  schedule.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={addStagedRoom}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Room Row
            </button>
          </div>

          {/* Project Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Project Name</label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Client Name</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Site Address</label>
              <input
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">
                Interior 2x4 Framing Baseline
              </label>
              <select
                value={interiorFramingType}
                onChange={(e) => setInteriorFramingType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="2x4 Light-Gauge Metal Framing">
                  2x4 Light-Gauge Metal Framing (Optimal)
                </option>
                <option value="2x4 Wood Framing">
                  2x4 Wood Framing (Value-Engineered)
                </option>
              </select>
            </div>
          </div>

          {/* Editable Staging Table for Extracted Rooms */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <th className="py-2.5 px-3">Extracted Room Name</th>
                  <th className="py-2.5 px-2">Length (ft)</th>
                  <th className="py-2.5 px-2">Width (ft)</th>
                  <th className="py-2.5 px-2">Clg (ft)</th>
                  <th className="py-2.5 px-2">Computed Area</th>
                  <th className="py-2.5 px-2">CF8i Ext</th>
                  <th className="py-2.5 px-2">2-Hr Fire Wall</th>
                  <th className="py-2.5 px-2">Radiant Slab</th>
                  <th className="py-2.5 px-3">CF8i Interior Wall Finish</th>
                  <th className="py-2.5 px-2 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {stagedRooms.map((room, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3">
                      <input
                        value={room.name}
                        onChange={(e) =>
                          updateStagedRoom(idx, "name", e.target.value)
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={room.lengthFt}
                        onChange={(e) =>
                          updateStagedRoom(
                            idx,
                            "lengthFt",
                            Number(e.target.value)
                          )
                        }
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={room.widthFt}
                        onChange={(e) =>
                          updateStagedRoom(
                            idx,
                            "widthFt",
                            Number(e.target.value)
                          )
                        }
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={room.ceilingHeightFt}
                        onChange={(e) =>
                          updateStagedRoom(
                            idx,
                            "ceilingHeightFt",
                            Number(e.target.value)
                          )
                        }
                        className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </td>
                    <td className="py-2 px-2 font-mono text-amber-300">
                      {(Number(room.lengthFt) * Number(room.widthFt)).toFixed(0)}{" "}
                      sq ft
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={room.hasExteriorCF8iWall}
                        onChange={(e) =>
                          updateStagedRoom(
                            idx,
                            "hasExteriorCF8iWall",
                            e.target.checked
                          )
                        }
                        className="accent-amber-500"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={room.hasGarageFireWall}
                        onChange={(e) =>
                          updateStagedRoom(
                            idx,
                            "hasGarageFireWall",
                            e.target.checked
                          )
                        }
                        className="accent-red-500"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={room.hasRadiantSlab}
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
                        value={room.cf8iInteriorFinish}
                        onChange={(e) =>
                          updateStagedRoom(
                            idx,
                            "cf8iInteriorFinish",
                            e.target.value
                          )
                        }
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
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
                        onClick={() => removeStagedRoom(idx)}
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

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
            >
              ← Back to Upload
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={handleConfirmAndGenerateProject}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {creating
                ? "Generating Rooms, CF8i Schedule & Selection Checklists..."
                : "Confirm & Generate Full Project Schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
