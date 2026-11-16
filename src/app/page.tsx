"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  Unlock,
  Layers,
  Wrench,
  CalendarClock,
  Flame,
  Wind,
  ShieldCheck,
  Printer,
  FilePlus2,
  MessageSquare,
  Link2,
  PackageCheck,
  Sparkles,
  Plus,
  ExternalLink,
  Copy,
  Check,
  SlidersHorizontal,
  FileSpreadsheet,
} from "lucide-react";
import {
  PHASE_GATEWAYS,
  FRAMING_OPTIONS,
  HVAC_COOLING_OPTIONS,
  HVAC_VENTILATION_OPTIONS,
} from "@/lib/construction-rules";
import { FloorPlanCanvas } from "@/components/FloorPlanCanvas";
import { WindowDoorSchedule } from "@/components/WindowDoorSchedule";
import { PlanUploadWizard } from "@/components/PlanUploadWizard";

type ContextMode =
  | "ROOM_MATRIX"
  | "TRADE_MATRIX"
  | "PHASE_TIMELINE"
  | "FLOOR_PLAN"
  | "OPENING_SCHEDULE"
  | "CHANGE_ORDERS";

export default function KOPortalPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectData, setProjectData] = useState<any | null>(null);
  const [tradeCategories, setTradeCategories] = useState<any[]>([]);
  const [catalogPresets, setCatalogPresets] = useState<any[]>([]);
  const [activeRole, setActiveRole] = useState<
    "BUILDER_ADMIN" | "HOMEOWNER" | "SUBCONTRACTOR"
  >("BUILDER_ADMIN");
  const [demoSwitcherEnabled, setDemoSwitcherEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Navigation & Filtering State
  const [contextMode, setContextMode] = useState<ContextMode>("ROOM_MATRIX");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("ALL");
  const [selectedTradeSlug, setSelectedTradeSlug] = useState<string>("ALL");
  const [selectedPhase, setSelectedPhase] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Interactive States
  const [showPlanWizard, setShowPlanWizard] = useState<boolean>(false);
  const [showCustomEntryModal, setShowCustomEntryModal] =
    useState<boolean>(false);
  const [expandedCommentsId, setExpandedCommentsId] = useState<string | null>(
    null
  );
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [approvalInitials, setApprovalInitials] = useState<string>("JRT");
  const [copiedMagicLink, setCopiedMagicLink] = useState<boolean>(false);

  // Custom Product / Web Clipper Form State
  const [customComponentName, setCustomComponentName] = useState("");
  const [customManufacturer, setCustomManufacturer] = useState("");
  const [customProductName, setCustomProductName] = useState("");
  const [customSku, setCustomSku] = useState("");
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#D97706");
  const [customPhase, setCustomPhase] = useState<string>(PHASE_GATEWAYS[2]);
  const [customRoomId, setCustomRoomId] = useState<string>("");
  const [customTradeId, setCustomTradeId] = useState<string>("");
  const [customUnitType, setCustomUnitType] = useState<string>("each");
  const [customQty, setCustomQty] = useState<number>(1);
  const [customUnitCost, setCustomUnitCost] = useState<number>(450);
  const [customAllowance, setCustomAllowance] = useState<number>(400);
  const [customIsOfci, setCustomIsOfci] = useState<boolean>(false);
  const [customIsRadiantOk, setCustomIsRadiantOk] = useState<boolean>(true);
  const [customProductUrl, setCustomProductUrl] = useState<string>("");
  const [customInstallNotes, setCustomInstallNotes] = useState<string>("");

  async function loadInitialList() {
    setLoading(true);
    try {
      const [projRes, authRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/auth"),
      ]);
      const projData = await projRes.json();
      const authData = await authRes.json();

      const list = projData.projects || [];
      setProjects(list);
      setTradeCategories(projData.tradeCategories || []);
      setCatalogPresets(projData.catalogPresets || []);
      setDemoSwitcherEnabled(authData.demoSwitcherEnabled ?? true);

      const initialRole =
        authData.currentUser?.role ||
        projData.sessionUser?.role ||
        "BUILDER_ADMIN";
      setActiveRole(initialRole);

      const defaultProj =
        list.find((p: any) => !p.isTemplate) || list[0] || null;
      if (defaultProj) {
        setSelectedProjectId(defaultProj.id);
        await loadProjectDetail(defaultProj.id, initialRole);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectDetail(projectId: string, roleOverride?: string) {
    const roleToUse = roleOverride || activeRole;
    const res = await fetch(
      `/api/projects/${projectId}?role=${encodeURIComponent(roleToUse)}`
    );
    const data = await res.json();
    if (data.project) {
      setProjectData(data.project);
      if (data.project.rooms?.length > 0 && !customRoomId) {
        setCustomRoomId(data.project.rooms[0].id);
      }
    }
  }

  useEffect(() => {
    loadInitialList();
  }, []);

  async function handleRoleSwitch(
    newRole: "BUILDER_ADMIN" | "HOMEOWNER" | "SUBCONTRACTOR"
  ) {
    setActiveRole(newRole);
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (selectedProjectId) {
      await loadProjectDetail(selectedProjectId, newRole);
    }
  }

  async function handleProjectBaselineChange(field: string, value: any) {
    if (!projectData) return;
    await fetch(`/api/projects/${projectData.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    await loadProjectDetail(projectData.id);
  }

  async function handleApplyPreset(selectionId: string, presetId: string) {
    if (!presetId || !projectData) return;
    await fetch(`/api/selections/${selectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply_preset", presetId }),
    });
    await loadProjectDetail(projectData.id);
  }

  async function handleApproveAndLockItem(selectionId: string) {
    if (!projectData) return;
    await fetch(`/api/selections/${selectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_lock",
        initials: approvalInitials || "JRT",
      }),
    });
    await loadProjectDetail(projectData.id);
  }

  async function handleUnlockItem(selectionId: string) {
    if (!projectData) return;
    await fetch(`/api/selections/${selectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock" }),
    });
    await loadProjectDetail(projectData.id);
  }

  async function handleToggleOfci(selectionId: string, currentVal: boolean) {
    if (!projectData) return;
    await fetch(`/api/selections/${selectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOwnerFurnished: !currentVal }),
    });
    await loadProjectDetail(projectData.id);
  }

  async function handleBuilderOverrideWarning(selectionId: string) {
    if (!projectData) return;
    await fetch(`/api/selections/${selectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        builderOverrideNote:
          "Builder Admin verified moisture barrier / thermal assembly override.",
        status: "Option Selected",
      }),
    });
    await loadProjectDetail(projectData.id);
  }

  async function handleBulkApproveRoom(roomIdToLock: string) {
    if (!projectData) return;
    await fetch("/api/selections/bulk-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: projectData.id,
        roomId: roomIdToLock,
        initials: approvalInitials || "JRT",
      }),
    });
    await loadProjectDetail(projectData.id);
  }

  async function handlePostComment(selectionId: string) {
    if (!commentDraft.trim() || !projectData) return;
    const authorName =
      activeRole === "BUILDER_ADMIN"
        ? "Kevin O'Connor (KO Builders)"
        : activeRole === "HOMEOWNER"
        ? "JR & Candy Titko (Homeowner)"
        : "Mike Vance (Subcontractor)";

    await fetch(`/api/selections/${selectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_comment",
        authorName,
        authorRole: activeRole,
        commentBody: commentDraft,
      }),
    });
    setCommentDraft("");
    await loadProjectDetail(projectData.id);
  }

  async function handleCreateCustomSelection(e: React.FormEvent) {
    e.preventDefault();
    if (!projectData) return;
    await fetch("/api/selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: projectData.id,
        roomId: customRoomId || projectData.rooms[0]?.id,
        tradeCategoryId: customTradeId || tradeCategories[0]?.id,
        phaseGateway: customPhase,
        componentName: customComponentName,
        manufacturer: customManufacturer || "Custom Brand",
        productName: customProductName || "Custom Specified Product",
        sku: customSku || "CUST-01",
        colorName: customColorName || "Custom Finish",
        colorHex: customColorHex,
        productUrl: customProductUrl || null,
        installNotes: customInstallNotes || null,
        unitType: customUnitType,
        takeoffQty: customQty,
        unitCost: customIsOfci ? 0 : customUnitCost,
        allowanceAmount: customAllowance,
        isOwnerFurnished: customIsOfci,
        isRadiantFloorApproved: customIsRadiantOk,
      }),
    });
    setShowCustomEntryModal(false);
    setCustomComponentName("");
    await loadProjectDetail(projectData.id);
  }

  const isSubcontractor = activeRole === "SUBCONTRACTOR";
  const isBuilderAdmin = activeRole === "BUILDER_ADMIN";

  // Filtered Selections
  const filteredSelections = useMemo(() => {
    const all = projectData?.selections || [];
    return all.filter((item: any) => {
      if (selectedRoomId !== "ALL" && item.roomId !== selectedRoomId) {
        return false;
      }
      if (
        selectedTradeSlug !== "ALL" &&
        item.tradeCategory?.slug !== selectedTradeSlug
      ) {
        return false;
      }
      if (selectedPhase !== "ALL" && item.phaseGateway !== selectedPhase) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${item.componentName} ${item.manufacturer} ${item.productName} ${item.sku} ${item.colorName} ${item.room?.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    projectData?.selections,
    selectedRoomId,
    selectedTradeSlug,
    selectedPhase,
    searchQuery,
  ]);

  // Summary Analytics (Financials stripped in SUBCONTRACTOR mode)
  const analytics = useMemo(() => {
    const all = projectData?.selections || [];
    const totalCount = all.length;
    const lockedCount = all.filter(
      (s: any) => s.status === "Client Approved & Locked"
    ).length;
    const warningCount = all.filter(
      (s: any) =>
        s.computedStatus === "Compatibility Warning" ||
        s.computedStatus === "Lead-Time Warning" ||
        Boolean(s.radiantWarning) ||
        Boolean(s.leadTimeWarning)
    ).length;

    const totalAllowance = all.reduce(
      (acc: number, s: any) => acc + (Number(s.allowanceAmount) || 0),
      0
    );
    const totalExtended = all.reduce(
      (acc: number, s: any) => acc + (Number(s.extendedCost) || 0),
      0
    );
    const woodVeAdjustment =
      projectData?.interiorFramingType === "2x4 Wood Framing"
        ? Number(projectData?.framingWoodDelta || -4850)
        : 0;
    const netVariance = totalExtended - totalAllowance + woodVeAdjustment;

    const phaseBreakdown = PHASE_GATEWAYS.map((phase) => {
      const items = all.filter((s: any) => s.phaseGateway === phase);
      const locked = items.filter(
        (s: any) => s.status === "Client Approved & Locked"
      ).length;
      const pct =
        items.length > 0 ? Math.round((locked / items.length) * 100) : 100;
      return { phase, total: items.length, locked, pct };
    });

    return {
      totalCount,
      lockedCount,
      completionPct:
        totalCount > 0 ? Math.round((lockedCount / totalCount) * 100) : 0,
      warningCount,
      totalAllowance,
      totalExtended: totalExtended + woodVeAdjustment,
      woodVeAdjustment,
      netVariance,
      phaseBreakdown,
    };
  }, [projectData]);

  function copyMagicShareLink() {
    if (!projectData) return;
    const url = `${window.location.origin}/?token=${projectData.magicAccessToken}`;
    navigator.clipboard.writeText(url);
    setCopiedMagicLink(true);
    setTimeout(() => setCopiedMagicLink(false), 2500);
  }

  if (loading && !projectData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto animate-pulse">
            <Building2 className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-sm font-semibold text-white">
            Loading KO Builders Custom Home Selections & Takeoff Portal...
          </div>
          <div className="text-xs text-slate-400">
            Initializing Nuform ConForm CF8i, 2x4 Framing & Hydronic Radiant
            Rules Engine
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation & Demo Role Switcher Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Active Project Selector */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-amber-500/20">
                KO
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white tracking-tight text-base">
                    KO BUILDERS
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    ICF & Solar-Ready Design Studio
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Custom Home Selections, Takeoff & Trade Specification Portal
                </p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            {/* Project Picker */}
            <div className="flex items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setSelectedProjectId(id);
                  setSelectedRoomId("ALL");
                  await loadProjectDetail(id);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-white focus:border-amber-400 outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.isTemplate ? "★ [TEMPLATE] " : "🏠 "}
                    {p.name}
                  </option>
                ))}
              </select>

              {isBuilderAdmin && (
                <button
                  type="button"
                  onClick={() => setShowPlanWizard(!showPlanWizard)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  New Build from Plans (PDF/AI)
                </button>
              )}

              {!isSubcontractor && (
                <button
                  type="button"
                  onClick={copyMagicShareLink}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 border border-slate-700"
                  title="Copy Homeowner Magic Approval Link"
                >
                  {copiedMagicLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Magic Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Share Magic Link</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Environment-Gated Top-Bar Demo Role Switcher */}
          {demoSwitcherEnabled && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2">
                Demo Role Switcher:
              </span>
              <button
                type="button"
                onClick={() => handleRoleSwitch("BUILDER_ADMIN")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeRole === "BUILDER_ADMIN"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                1. Builder Admin (KO)
              </button>
              <button
                type="button"
                onClick={() => handleRoleSwitch("HOMEOWNER")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeRole === "HOMEOWNER"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                2. Homeowner (Titkos)
              </button>
              <button
                type="button"
                onClick={() => handleRoleSwitch("SUBCONTRACTOR")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeRole === "SUBCONTRACTOR"
                    ? "bg-sky-500 text-slate-950 shadow"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                3. Subcontractor (Zero Pricing)
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* AI Plan Uploader & Project Onboarding Wizard Drawer */}
        {showPlanWizard && (
          <PlanUploadWizard
            existingProjects={projects}
            onClose={() => setShowPlanWizard(false)}
            onProjectCreated={async (newId) => {
              setShowPlanWizard(false);
              await loadInitialList();
              setSelectedProjectId(newId);
              await loadProjectDetail(newId);
            }}
          />
        )}

        {/* Subcontractor Zero-Pricing Security Banner */}
        {isSubcontractor && (
          <div className="bg-sky-500/10 border border-sky-500/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  Subcontractor Field Specification Mode Active (Strict
                  Zero-Pricing Rule Enforced)
                </span>
                <p className="text-xs text-slate-300">
                  All dollar allowances, unit prices, markups, and budget
                  variances are stripped at the API & view layer. Displaying
                  exact room locations, Nuform CF8i & 2x4 framing details,
                  takeoff quantities (incl. waste), SKUs, rough-in heights, and
                  OFCI flags.
                </p>
              </div>
            </div>
            <Link
              href={`/projects/${projectData?.id}/print/trade-packet`}
              className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Field Trade Packet
            </Link>
          </div>
        )}

        {/* Project Header, Structural & HVAC Assembly Toggles, and Live Budget/Phase Metrics */}
        {projectData && (
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Left 8 Columns: Project Identity & Structural/HVAC Baselines */}
            <div className="xl:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-white">
                      {projectData.name}
                    </h1>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                      Target Occupancy:{" "}
                      {new Date(
                        projectData.targetOccupancyDate
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Client:{" "}
                    <strong className="text-slate-200">
                      {projectData.clientName}
                    </strong>{" "}
                    • Site:{" "}
                    <span className="text-slate-300">
                      {projectData.siteAddress}
                    </span>
                  </p>
                </div>

                {/* Print & Export Suite Links */}
                <div className="flex flex-wrap items-center gap-2">
                  {!isSubcontractor && (
                    <Link
                      href={`/projects/${projectData.id}/print/master-takeoff`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 font-medium flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Master Takeoff & Bid Sheet
                    </Link>
                  )}
                  <Link
                    href={`/projects/${projectData.id}/print/trade-packet`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-300 font-medium flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Subcontractor Trade Packet
                  </Link>
                  {!isSubcontractor && (
                    <Link
                      href={`/projects/${projectData.id}/print/closeout-binder`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-medium flex items-center gap-1.5"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      Homeowner Closeout Binder
                    </Link>
                  )}
                </div>
              </div>

              {/* Structural & MEP System Baselines Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Nuform CF8i Exterior & Garage Fire Separation */}
                <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Exterior & Garage Fire Wall
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      2-Hr ASTM E119
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1">
                    {projectData.envelopeWallSystem}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    <code className="text-amber-300">7-7/8&quot;</code> total (
                    <code className="text-slate-200">5.47&quot;</code> concrete
                    core + <code className="text-slate-200">2.13&quot;</code>{" "}
                    exterior polyurethane foam + washable polymer shell).
                  </p>
                </div>

                {/* 2. Interior 2x4 Framing Toggle (Metal vs Wood) */}
                <div className="bg-slate-950/90 border border-sky-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                        Interior Partition Framing Toggle
                      </span>
                      {!isSubcontractor && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {projectData.interiorFramingType ===
                          "2x4 Wood Framing"
                            ? "VE -$4,850 Applied"
                            : "Optimal Baseline"}
                        </span>
                      )}
                    </div>
                    <select
                      disabled={isSubcontractor}
                      value={projectData.interiorFramingType}
                      onChange={(e) =>
                        handleProjectBaselineChange(
                          "interiorFramingType",
                          e.target.value
                        )
                      }
                      className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
                    >
                      {FRAMING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {projectData.interiorFramingType.includes("Metal")
                      ? "20-ga EQ studs: Auto-adds grommet & 16-ga steel backing plate trade notes."
                      : "Value-Engineered 2x4 Wood Studs: Standard solid wood blocking & nail plates."}
                  </p>
                </div>

                {/* 3. Hydronic Radiant & Airtight HVAC / IAQ */}
                <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      Hydronic Slab & IAQ Core
                    </span>
                    <Wind className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {projectData.hvacPrimaryHeat}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                    <select
                      disabled={isSubcontractor}
                      value={projectData.hvacCoolingSystem}
                      onChange={(e) =>
                        handleProjectBaselineChange(
                          "hvacCoolingSystem",
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                    >
                      {HVAC_COOLING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          Cooling: {opt}
                        </option>
                      ))}
                    </select>
                    <select
                      disabled={isSubcontractor}
                      value={projectData.hvacVentilationIaq}
                      onChange={(e) =>
                        handleProjectBaselineChange(
                          "hvacVentilationIaq",
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                    >
                      {HVAC_VENTILATION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          IAQ: {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Live Allowance & Phase Completion Dashboard */}
            <div className="xl:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
              {!isSubcontractor ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Live Allowance & Variance Tracker
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {analytics.lockedCount}/{analytics.totalCount} Locked (
                      {analytics.completionPct}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase text-slate-400">
                        Allowance Baseline
                      </div>
                      <div className="text-sm font-bold font-mono text-white mt-0.5">
                        ${analytics.totalAllowance.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase text-slate-400">
                        Selected Total
                      </div>
                      <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">
                        ${analytics.totalExtended.toLocaleString()}
                      </div>
                    </div>
                    <div
                      className={`border rounded-xl p-3 ${
                        analytics.netVariance > 0
                          ? "bg-red-500/10 border-red-500/40"
                          : "bg-emerald-500/10 border-emerald-500/40"
                      }`}
                    >
                      <div className="text-[10px] uppercase text-slate-300">
                        Net Variance
                      </div>
                      <div
                        className={`text-sm font-bold font-mono mt-0.5 ${
                          analytics.netVariance > 0
                            ? "text-red-300"
                            : "text-emerald-300"
                        }`}
                      >
                        {analytics.netVariance > 0 ? "+" : ""}
                        ${analytics.netVariance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Field Execution Readiness Summary
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase text-slate-400">
                        Client-Locked Specs
                      </div>
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        {analytics.lockedCount} / {analytics.totalCount}
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase text-slate-400">
                        Active Field Alerts
                      </div>
                      <div className="text-lg font-bold font-mono text-amber-400">
                        {analytics.warningCount}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase Gate Progress Bars */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-300">
                  Construction Phase Gate Sign-Off Progress
                </div>
                {analytics.phaseBreakdown.map((pb) => (
                  <div key={pb.phase} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 truncate max-w-[260px]">
                        {pb.phase}
                      </span>
                      <span className="font-mono text-slate-400">
                        {pb.locked}/{pb.total} ({pb.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all"
                        style={{ width: `${pb.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Dual-Context Workspace Mode Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setContextMode("ROOM_MATRIX")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                contextMode === "ROOM_MATRIX"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              View A: Room-by-Room Matrix
            </button>
            <button
              type="button"
              onClick={() => setContextMode("TRADE_MATRIX")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                contextMode === "TRADE_MATRIX"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              View B: Trade-by-Trade Specs
            </button>
            <button
              type="button"
              onClick={() => setContextMode("PHASE_TIMELINE")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                contextMode === "PHASE_TIMELINE"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              View C: Phase Gate Timeline
            </button>
            <button
              type="button"
              onClick={() => setContextMode("FLOOR_PLAN")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                contextMode === "FLOOR_PLAN"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Interactive 2D Floor Plan & Takeoff
            </button>
            <button
              type="button"
              onClick={() => setContextMode("OPENING_SCHEDULE")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                contextMode === "OPENING_SCHEDULE"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Window & Door Schedule (CF8i)
            </button>
            {!isSubcontractor && (
              <button
                type="button"
                onClick={() => setContextMode("CHANGE_ORDERS")}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  contextMode === "CHANGE_ORDERS"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Allowance Overages / Change Orders
              </button>
            )}
          </div>

          {!isSubcontractor && (
            <button
              type="button"
              onClick={() => setShowCustomEntryModal(true)}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Custom Product / Web Clipper
            </button>
          )}
        </div>

        {/* Custom Product / Web Clipper Modal */}
        {showCustomEntryModal && projectData && (
          <form
            onSubmit={handleCreateCustomSelection}
            className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Add Custom Product Specification / Web Clipper Entry
                </h3>
                <p className="text-xs text-slate-400">
                  Clip any custom product URL, set Owner-Furnished (OFCI) or
                  TBD Allowance placeholders, and validate radiant-floor
                  compatibility.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomEntryModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Room</label>
                <select
                  value={customRoomId}
                  onChange={(e) => setCustomRoomId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                >
                  {projectData.rooms.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Trade Category
                </label>
                <select
                  value={customTradeId}
                  onChange={(e) => setCustomTradeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                >
                  {tradeCategories.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">
                  Construction Phase Gateway
                </label>
                <select
                  value={customPhase}
                  onChange={(e) => setCustomPhase(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                >
                  {PHASE_GATEWAYS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Component Title
                </label>
                <input
                  required
                  placeholder="e.g. Scullery Prep Faucet"
                  value={customComponentName}
                  onChange={(e) => setCustomComponentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Manufacturer</label>
                <input
                  placeholder="e.g. Brizo / Kohler"
                  value={customManufacturer}
                  onChange={(e) => setCustomManufacturer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Product Model Name
                </label>
                <input
                  placeholder="e.g. Litze Articulating Prep Faucet"
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">SKU</label>
                <input
                  placeholder="e.g. 64063LF-GL"
                  value={customSku}
                  onChange={(e) => setCustomSku(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Finish / Color Name & Swatch
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    className="w-9 h-9 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                  />
                  <input
                    placeholder="Brushed Luxe Gold"
                    value={customColorName}
                    onChange={(e) => setCustomColorName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Quantity & Unit Type
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={customQty}
                    onChange={(e) => setCustomQty(Number(e.target.value))}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono"
                  />
                  <select
                    value={customUnitType}
                    onChange={(e) => setCustomUnitType(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white"
                  >
                    <option value="each">each</option>
                    <option value="sq ft">sq ft</option>
                    <option value="lin ft">lin ft</option>
                    <option value="allowance lump sum">lump sum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Unit Cost ($) / Allowance ($)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    disabled={customIsOfci}
                    value={customIsOfci ? 0 : customUnitCost}
                    onChange={(e) => setCustomUnitCost(Number(e.target.value))}
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono"
                  />
                  <input
                    type="number"
                    value={customAllowance}
                    onChange={(e) => setCustomAllowance(Number(e.target.value))}
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center gap-1.5 pt-3">
                <label className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={customIsOfci}
                    onChange={(e) => setCustomIsOfci(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Owner-Furnished (OFCI — $0 Builder Cost)
                </label>
                <label className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={customIsRadiantOk}
                    onChange={(e) => setCustomIsRadiantOk(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  Hydronic Radiant Slab Approved
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">
                  Web Clipper Product URL (Optional)
                </label>
                <input
                  placeholder="https://..."
                  value={customProductUrl}
                  onChange={(e) => setCustomProductUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">
                  Field Rough-In & Installation Notes
                </label>
                <input
                  placeholder="Mounting height, backing plate, or CF8i sleeve instructions..."
                  value={customInstallNotes}
                  onChange={(e) => setCustomInstallNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Save Specification to Project
              </button>
            </div>
          </form>
        )}

        {/* Mode-Specific Views */}
        {contextMode === "FLOOR_PLAN" && projectData ? (
          <FloorPlanCanvas
            rooms={projectData.rooms || []}
            selectedRoomId={
              selectedRoomId === "ALL"
                ? projectData.rooms?.[0]?.id
                : selectedRoomId
            }
            onSelectRoom={(id) => setSelectedRoomId(id)}
            canEdit={!isSubcontractor}
            onRoomUpdated={() => loadProjectDetail(projectData.id)}
            interiorFramingType={projectData.interiorFramingType}
          />
        ) : contextMode === "OPENING_SCHEDULE" && projectData ? (
          <WindowDoorSchedule
            projectId={projectData.id}
            rooms={projectData.rooms || []}
            openings={projectData.openings || []}
            canEdit={!isSubcontractor}
            onScheduleUpdated={() => loadProjectDetail(projectData.id)}
          />
        ) : contextMode === "CHANGE_ORDERS" && !isSubcontractor ? (
          /* Allowance Overage / Change Order Generator View */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Allowance Overage & Client Change Order Summary
                </h3>
                <p className="text-xs text-slate-400">
                  Automatically aggregates selections that exceed their carrying
                  allowance, plus the project-level{" "}
                  <code className="text-sky-300">2x4</code> Metal vs. Wood
                  framing adjustment.
                </p>
              </div>
              <Link
                href={`/projects/${projectData?.id}/print/master-takeoff`}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Change Order & Takeoff Sheet
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3">Component & Selected SKU</th>
                    <th className="py-2.5 px-3">Status & Approval</th>
                    <th className="py-2.5 px-3 text-right">Allowance</th>
                    <th className="py-2.5 px-3 text-right">Extended Cost</th>
                    <th className="py-2.5 px-3 text-right">
                      Variance (Delta)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(projectData?.selections || [])
                    .filter((s: any) => s.variance !== 0)
                    .map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-medium text-white">
                          {s.room?.name}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-100">
                            {s.componentName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {s.manufacturer} — {s.productName} ({s.sku})
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px]">
                            {s.status}
                          </span>
                          {s.approvedByInitials && (
                            <span className="ml-2 text-[11px] font-mono text-emerald-400">
                              Signed: {s.approvedByInitials}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          ${Number(s.allowanceAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-white">
                          ${Number(s.extendedCost).toLocaleString()}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono font-bold ${
                            s.variance > 0 ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {s.variance > 0 ? "+" : ""}$
                          {Number(s.variance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Dual-Context Matrix (Room × Trade × Phase) */
          <div className="space-y-5">
            {/* Filter Bar + Bulk Room Approval Action */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Room Filter */}
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="ALL">All Rooms ({projectData?.rooms?.length || 0})</option>
                  {(projectData?.rooms || []).map((r: any) => (
                    <option key={r.id} value={r.id}>
                      Room: {r.name}
                    </option>
                  ))}
                </select>

                {/* Trade Filter */}
                <select
                  value={selectedTradeSlug}
                  onChange={(e) => setSelectedTradeSlug(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="ALL">All Trade Categories (11)</option>
                  {tradeCategories.map((t) => (
                    <option key={t.id} value={t.slug}>
                      Trade: {t.name}
                    </option>
                  ))}
                </select>

                {/* Phase Gateway Filter */}
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="ALL">All Construction Phases (1–4)</option>
                  {PHASE_GATEWAYS.map((ph) => (
                    <option key={ph} value={ph}>
                      {ph}
                    </option>
                  ))}
                </select>

                {/* Search Input */}
                <input
                  type="search"
                  placeholder="Search SKU, room, finish, Brizo, Nuform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white w-60"
                />
              </div>

              {/* Digital Initials & Bulk Room Sign-Off */}
              {!isSubcontractor && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
                    <span className="text-[10px] uppercase text-slate-400">
                      Sign-Off Initials:
                    </span>
                    <input
                      value={approvalInitials}
                      onChange={(e) =>
                        setApprovalInitials(e.target.value.toUpperCase())
                      }
                      maxLength={4}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-amber-300 text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBulkApproveRoom(selectedRoomId)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {selectedRoomId === "ALL"
                      ? "Approve & Lock All Compatible Items"
                      : "Approve & Lock All Selected Items in Room"}
                  </button>
                </div>
              )}
            </div>

            {/* Selection Cards List */}
            <div className="space-y-3">
              {filteredSelections.map((item: any) => {
                const isLocked = item.status === "Client Approved & Locked";
                const hasRadiantWarning = Boolean(item.radiantWarning);
                const hasLeadWarning = Boolean(item.leadTimeWarning);
                const matchingPresets = catalogPresets.filter(
                  (p) => p.tradeSlug === item.tradeCategory?.slug
                );

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900/95 border rounded-2xl p-5 shadow-lg transition ${
                      hasRadiantWarning
                        ? "border-red-500/70 bg-red-950/10"
                        : isLocked
                        ? "border-emerald-500/40"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Top Badge Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-amber-300 text-xs font-semibold">
                          {item.room?.name}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800/90 text-sky-300 text-xs">
                          {item.tradeCategory?.name}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-mono">
                          {item.phaseGateway}
                        </span>

                        {item.isOwnerFurnished && (
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-semibold">
                            OFCI (Owner-Furnished / Contractor-Installed)
                          </span>
                        )}

                        {item.room?.hasRadiantSlab && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 ${
                              item.isRadiantFloorApproved
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-300 border border-red-500/50"
                            }`}
                          >
                            <Flame className="w-3 h-3" />
                            {item.isRadiantFloorApproved
                              ? "Radiant Slab Certified"
                              : "Unapproved for Radiant Slab"}
                          </span>
                        )}
                      </div>

                      {/* Status Pill & Lock Timestamp */}
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5" />
                            Client Approved & Locked ({item.approvedByInitials}{" "}
                            •{" "}
                            {item.approvedAt
                              ? new Date(item.approvedAt).toLocaleDateString()
                              : "Signed"}
                            )
                          </span>
                        ) : hasRadiantWarning ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Radiant Slab Compatibility Warning
                          </span>
                        ) : hasLeadWarning ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            Lead-Time Gate Warning
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium">
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compatibility or Lead-Time Alert Callout */}
                    {(hasRadiantWarning || hasLeadWarning) && (
                      <div className="mt-3 bg-red-500/15 border border-red-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>
                            {item.radiantWarning || item.leadTimeWarning}
                          </span>
                        </div>
                        {isBuilderAdmin && (
                          <button
                            type="button"
                            onClick={() => handleBuilderOverrideWarning(item.id)}
                            className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-red-400/40 text-[11px] font-semibold text-amber-300"
                          >
                            Builder Override Warning
                          </button>
                        )}
                      </div>
                    )}

                    {/* Paired Component Dependency Callout (`parentItem` or `pairedChildren`) */}
                    {(item.parentItem ||
                      (item.pairedChildren &&
                        item.pairedChildren.length > 0)) && (
                      <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2 flex flex-wrap items-center gap-2 text-xs text-amber-200">
                        <Link2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-semibold">
                          Paired Rough-In / Trim Dependency:
                        </span>
                        {item.parentItem && (
                          <span>
                            Requires{" "}
                            <strong className="text-white">
                              {item.parentItem.componentName} (
                              {item.parentItem.sku})
                            </strong>{" "}
                            in{" "}
                            <span className="underline">
                              {item.parentItem.phaseGateway}
                            </span>
                          </span>
                        )}
                        {item.pairedChildren?.map((child: any) => (
                          <span key={child.id}>
                            Paired with Phase 4 Trim:{" "}
                            <strong className="text-white">
                              {child.componentName} ({child.sku})
                            </strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Main Body Grid */}
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      {/* Swatch + Product Spec (5 Cols) */}
                      <div className="lg:col-span-5 flex items-start gap-3.5">
                        <div
                          className="w-12 h-12 rounded-xl border border-slate-700 shrink-0 shadow-inner flex items-center justify-center text-[10px] font-mono font-bold text-slate-900"
                          style={{
                            backgroundColor: item.colorHex || "#CBD5E1",
                          }}
                          title={`Color Swatch: ${item.colorName} (${item.colorCode})`}
                        >
                          {item.colorCode?.slice(0, 6)}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">
                            {item.componentName}
                          </h4>
                          <div className="text-xs text-slate-200 font-medium">
                            {item.manufacturer} •{" "}
                            <span className="text-amber-300">
                              {item.productName}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                            <span>SKU: {item.sku}</span>
                            <span>•</span>
                            <span>
                              Color: {item.colorName} ({item.colorCode || "Std"})
                            </span>
                            <span>•</span>
                            <span>Finish: {item.finish}</span>
                          </div>
                          {item.productUrl && (
                            <a
                              href={item.productUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Clipped Product Spec Sheet
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Technical & Field Installation Specs (4 Cols) */}
                      <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span>
                            Takeoff Qty:{" "}
                            <strong className="font-mono text-white">
                              {item.takeoffQty} {item.unitType}
                            </strong>{" "}
                            {item.wasteFactorPct > 0 &&
                              `(+${item.wasteFactorPct}% waste = ${item.effectiveQty} ${item.unitType})`}
                          </span>
                          <span>
                            Lead Time:{" "}
                            <strong className="text-amber-300">
                              {item.leadTimeWeeks} wks
                            </strong>
                          </span>
                        </div>

                        {(item.mountingHeight ||
                          item.switchGroup ||
                          item.colorTempKelvin) && (
                          <div className="text-[11px] text-sky-300 font-mono">
                            {item.mountingHeight && (
                              <span>Mount: {item.mountingHeight} </span>
                            )}
                            {item.switchGroup && (
                              <span>| Switch: {item.switchGroup} </span>
                            )}
                            {item.colorTempKelvin && (
                              <span>| {item.colorTempKelvin}K LED</span>
                            )}
                          </div>
                        )}

                        {item.installNotes && (
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            <strong className="text-slate-400">
                              Field Note:
                            </strong>{" "}
                            {item.installNotes}
                          </p>
                        )}

                        {item.dynamicFramingNote && (
                          <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                            {item.dynamicFramingNote}
                          </p>
                        )}
                      </div>

                      {/* Pricing (Hidden in Subcontractor Mode) + Quick Actions (3 Cols) */}
                      <div className="lg:col-span-3 flex flex-col justify-between gap-2.5">
                        {!isSubcontractor && (
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-3 gap-1 text-center">
                            <div>
                              <div className="text-[10px] text-slate-400">
                                Allowance
                              </div>
                              <div className="text-xs font-mono font-semibold text-slate-200">
                                ${Number(item.allowanceAmount).toLocaleString()}
                              </div>
                            </div>
                            <div className="border-x border-slate-800">
                              <div className="text-[10px] text-slate-400">
                                Extended
                              </div>
                              <div className="text-xs font-mono font-semibold text-white">
                                ${Number(item.extendedCost).toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400">
                                Variance
                              </div>
                              <div
                                className={`text-xs font-mono font-bold ${
                                  item.variance > 0
                                    ? "text-red-400"
                                    : "text-emerald-400"
                                }`}
                              >
                                {item.variance > 0 ? "+" : ""}$
                                {Number(item.variance).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Catalog Preset Quick-Swap & Lock Controls */}
                        {!isSubcontractor && (
                          <div className="space-y-1.5">
                            {!isLocked && matchingPresets.length > 0 && (
                              <select
                                defaultValue=""
                                onChange={(e) =>
                                  handleApplyPreset(item.id, e.target.value)
                                }
                                className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-200"
                              >
                                <option value="" disabled>
                                  ✨ Swap from Master Finish Catalog...
                                </option>
                                {matchingPresets.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.manufacturer} — {p.productName} ($
                                    {p.unitCost}/{p.unitType}){" "}
                                    {p.isRadiantFloorApproved
                                      ? "[Radiant OK]"
                                      : "[Not Radiant OK]"}
                                  </option>
                                ))}
                              </select>
                            )}

                            <div className="flex items-center gap-1.5">
                              {!isLocked ? (
                                <button
                                  type="button"
                                  disabled={hasRadiantWarning}
                                  onClick={() =>
                                    handleApproveAndLockItem(item.id)
                                  }
                                  className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
                                    hasRadiantWarning
                                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                      : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                                  }`}
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  Approve & Lock
                                </button>
                              ) : (
                                isBuilderAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleUnlockItem(item.id)}
                                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    Unlock Spec
                                  </button>
                                )
                              )}

                              {!isLocked && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleOfci(
                                      item.id,
                                      item.isOwnerFurnished
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300"
                                  title="Toggle Owner-Furnished / Contractor-Installed (OFCI)"
                                >
                                  OFCI
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCommentsId(
                                    expandedCommentsId === item.id
                                      ? null
                                      : item.id
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                {item.comments?.length || 0}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item-Level Q&A Comment Thread */}
                    {(expandedCommentsId === item.id ||
                      (item.comments && item.comments.length > 0)) && (
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                        <div className="space-y-1.5">
                          {(item.comments || []).map((c: any) => (
                            <div
                              key={c.id}
                              className="bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs flex flex-wrap items-baseline justify-between gap-2"
                            >
                              <div>
                                <span className="font-bold text-amber-300">
                                  {c.authorName}:
                                </span>{" "}
                                <span className="text-slate-200">{c.body}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        {expandedCommentsId === item.id && (
                          <div className="flex gap-2">
                            <input
                              placeholder="Add a specification question or field note..."
                              value={commentDraft}
                              onChange={(e) => setCommentDraft(e.target.value)}
                              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handlePostComment(item.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
                            >
                              Post Note
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
