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
  Pencil,
  Palette,
  X,
  Loader2,
  Trash2,
  ClipboardPaste,
  Box,
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
import { ShowroomCatalogDrawer } from "@/components/ShowroomCatalogDrawer";
import { UpdateProjectPlansModal } from "@/components/UpdateProjectPlansModal";
import { House3DTourVisualizer } from "@/components/House3DTourVisualizer";
import { getDefaultProductMedia } from "@/lib/product-media";
import { uploadBlobViaStorageAdapter } from "@/lib/pdf-floorplan-extractor";

type ContextMode =
  | "ROOM_MATRIX"
  | "TRADE_MATRIX"
  | "PHASE_TIMELINE"
  | "FLOOR_PLAN"
  | "HOUSE_3D_TOUR"
  | "OPENING_SCHEDULE"
  | "CHANGE_ORDERS";

interface EditSpecFormState {
  id: string;
  roomId: string;
  roomName: string;
  tradeCategoryId: string;
  tradeName: string;
  phaseGateway: string;
  componentName: string;
  status: string;
  approvedByInitials: string | null;
  approvedAt: string | null;
  manufacturer: string;
  productName: string;
  sku: string;
  colorName: string;
  colorCode: string;
  colorHex: string;
  finish: string;
  takeoffQty: number;
  wasteFactorPct: number;
  unitCost: number;
  allowanceAmount: number;
  unitType: string;
  isOwnerFurnished: boolean;
  isRadiantFloorApproved: boolean;
  leadTimeWeeks: number;
  mountingHeight: string;
  switchGroup: string;
  colorTempKelvin: string;
  installNotes: string;
  swatchImageUrl: string;
  productUrl: string;
  vendorName: string;
}

export default function KOPortalPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectData, setProjectData] = useState<any | null>(null);
  const [tradeCategories, setTradeCategories] = useState<any[]>([]);
  const [catalogPresets, setCatalogPresets] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [showCatalogDrawer, setShowCatalogDrawer] = useState<boolean>(false);
  const [applyingCatalogItemId, setApplyingCatalogItemId] = useState<
    string | null
  >(null);
  const [showOverviewPinMap, setShowOverviewPinMap] = useState<boolean>(true);
  const [showUpdatePlansModal, setShowUpdatePlansModal] =
    useState<boolean>(false);
  const [copiedFieldLink, setCopiedFieldLink] = useState<boolean>(false);
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
  const [editingSpec, setEditingSpec] = useState<EditSpecFormState | null>(
    null
  );
  const [savingEditSpec, setSavingEditSpec] = useState<boolean>(false);
  const [uploadingSpecPhoto, setUploadingSpecPhoto] = useState<boolean>(false);
  const [specPhotoPasteNotice, setSpecPhotoPasteNotice] = useState<string>("");
  const [expandedCommentsId, setExpandedCommentsId] = useState<string | null>(
    null
  );
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [approvalInitials, setApprovalInitials] = useState<string>("JRT");
  const [copiedMagicLink, setCopiedMagicLink] = useState<boolean>(false);
  const [showShareLinksModal, setShowShareLinksModal] =
    useState<boolean>(false);
  const [copiedTradeSlug, setCopiedTradeSlug] = useState<string | null>(null);

  // Custom Product / Web Clipper Form State
  const [customComponentName, setCustomComponentName] = useState("");
  const [customManufacturer, setCustomManufacturer] = useState("");
  const [customProductName, setCustomProductName] = useState("");
  const [customSku, setCustomSku] = useState("");
  const [customFinish, setCustomFinish] = useState("Standard");
  const [customColorName, setCustomColorName] = useState("");
  const [customColorCode, setCustomColorCode] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#D97706");
  const [customSwatchImageUrl, setCustomSwatchImageUrl] = useState("");
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

  // Web Clipper Auto-Fill State
  const [clipperRawText, setClipperRawText] = useState<string>("");
  const [showClipperRawTextBox, setShowClipperRawTextBox] =
    useState<boolean>(false);
  const [showBookmarkletHelper, setShowBookmarkletHelper] =
    useState<boolean>(true);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState<boolean>(false);
  const [lastAppliedBookmarkletId, setLastAppliedBookmarkletId] =
    useState<string>("");
  const [clippingProduct, setClippingProduct] = useState<boolean>(false);
  const [clipperMessage, setClipperMessage] = useState<string>("");
  const [clipperBlocked, setClipperBlocked] = useState<boolean>(false);
  const [clipperHighlight, setClipperHighlight] = useState<boolean>(false);

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
      setCatalogItems(projData.catalogItems || []);
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
      `/api/projects/${projectId}?role=${encodeURIComponent(roleToUse)}&_t=${Date.now()}`,
      { cache: "no-store" }
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

  async function handleApplyCatalogItemFromDrawer(catItem: any) {
    if (!editingSpec || !projectData) return;
    setApplyingCatalogItemId(catItem.id);
    try {
      const media = getDefaultProductMedia({
        sku: catItem.sku,
        manufacturer: catItem.manufacturer,
        productName: catItem.productName,
        colorName: catItem.colorName,
        colorCode: catItem.colorCode,
        colorHex: catItem.colorHex,
      });

      setEditingSpec({
        ...editingSpec,
        manufacturer: catItem.manufacturer,
        productName: catItem.productName,
        sku: catItem.sku,
        colorName: catItem.colorName,
        colorCode: catItem.colorCode,
        colorHex: catItem.colorHex,
        finish: catItem.finish,
        unitCost: Number(catItem.unitCost) || 0,
        isRadiantFloorApproved: Boolean(catItem.isRadiantFloorApproved),
        installNotes: catItem.notes || editingSpec.installNotes,
        swatchImageUrl: media.swatchImageUrl,
        productUrl: media.productUrl,
        vendorName: media.vendorName,
      });

      await fetch(`/api/selections/${editingSpec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_catalog_item",
          catalogItemId: catItem.id,
        }),
      });

      setShowCatalogDrawer(false);
      await loadProjectDetail(projectData.id);
    } finally {
      setApplyingCatalogItemId(null);
    }
  }

  function getTradeScopedFieldUrl(tradeSlugOverride?: string): string {
    if (!projectData) return "#";
    const slug =
      tradeSlugOverride ||
      (selectedTradeSlug !== "ALL"
        ? selectedTradeSlug
        : tradeCategories[0]?.slug || "electrical-lighting");
    const hmacToken = projectData.tradeShareTokens?.[slug] || "";
    return `/trade-packet/${projectData.id}/${slug}?token=${encodeURIComponent(
      hmacToken
    )}`;
  }

  function handleCopyTokenizedFieldLink(tradeSlugOverride?: string) {
    if (!projectData) return;
    const slug =
      tradeSlugOverride ||
      (selectedTradeSlug !== "ALL"
        ? selectedTradeSlug
        : tradeCategories[0]?.slug || "electrical-lighting");
    const path = getTradeScopedFieldUrl(slug);
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    setCopiedFieldLink(true);
    setCopiedTradeSlug(slug);
    setTimeout(() => {
      setCopiedFieldLink(false);
      setCopiedTradeSlug(null);
    }, 2500);
  }
  function openEditSpecModal(item: any) {
    setEditingSpec({
      id: item.id,
      roomId: item.roomId || item.room?.id || projectData?.rooms?.[0]?.id || "",
      roomName: item.room?.name || "",
      tradeCategoryId:
        item.tradeCategoryId ||
        item.tradeCategory?.id ||
        tradeCategories[0]?.id ||
        "",
      tradeName: item.tradeCategory?.name || "",
      phaseGateway: item.phaseGateway || PHASE_GATEWAYS[2],
      componentName: item.componentName || item.productName || "",
      status: item.status || "Option Selected",
      approvedByInitials: item.approvedByInitials || null,
      approvedAt: item.approvedAt || null,
      manufacturer: item.manufacturer || "",
      productName: item.productName || "",
      sku: item.sku || "",
      colorName: item.colorName || "",
      colorCode: item.colorCode || "",
      colorHex: item.colorHex || "#CBD5E1",
      finish: item.finish || "Standard",
      takeoffQty: Number(item.takeoffQty) || 1,
      wasteFactorPct: Number(item.wasteFactorPct) || 0,
      unitCost: Number(item.unitCost) || 0,
      allowanceAmount: Number(item.allowanceAmount) || 0,
      unitType: item.unitType || "each",
      isOwnerFurnished: Boolean(item.isOwnerFurnished),
      isRadiantFloorApproved: Boolean(item.isRadiantFloorApproved),
      leadTimeWeeks: Number(item.leadTimeWeeks) || 4,
      mountingHeight: item.mountingHeight || "",
      switchGroup: item.switchGroup || "",
      colorTempKelvin:
        item.colorTempKelvin !== null && item.colorTempKelvin !== undefined
          ? String(item.colorTempKelvin)
          : "",
      installNotes: item.installNotes || "",
      swatchImageUrl: item.swatchImageUrl || "",
      productUrl: item.productUrl || "",
      vendorName: item.vendorName || item.manufacturer || "Vendor Direct",
    });
  }

  async function uploadSpecImageBlob(
    blobOrFile: Blob | File,
    customFileName?: string
  ) {
    setUploadingSpecPhoto(true);
    setSpecPhotoPasteNotice("Uploading product photo...");
    try {
      const ext = (blobOrFile.type.split("/")[1] || "png").replace(
        /[^a-z0-9]/gi,
        ""
      );
      const finalName =
        customFileName ||
        (blobOrFile instanceof File && blobOrFile.name
          ? blobOrFile.name
          : `pasted-product-${Date.now()}.${ext || "png"}`);
      const fileToUpload = new File([blobOrFile], finalName, {
        type: blobOrFile.type || "image/png",
      });

      const publicUrl = await uploadBlobViaStorageAdapter(
        fileToUpload,
        fileToUpload.name
      );

      setEditingSpec((prev) =>
        prev
          ? {
              ...prev,
              swatchImageUrl: publicUrl,
            }
          : prev
      );
      setSpecPhotoPasteNotice("Product image uploaded & applied!");
      setTimeout(() => setSpecPhotoPasteNotice(""), 3200);
    } catch (err: any) {
      setSpecPhotoPasteNotice(
        err?.message || "Failed to upload product image."
      );
    } finally {
      setUploadingSpecPhoto(false);
    }
  }

  async function handleUploadSpecPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingSpec) return;
    await uploadSpecImageBlob(file, file.name);
  }

  async function extractAndUploadFromClipboardItems(
    items: DataTransferItemList | undefined | null
  ): Promise<boolean> {
    if (!items) return false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) {
          const ext = (blob.type.split("/")[1] || "png").replace(
            /[^a-z0-9]/gi,
            ""
          );
          await uploadSpecImageBlob(
            blob,
            `pasted-product-${Date.now()}.${ext || "png"}`
          );
          return true;
        }
      }
    }
    return false;
  }

  async function handleModalPasteEvent(e: React.ClipboardEvent) {
    if (!editingSpec) return;
    const foundImage = await extractAndUploadFromClipboardItems(
      e.clipboardData?.items
    );
    if (foundImage) {
      e.preventDefault();
    }
  }

  async function handleClickPasteFromClipboard() {
    if (!editingSpec) return;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.read === "function") {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipItem of clipboardItems) {
          const imageType = clipItem.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await clipItem.getType(imageType);
            const ext = (imageType.split("/")[1] || "png").replace(
              /[^a-z0-9]/gi,
              ""
            );
            await uploadSpecImageBlob(
              blob,
              `pasted-product-${Date.now()}.${ext || "png"}`
            );
            return;
          }
        }
      }
      setSpecPhotoPasteNotice(
        "Copy an image or screenshot first, then press Ctrl+V anywhere in this window."
      );
    } catch {
      setSpecPhotoPasteNotice(
        "Press Ctrl+V (or Cmd+V) right now to paste your copied image."
      );
    }
  }

  useEffect(() => {
    if (!editingSpec) {
      setSpecPhotoPasteNotice("");
      return;
    }
    function onWindowPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            const ext = (blob.type.split("/")[1] || "png").replace(
              /[^a-z0-9]/gi,
              ""
            );
            uploadSpecImageBlob(
              blob,
              `pasted-product-${Date.now()}.${ext || "png"}`
            );
            return;
          }
        }
      }
    }
    window.addEventListener("paste", onWindowPaste);
    return () => window.removeEventListener("paste", onWindowPaste);
  }, [editingSpec?.id]);

  async function handleUnlockInsideModal() {
    if (!editingSpec || !projectData) return;
    await fetch(`/api/selections/${editingSpec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock" }),
    });
    setEditingSpec({
      ...editingSpec,
      status: "Option Selected",
      approvedByInitials: null,
      approvedAt: null,
    });
    await loadProjectDetail(projectData.id);
  }

  async function handleSaveEditSpec(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSpec || !projectData) return;
    setSavingEditSpec(true);
    try {
      await fetch(`/api/selections/${editingSpec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: editingSpec.roomId,
          tradeCategoryId: editingSpec.tradeCategoryId,
          phaseGateway: editingSpec.phaseGateway,
          componentName: editingSpec.componentName || editingSpec.productName,
          manufacturer: editingSpec.manufacturer,
          productName: editingSpec.productName,
          sku: editingSpec.sku,
          colorName: editingSpec.colorName,
          colorCode: editingSpec.colorCode,
          colorHex: editingSpec.colorHex,
          finish: editingSpec.finish,
          takeoffQty: Number(editingSpec.takeoffQty) || 1,
          wasteFactorPct: Number(editingSpec.wasteFactorPct) || 0,
          unitType: editingSpec.unitType,
          unitCost: editingSpec.isOwnerFurnished
            ? 0
            : Number(editingSpec.unitCost) || 0,
          allowanceAmount: Number(editingSpec.allowanceAmount) || 0,
          isOwnerFurnished: Boolean(editingSpec.isOwnerFurnished),
          isRadiantFloorApproved: Boolean(editingSpec.isRadiantFloorApproved),
          leadTimeWeeks: Number(editingSpec.leadTimeWeeks) || 4,
          mountingHeight: editingSpec.mountingHeight || null,
          switchGroup: editingSpec.switchGroup || null,
          colorTempKelvin: editingSpec.colorTempKelvin
            ? Number(editingSpec.colorTempKelvin)
            : "",
          installNotes: editingSpec.installNotes,
          swatchImageUrl: editingSpec.swatchImageUrl || null,
          productUrl: editingSpec.productUrl || null,
        }),
      });
      setEditingSpec(null);
      await loadProjectDetail(projectData.id);
    } finally {
      setSavingEditSpec(false);
    }
  }

  async function handleDeleteSelectionItem(
    selectionId: string,
    productName: string,
    roomName: string
  ) {
    if (!projectData || !isBuilderAdmin) return;
    const confirmed = window.confirm(
      `Delete '${productName}' from ${roomName}?`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/selections/${selectionId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (editingSpec?.id === selectionId) {
        setEditingSpec(null);
      }
      setProjectData((prev: any) =>
        prev
          ? {
              ...prev,
              selections: (prev.selections || []).filter(
                (s: any) => s.id !== selectionId
              ),
            }
          : prev
      );
      await loadProjectDetail(projectData.id);
    }
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

  function applyClippedProductToForm(
    p: any,
    sourceUrl?: string,
    noticePrefix = "Auto-filled"
  ) {
    if (!p) return;
    if (sourceUrl) {
      setCustomProductUrl(sourceUrl);
    }
    setCustomManufacturer(p.manufacturer || "Specified Brand");
    setCustomSku(p.modelNumber || "SPEC-01");
    setCustomProductName(p.productName || "Specified Product");
    setCustomComponentName(p.productName || "Custom Specified Product");
    setCustomFinish(p.finish || "Standard");
    setCustomColorName(p.colorName || "Standard Finish");
    setCustomColorCode(p.colorCode || "");
    if (p.colorHex && /^#[0-9A-Fa-f]{6}$/.test(p.colorHex)) {
      setCustomColorHex(p.colorHex);
    }
    if (Number(p.unitCost) > 0) {
      setCustomUnitCost(Number(p.unitCost));
      setCustomAllowance(Number(p.unitCost));
    }
    if (p.unit) {
      setCustomUnitType(p.unit);
    }
    if (p.imageUrl) {
      setCustomSwatchImageUrl(p.imageUrl);
    }
    if (p.specNotes) {
      setCustomInstallNotes(p.specNotes);
    }
    if (p.tradeCategory) {
      const matchedTrade = tradeCategories.find(
        (t) => t.slug === p.tradeCategory
      );
      if (matchedTrade) {
        setCustomTradeId(matchedTrade.id);
      }
    }

    setClipperBlocked(false);
    setClipperMessage(
      `${noticePrefix} "${p.manufacturer} — ${p.productName}" (${p.modelNumber}). Review or tweak any field below before saving!`
    );
    setClipperHighlight(true);
    setTimeout(() => setClipperHighlight(false), 2600);
  }

  function getKoClipperBookmarkletCode(): string {
    const studioOrigin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const script = `(function(){try{var d=document,u=location.href,t=d.title||"",m=function(s){var el=d.querySelector(s);return el?el.getAttribute("content")||"":""};var ogTitle=m('meta[property="og:title"]')||m('meta[name="twitter:title"]')||t;var ogImage=m('meta[property="og:image"]')||m('meta[name="twitter:image"]')||(d.querySelector('img[src*="thdstatic"],img[src*="lowes"],img[itemprop="image"],main img')||{}).src||"";var ogPrice=m('meta[property="product:price:amount"]')||m('meta[property="og:price:amount"]')||"";var ogBrand=m('meta[property="product:brand"]')||"";var jlds=Array.from(d.querySelectorAll('script[type="application/ld+json"]')).map(function(s){return s.textContent||""}).join("\\n").slice(0,8000);var txt=(d.body?d.body.innerText:"").replace(/\\s+/g," ").slice(0,12000);var payload={__koClipper:true,fromBookmarklet:true,clipId:"bm-"+Date.now(),url:u,ogTitle:ogTitle,ogImage:ogImage,ogPrice:ogPrice,ogBrand:ogBrand,jsonLd:jlds,rawText:txt};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(JSON.stringify(payload)).catch(function(){});}if(window.opener){try{window.opener.postMessage({type:"KO_CLIPPER_BOOKMARKLET",payload:payload},"*");}catch(e){}}fetch("${studioOrigin}/api/clip-product",{method:"POST",mode:"cors",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).catch(function(){});var b=d.createElement("div");b.style.cssText="position:fixed;top:16px;right:16px;z-index:2147483647;background:#065f46;color:#ecfdf5;border:2px solid #10b981;padding:12px 18px;border-radius:12px;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.45);";b.textContent="✓ Clipped to KO Design Studio! Switch back to your KO Studio tab to auto-fill.";d.body.appendChild(b);setTimeout(function(){b.remove();},4200);}catch(err){alert("KO Clipper Error: "+err.message);}})();`;
    return `javascript:${encodeURIComponent(script)}`;
  }

  function handleCopyBookmarkletCode() {
    navigator.clipboard.writeText(getKoClipperBookmarkletCode());
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  }

  async function processIncomingBookmarkletPayload(payload: any) {
    if (!payload) return;
    if (payload.clipId && payload.clipId === lastAppliedBookmarkletId) return;
    if (payload.clipId) {
      setLastAppliedBookmarkletId(payload.clipId);
    }

    setClippingProduct(true);
    setClipperMessage("Processing 1-Click KO Clipper Bookmarklet data...");
    try {
      const res = await fetch("/api/clip-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: payload.url || "",
          ogTitle: payload.ogTitle || "",
          ogImage: payload.ogImage || "",
          ogPrice: payload.ogPrice || "",
          ogBrand: payload.ogBrand || "",
          jsonLd: payload.jsonLd || "",
          rawText: payload.rawText || "",
          fromBookmarklet: true,
        }),
      });
      const data = await res.json();
      if (data.product) {
        applyClippedProductToForm(
          data.product,
          payload.url,
          "Clipped from active browser tab:"
        );
      }
    } catch (err: any) {
      setClipperMessage(
        err?.message || "Failed to parse bookmarklet payload."
      );
    } finally {
      setClippingProduct(false);
    }
  }

  async function checkAndImportBookmarkletClip(silent = false) {
    try {
      // 1. Check server-side latest bookmarklet clip (`POST /api/clip-product` from external tab)
      const res = await fetch(`/api/clip-product?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const latest = data?.latestClip;
        if (
          latest &&
          latest.id &&
          latest.id !== lastAppliedBookmarkletId &&
          Date.now() - Number(latest.timestamp || 0) < 10 * 60 * 1000
        ) {
          setLastAppliedBookmarkletId(latest.id);
          applyClippedProductToForm(
            latest.product,
            latest.url,
            "Auto-imported from KO Clipper Bookmarklet:"
          );
          return;
        }
      }

      // 2. Check clipboard if user clicked "Clip to KO Studio" on a CSP-restricted retail tab
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.readText === "function"
      ) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim().startsWith('{"__koClipper":true')) {
          const parsed = JSON.parse(clipText.trim());
          if (parsed.__koClipper) {
            await processIncomingBookmarkletPayload(parsed);
            return;
          }
        }
      }

      if (!silent) {
        setClipperMessage(
          "No new bookmarklet clip found yet. Click 'Clip to KO Studio' on any Home Depot, Lowe's, or vendor tab first!"
        );
      }
    } catch {
      if (!silent) {
        setClipperMessage(
          "Press Ctrl+V inside the URL or text box to paste your bookmarklet clip."
        );
      }
    }
  }

  useEffect(() => {
    if (!showCustomEntryModal) return;

    function onWindowMessage(e: MessageEvent) {
      if (e.data?.type === "KO_CLIPPER_BOOKMARKLET" && e.data?.payload) {
        processIncomingBookmarkletPayload(e.data.payload);
      }
    }

    function onWindowFocus() {
      checkAndImportBookmarkletClip(true);
    }

    window.addEventListener("message", onWindowMessage);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      window.removeEventListener("message", onWindowMessage);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [showCustomEntryModal, lastAppliedBookmarkletId, tradeCategories]);

  async function handleFetchAndAutoFillClipper() {
    if (!customProductUrl.trim() && !clipperRawText.trim()) {
      setClipperMessage(
        "Please paste a vendor product URL or copied product text first."
      );
      return;
    }

    // Check if the user pasted the raw JSON envelope from the KO Clipper Bookmarklet
    const trimmedRaw = clipperRawText.trim() || customProductUrl.trim();
    if (trimmedRaw.startsWith('{"__koClipper":true')) {
      try {
        const parsed = JSON.parse(trimmedRaw);
        await processIncomingBookmarkletPayload(parsed);
        return;
      } catch {
        // Continue normal flow
      }
    }

    setClippingProduct(true);
    setClipperMessage("Fetching & extracting product specifications...");
    setClipperBlocked(false);

    try {
      const res = await fetch("/api/clip-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: customProductUrl.trim(),
          rawText: clipperRawText.trim(),
        }),
      });
      const data = await res.json();

      if (data.blocked) {
        setClipperBlocked(true);
        setShowClipperRawTextBox(true);
        setShowBookmarkletHelper(true);
        setClipperMessage(
          data.message ||
            "Vendor blocked direct fetch—use the 1-Click KO Clipper Bookmarklet or paste page text below to auto-fill."
        );
        return;
      }

      if (data.product) {
        applyClippedProductToForm(data.product);
      }
    } catch (err: any) {
      setClipperMessage(
        err?.message || "Could not fetch product details. Try pasting text."
      );
    } finally {
      setClippingProduct(false);
    }
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
        componentName: customComponentName || customProductName,
        manufacturer: customManufacturer || "Custom Brand",
        productName: customProductName || "Custom Specified Product",
        sku: customSku || "CUST-01",
        finish: customFinish || "Standard",
        colorName: customColorName || "Custom Finish",
        colorCode: customColorCode || "",
        colorHex: customColorHex,
        productUrl: customProductUrl || null,
        swatchImageUrl: customSwatchImageUrl || null,
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
    setClipperMessage("");
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
      {/* Edit Spec Modal Overlay */}
      {editingSpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <form
            onSubmit={handleSaveEditSpec}
            onPaste={handleModalPasteEvent}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-amber-500/50 shadow-2xl"
          >
            {/* Sticky Header */}
            <div className="shrink-0 border-b border-slate-800 px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Palette className="w-4 h-4" />
                  Selection Item Specification Details
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {editingSpec.componentName}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingSpec.roomName} • {editingSpec.tradeName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSpec(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {editingSpec.status === "Client Approved & Locked" && (
                <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-medium">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>
                      Status: <strong>Client Approved & Locked</strong>{" "}
                      {editingSpec.approvedByInitials &&
                        `(Signed by ${editingSpec.approvedByInitials})`}
                    </span>
                  </div>
                  {isBuilderAdmin && (
                    <button
                      type="button"
                      onClick={handleUnlockInsideModal}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-semibold text-[11px] flex items-center gap-1 whitespace-nowrap"
                    >
                      <Unlock className="w-3 h-3" />
                      Unlock Item
                    </button>
                  )}
                </div>
              )}

              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-24 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0">
                      {editingSpec.swatchImageUrl && (
                        <img
                          src={editingSpec.swatchImageUrl}
                          alt={editingSpec.productName}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span
                        className="absolute bottom-1 right-1 w-5 h-5 rounded-md border border-slate-900 shadow"
                        style={{
                          backgroundColor: editingSpec.colorHex || "#CBD5E1",
                        }}
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-white">
                        {editingSpec.manufacturer} — {editingSpec.productName}
                      </div>
                      <div className="text-slate-400">
                        Sourced via:{" "}
                        <strong className="text-amber-300">
                          {editingSpec.vendorName}
                        </strong>
                      </div>
                      {editingSpec.productUrl && (
                        <a
                          href={editingSpec.productUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Supplier / Manufacturer Product Page
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCatalogDrawer(true)}
                      className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Pick from KO Builders Catalog
                    </button>

                    <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                      <FilePlus2 className="w-3.5 h-3.5" />
                      Upload Product Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadSpecPhoto}
                        className="hidden"
                      />
                    </label>

                    {/* Interactive Paste Image (Ctrl+V) Drop / Paste Zone */}
                    <button
                      type="button"
                      onClick={handleClickPasteFromClipboard}
                      onPaste={handleModalPasteEvent}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const droppedFile = e.dataTransfer?.files?.[0];
                        if (
                          droppedFile &&
                          droppedFile.type.startsWith("image/")
                        ) {
                          uploadSpecImageBlob(droppedFile, droppedFile.name);
                        }
                      }}
                      disabled={uploadingSpecPhoto}
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-dashed border-emerald-500/50 focus:border-emerald-400 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 whitespace-nowrap transition"
                      title="Click to paste image from clipboard or press Ctrl+V anywhere in this modal"
                    >
                      {uploadingSpecPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <ClipboardPaste className="w-3.5 h-3.5" />
                          Paste Image (Ctrl+V)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {specPhotoPasteNotice && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-[11px] text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{specPhotoPasteNotice}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                {/* Row 1: Room Assignment, Trade Category, Construction Phase */}
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Room Assignment (roomId)
                  </label>
                  <select
                    value={editingSpec.roomId}
                    onChange={(e) => {
                      const nextRoomId = e.target.value;
                      const matchedRoom = (projectData?.rooms || []).find(
                        (r: any) => r.id === nextRoomId
                      );
                      setEditingSpec({
                        ...editingSpec,
                        roomId: nextRoomId,
                        roomName: matchedRoom?.name || editingSpec.roomName,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  >
                    {(projectData?.rooms || []).map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Trade Category (tradeCategory)
                  </label>
                  <select
                    value={editingSpec.tradeCategoryId}
                    onChange={(e) => {
                      const nextTradeId = e.target.value;
                      const matchedTrade = tradeCategories.find(
                        (t) => t.id === nextTradeId
                      );
                      setEditingSpec({
                        ...editingSpec,
                        tradeCategoryId: nextTradeId,
                        tradeName: matchedTrade?.name || editingSpec.tradeName,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  >
                    {tradeCategories.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Construction Phase (phase)
                  </label>
                  <select
                    value={editingSpec.phaseGateway}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        phaseGateway: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  >
                    {PHASE_GATEWAYS.map((ph) => (
                      <option key={ph} value={ph}>
                        {ph}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 2: Component Title, Product Name, Manufacturer, Model / SKU */}
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Component / Schedule Title
                  </label>
                  <input
                    required
                    value={editingSpec.componentName}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        componentName: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Product Name (name)
                  </label>
                  <input
                    required
                    value={editingSpec.productName}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        productName: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Manufacturer / Brand (manufacturer)
                  </label>
                  <input
                    required
                    value={editingSpec.manufacturer}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        manufacturer: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                {/* Row 3: Model Number / SKU, Finish, Color Name */}
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Model Number / SKU (modelNumber)
                  </label>
                  <input
                    required
                    placeholder="e.g. 87071SRS / T60P975-LHP-GL"
                    value={editingSpec.sku}
                    onChange={(e) =>
                      setEditingSpec({ ...editingSpec, sku: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-200 font-mono font-semibold focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Finish / Sheen (finish)
                  </label>
                  <input
                    value={editingSpec.finish}
                    onChange={(e) =>
                      setEditingSpec({ ...editingSpec, finish: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Color Name (colorName)
                  </label>
                  <input
                    value={editingSpec.colorName}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        colorName: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                {/* Row 4: Color Code, Live Color Swatch Picker, Lead Time */}
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Color Code / Paint Formula (colorCode)
                  </label>
                  <input
                    placeholder="e.g. SW 7008 / NW-104 / SRS"
                    value={editingSpec.colorCode}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        colorCode: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Live Color Swatch Picker (colorHex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingSpec.colorHex || "#CBD5E1"}
                      onChange={(e) =>
                        setEditingSpec({
                          ...editingSpec,
                          colorHex: e.target.value,
                        })
                      }
                      className="w-10 h-9 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer shrink-0"
                    />
                    <input
                      value={editingSpec.colorHex}
                      onChange={(e) =>
                        setEditingSpec({
                          ...editingSpec,
                          colorHex: e.target.value,
                        })
                      }
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Lead Time (Weeks) &amp; Waste Factor (%)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      title="Lead Time (Weeks)"
                      placeholder="Weeks"
                      value={editingSpec.leadTimeWeeks}
                      onChange={(e) =>
                        setEditingSpec({
                          ...editingSpec,
                          leadTimeWeeks: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:border-amber-400 outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      title="Waste Factor (%)"
                      placeholder="Waste %"
                      value={editingSpec.wasteFactorPct}
                      onChange={(e) =>
                        setEditingSpec({
                          ...editingSpec,
                          wasteFactorPct: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                {/* Row 5: Quantity, Unit of Measure, Unit Cost, Allowance + Live Extended Cost & Variance Preview */}
                <div className="md:col-span-3 bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">
                        Quantity (takeoffQty)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={editingSpec.takeoffQty}
                        onChange={(e) =>
                          setEditingSpec({
                            ...editingSpec,
                            takeoffQty: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">
                        Unit of Measure (unit)
                      </label>
                      <select
                        value={editingSpec.unitType}
                        onChange={(e) =>
                          setEditingSpec({
                            ...editingSpec,
                            unitType: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                      >
                        <option value="each">each</option>
                        <option value="sq ft">sq ft</option>
                        <option value="lf">lf</option>
                        <option value="lin ft">lin ft</option>
                        <option value="set">set</option>
                        <option value="lot">lot</option>
                        <option value="allowance lump sum">
                          allowance lump sum
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">
                        Unit Cost ($ / {editingSpec.unitType})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={editingSpec.isOwnerFurnished}
                        value={
                          editingSpec.isOwnerFurnished
                            ? 0
                            : editingSpec.unitCost
                        }
                        onChange={(e) =>
                          setEditingSpec({
                            ...editingSpec,
                            unitCost: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">
                        Allowance ($) (allowanceAmount)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingSpec.allowanceAmount}
                        onChange={(e) =>
                          setEditingSpec({
                            ...editingSpec,
                            allowanceAmount: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Live Auto-Calculated Extended Cost & Allowance Variance Bar */}
                  {(() => {
                    const effQty = Number(
                      (
                        (Number(editingSpec.takeoffQty) || 0) *
                        (1 + (Number(editingSpec.wasteFactorPct) || 0) / 100)
                      ).toFixed(2)
                    );
                    const extCost = editingSpec.isOwnerFurnished
                      ? 0
                      : editingSpec.unitType === "allowance lump sum"
                      ? Number((Number(editingSpec.unitCost) || 0).toFixed(2))
                      : Number(
                          (effQty * (Number(editingSpec.unitCost) || 0)).toFixed(
                            2
                          )
                        );
                    const liveVariance = Number(
                      (
                        extCost - (Number(editingSpec.allowanceAmount) || 0)
                      ).toFixed(2)
                    );

                    return (
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-4 font-mono">
                          <span className="text-slate-400">
                            Effective Qty:{" "}
                            <strong className="text-white">
                              {effQty} {editingSpec.unitType}
                            </strong>
                          </span>
                          <span className="text-slate-400">
                            Extended Cost:{" "}
                            <strong className="text-amber-300">
                              ${extCost.toLocaleString()}
                            </strong>
                          </span>
                          <span className="text-slate-400">
                            Allowance Variance:{" "}
                            <strong
                              className={
                                liveVariance > 0
                                  ? "text-red-400"
                                  : "text-emerald-400"
                              }
                            >
                              {liveVariance > 0 ? "+" : ""}$
                              {liveVariance.toLocaleString()}
                            </strong>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingSpec.isOwnerFurnished}
                              onChange={(e) =>
                                setEditingSpec({
                                  ...editingSpec,
                                  isOwnerFurnished: e.target.checked,
                                })
                              }
                              className="accent-purple-500 rounded cursor-pointer"
                            />
                            <span>OFCI ($0 Builder Cost)</span>
                          </label>

                          <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingSpec.isRadiantFloorApproved}
                              onChange={(e) =>
                                setEditingSpec({
                                  ...editingSpec,
                                  isRadiantFloorApproved: e.target.checked,
                                })
                              }
                              className="accent-emerald-500 rounded cursor-pointer"
                            />
                            <Flame className="w-3.5 h-3.5 text-orange-400" />
                            <span>Hydronic Radiant Slab Approved</span>
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Row 6: Mounting / Rough-In Height, Switch Group, LED Kelvin */}
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Mounting / Rough-In Height
                  </label>
                  <input
                    placeholder={'e.g. 48" AFF to valve center'}
                    value={editingSpec.mountingHeight}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        mountingHeight: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    Switch Group / Dimmer Zone
                  </label>
                  <input
                    placeholder="e.g. Lutron Caséta Zone K-1"
                    value={editingSpec.switchGroup}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        switchGroup: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    LED Color Temperature (Kelvin)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2700 or 3000"
                    value={editingSpec.colorTempKelvin}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        colorTempKelvin: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                  />
                </div>

                {/* Row 7: Sourcing / Vendor Product URL & Product Photo URL */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400 font-medium">
                        Sourcing / Vendor Product URL (productUrl)
                      </label>
                      {editingSpec.productUrl && (
                        <a
                          href={editingSpec.productUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Vendor Link
                        </a>
                      )}
                    </div>
                    <input
                      placeholder="https://www.homedepot.com/... or https://www.brizo.com/..."
                      value={editingSpec.productUrl}
                      onChange={(e) =>
                        setEditingSpec({
                          ...editingSpec,
                          productUrl: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">
                      Product Photo / Swatch Image URL (imageUrl)
                    </label>
                    <input
                      placeholder="https://... or /api/uploads/... (or Upload / Ctrl+V Paste above)"
                      value={editingSpec.swatchImageUrl}
                      onChange={(e) =>
                        setEditingSpec({
                          ...editingSpec,
                          swatchImageUrl: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                {/* Row 8: Technical & Subcontractor Installation Notes */}
                <div className="md:col-span-3">
                  <label className="text-slate-400 block mb-1 font-medium">
                    Technical &amp; Subcontractor Installation Notes (specNotes
                    / tradeNotes)
                  </label>
                  <textarea
                    rows={3}
                    value={editingSpec.installNotes}
                    onChange={(e) =>
                      setEditingSpec({
                        ...editingSpec,
                        installNotes: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 border-t border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-900">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatalogDrawer(true)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-xs font-semibold text-amber-300 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Pick from KO Builders Catalog
                </button>
                {isBuilderAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteSelectionItem(
                        editingSpec.id,
                        editingSpec.productName || editingSpec.componentName,
                        editingSpec.roomName || "this room"
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-xs font-semibold text-red-300 flex items-center gap-1.5 whitespace-nowrap transition"
                    title="Delete Product / Line Item"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    Delete Item
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingSpec(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditSpec}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 whitespace-nowrap"
                >
                  {savingEditSpec
                    ? "Saving Specification..."
                    : "Save Spec & Recalculate Variance"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Showroom Good / Better / Best Curated Catalog Slide-Over Drawer */}
      <ShowroomCatalogDrawer
        isOpen={showCatalogDrawer}
        onClose={() => setShowCatalogDrawer(false)}
        catalogItems={catalogItems}
        onApplyCatalogItem={handleApplyCatalogItemFromDrawer}
        applyingId={applyingCatalogItemId}
      />

      {/* Upload / Update Project Plans & Non-Destructive Room Sync Modal */}
      <UpdateProjectPlansModal
        isOpen={showUpdatePlansModal}
        project={projectData}
        onClose={() => setShowUpdatePlansModal(false)}
        onUpdated={() => {
          if (projectData?.id) {
            loadProjectDetail(projectData.id);
          }
        }}
      />

      {/* Share Magic Link & Subcontractor Trade Packets Modal */}
      {showShareLinksModal && projectData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl">
            <div className="shrink-0 border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Zero-Login Share Links &amp; HMAC-SHA256 Trade Packets
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {projectData.name} — Share Links
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShareLinksModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 text-xs">
              {/* 1. Homeowner Magic Approval Link */}
              <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-emerald-300 text-sm">
                      Homeowner Magic Approval Link
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Allows {projectData.clientName} to review room selections,
                      allowance variances, and sign off with digital initials.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyMagicShareLink}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0"
                  >
                    {copiedMagicLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied Magic Link!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Homeowner Link
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-300 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 truncate">
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  /?token={projectData.magicAccessToken}
                </div>
              </div>

              {/* 2. Per-Trade HMAC-SHA256 Subcontractor Links */}
              <div className="space-y-2.5">
                <div>
                  <div className="font-bold text-sky-300 text-sm">
                    Tamper-Proof Subcontractor Trade Packet Links (HMAC-SHA256 •
                    Zero Pricing)
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Each trade generates a dedicated cryptographic token bound
                    to its exact <code>tradeSlug</code> (including separate{" "}
                    <strong>Plumbing Fixtures</strong> and{" "}
                    <strong>Hydronic Radiant</strong> packets). All pricing and
                    allowances are stripped server-side.
                  </p>
                </div>

                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  {tradeCategories.map((t) => {
                    const count = (projectData.selections || []).filter(
                      (s: any) => s.tradeCategory?.slug === t.slug
                    ).length;
                    const path = getTradeScopedFieldUrl(t.slug);
                    const isCopied = copiedTradeSlug === t.slug;
                    return (
                      <div
                        key={t.slug}
                        className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-900/60"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{t.name}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300">
                              {t.slug}
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({count} {count === 1 ? "item" : "items"})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyTokenizedFieldLink(t.slug)
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-semibold text-[11px] flex items-center gap-1"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                          <Link
                            href={path}
                            target="_blank"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open Packet</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-800 px-6 py-3 flex justify-end bg-slate-900">
              <button
                type="button"
                onClick={() => setShowShareLinksModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                  onClick={() => {
                    copyMagicShareLink();
                    setShowShareLinksModal(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 border border-slate-700"
                  title="Share Homeowner Magic Link & Subcontractor Trade Packet Links"
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
                  {isBuilderAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowUpdatePlansModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs text-amber-300 font-semibold flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Upload / Update Project Plans
                    </button>
                  )}
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
                  <button
                    type="button"
                    onClick={() => handleCopyTokenizedFieldLink()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sky-500/40 text-xs text-sky-300 font-semibold flex items-center gap-1.5"
                    title="Copy Zero-Login Tokenized Field Crew Share Link"
                  >
                    {copiedFieldLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">
                          Copied Field Link!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                        <span>Copy Field Link</span>
                      </>
                    )}
                  </button>
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
              onClick={() => setContextMode("HOUSE_3D_TOUR")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                contextMode === "HOUSE_3D_TOUR"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D Room & House Tour
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
            className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Add Custom Product Specification / Smart Web Clipper
                </h3>
                <p className="text-xs text-slate-400">
                  Paste any vendor product URL (Ferguson, Brizo, Kohler,
                  Cambria, Kährs, Sherwin-Williams) to auto-extract SKU, finish,
                  swatch hex, price, photo, and rough-in notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomEntryModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Smart Web Clipper Bar */}
            <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-end gap-2.5">
                <div className="flex-1 min-w-[260px]">
                  <label className="text-xs font-semibold text-emerald-300 block mb-1">
                    Vendor / Sourcing Product URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.brizo.com/kitchen/product/64063LF-GL or https://www.kohler.com/..."
                    value={customProductUrl}
                    onChange={(e) => setCustomProductUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={clippingProduct}
                  onClick={handleFetchAndAutoFillClipper}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow whitespace-nowrap transition"
                >
                  {clippingProduct ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Fetching & Auto-Filling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Fetch & Auto-Fill Details
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowClipperRawTextBox(!showClipperRawTextBox)
                  }
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 whitespace-nowrap"
                >
                  {showClipperRawTextBox
                    ? "Hide Pasted Text Box"
                    : "Or paste copied product page text"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowBookmarkletHelper(!showBookmarkletHelper)
                  }
                  className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-semibold text-amber-300 whitespace-nowrap"
                >
                  {showBookmarkletHelper
                    ? "Hide 1-Click Bookmarklet"
                    : "1-Click Browser Bookmarklet (Home Depot / Lowe's)"}
                </button>
              </div>

              {/* Collapsible 1-Click "KO Clipper" Browser Bookmarklet Generator Card */}
              {showBookmarkletHelper && (
                <div className="bg-slate-900/95 border border-amber-500/40 rounded-xl p-3.5 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Clip Directly from Any Open Browser Tab (Home Depot /
                        Lowe&apos;s / Ferguson / Kohler)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        1. Drag the{" "}
                        <strong className="text-white">
                          📎 Clip to KO Studio
                        </strong>{" "}
                        button below onto your Chrome Bookmarks Bar (or copy the
                        bookmarklet code). 2. While viewing any product on Home
                        Depot or Lowe&apos;s, click{" "}
                        <strong className="text-white">
                          Clip to KO Studio
                        </strong>{" "}
                        on your Bookmarks Bar — then switch back to this tab and
                        all fields auto-fill!
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        ref={(el) => {
                          if (el) {
                            el.setAttribute(
                              "href",
                              getKoClipperBookmarkletCode()
                            );
                          }
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          setClipperMessage(
                            "Drag this '📎 Clip to KO Studio' button up to your Chrome Bookmarks Bar, then click it while viewing any Home Depot or Lowe's product page!"
                          );
                        }}
                        draggable
                        className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md cursor-grab active:cursor-grabbing flex items-center gap-1.5 whitespace-nowrap select-none"
                        title="Drag me to your Chrome Bookmarks Bar!"
                      >
                        <span>📎 Clip to KO Studio</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleCopyBookmarkletCode}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
                        title="Copy javascript:... bookmarklet URL to paste into a new Chrome bookmark"
                      >
                        {copiedBookmarklet ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">
                              Copied Bookmarklet Code!
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Copy Bookmarklet Code</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => checkAndImportBookmarkletClip(false)}
                        className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 whitespace-nowrap"
                        title="Pull the latest product clipped from your browser bookmarklet or clipboard"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>Import Bookmarklet Clip</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showClipperRawTextBox && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] text-slate-400 block">
                    Fallback: Paste copied product page text or spec sheet text
                    below and click <strong>Fetch & Auto-Fill Details</strong>:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Paste copied product title, SKU, finish (e.g. Vibrant Brushed Moderne Brass), price ($489.00), and flow rate / rough-in specs..."
                    value={clipperRawText}
                    onChange={(e) => setClipperRawText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              )}

              {clipperMessage && (
                <div
                  className={`rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${
                    clipperBlocked
                      ? "bg-amber-500/15 border border-amber-500/40 text-amber-200"
                      : "bg-emerald-500/15 border border-emerald-500/40 text-emerald-200"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{clipperMessage}</span>
                </div>
              )}
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
                  className={`w-full bg-slate-950 border rounded-lg px-2.5 py-2 text-white transition ${
                    clipperHighlight
                      ? "border-emerald-400 ring-1 ring-emerald-400/50"
                      : "border-slate-700"
                  }`}
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
                  className={`w-full bg-slate-950 border rounded-lg px-2.5 py-2 text-white transition ${
                    clipperHighlight
                      ? "border-emerald-400 ring-1 ring-emerald-400/50"
                      : "border-slate-700"
                  }`}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Manufacturer</label>
                <input
                  placeholder="e.g. Brizo / Kohler"
                  value={customManufacturer}
                  onChange={(e) => setCustomManufacturer(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg px-2.5 py-2 text-white transition ${
                    clipperHighlight
                      ? "border-emerald-400 ring-1 ring-emerald-400/50"
                      : "border-slate-700"
                  }`}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Product Name
                </label>
                <input
                  placeholder="e.g. Litze Articulating Prep Faucet"
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg px-2.5 py-2 text-white transition ${
                    clipperHighlight
                      ? "border-emerald-400 ring-1 ring-emerald-400/50"
                      : "border-slate-700"
                  }`}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Model Number / SKU
                </label>
                <input
                  placeholder="e.g. 64063LF-GL"
                  value={customSku}
                  onChange={(e) => setCustomSku(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg px-2.5 py-2 text-white font-mono transition ${
                    clipperHighlight
                      ? "border-emerald-400 ring-1 ring-emerald-400/50"
                      : "border-slate-700"
                  }`}
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Finish</label>
                <input
                  placeholder="Vibrant Brushed Moderne Brass"
                  value={customFinish}
                  onChange={(e) => setCustomFinish(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg px-2.5 py-2 text-white transition ${
                    clipperHighlight
                      ? "border-emerald-400 ring-1 ring-emerald-400/50"
                      : "border-slate-700"
                  }`}
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Color Name & Code
                </label>
                <div className="flex gap-1.5">
                  <input
                    placeholder="Brushed Luxe Gold"
                    value={customColorName}
                    onChange={(e) => setCustomColorName(e.target.value)}
                    className={`flex-1 bg-slate-950 border rounded-lg px-2.5 py-2 text-white transition ${
                      clipperHighlight
                        ? "border-emerald-400 ring-1 ring-emerald-400/50"
                        : "border-slate-700"
                    }`}
                  />
                  <input
                    placeholder="2MB"
                    value={customColorCode}
                    onChange={(e) => setCustomColorCode(e.target.value)}
                    className={`w-16 bg-slate-950 border rounded-lg px-2 py-2 text-white font-mono transition ${
                      clipperHighlight
                        ? "border-emerald-400 ring-1 ring-emerald-400/50"
                        : "border-slate-700"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Live Color Swatch Picker (colorHex)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    className="w-9 h-9 bg-slate-950 border border-slate-700 rounded cursor-pointer shrink-0"
                  />
                  <input
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    className={`flex-1 bg-slate-950 border rounded-lg px-2.5 py-2 text-white font-mono transition ${
                      clipperHighlight
                        ? "border-emerald-400 ring-1 ring-emerald-400/50"
                        : "border-slate-700"
                    }`}
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
                    <option value="lf">lf</option>
                    <option value="lin ft">lin ft</option>
                    <option value="set">set</option>
                    <option value="lot">lot</option>
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
                    step="0.01"
                    disabled={customIsOfci}
                    value={customIsOfci ? 0 : customUnitCost}
                    onChange={(e) => setCustomUnitCost(Number(e.target.value))}
                    className={`w-1/2 bg-slate-950 border rounded-lg px-2 py-2 text-white font-mono transition ${
                      clipperHighlight
                        ? "border-emerald-400 ring-1 ring-emerald-400/50"
                        : "border-slate-700"
                    }`}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={customAllowance}
                    onChange={(e) => setCustomAllowance(Number(e.target.value))}
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">
                  Product Image URL (swatchImageUrl)
                </label>
                <div className="flex items-center gap-2">
                  {customSwatchImageUrl && (
                    <img
                      src={customSwatchImageUrl}
                      alt="Clipped preview"
                      className="w-9 h-9 rounded border border-slate-700 object-cover shrink-0"
                    />
                  )}
                  <input
                    placeholder="https://... (auto-filled from OpenGraph / JSON-LD)"
                    value={customSwatchImageUrl}
                    onChange={(e) => setCustomSwatchImageUrl(e.target.value)}
                    className={`flex-1 bg-slate-950 border rounded-lg px-2.5 py-2 text-white transition ${
                      clipperHighlight
                        ? "border-emerald-400 ring-1 ring-emerald-400/50"
                        : "border-slate-700"
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center gap-1.5 pt-2">
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

              <div className="md:col-span-4">
                <label className="text-slate-400 block mb-1">
                  Technical / Trade Specification Notes (GPM, Rough-In,
                  Mounting, CF8i / 2x4 Backing)
                </label>
                <input
                  placeholder="Mounting height, GPM flow rate, hole count, or CF8i sleeve instructions..."
                  value={customInstallNotes}
                  onChange={(e) => setCustomInstallNotes(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg px-2.5 py-2 text-white transition ${
                    clipperHighlight
                      ? "border-emerald-400 ring-1 ring-emerald-400/50"
                      : "border-slate-700"
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCustomEntryModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg"
              >
                Save Specification to Project
              </button>
            </div>
          </form>
        )}

        {/* Mode-Specific Views */}
        {contextMode === "HOUSE_3D_TOUR" && projectData ? (
          <House3DTourVisualizer
            project={projectData}
            rooms={projectData.rooms || []}
            selections={projectData.selections || []}
            openings={projectData.openings || []}
            catalogPresets={catalogPresets}
            catalogItems={catalogItems}
            selectedRoomId={
              selectedRoomId === "ALL"
                ? (projectData.rooms || []).find(
                    (r: any) => !r.name.toLowerCase().includes("exterior")
                  )?.id || projectData.rooms?.[0]?.id
                : selectedRoomId
            }
            onSelectRoom={(id) => setSelectedRoomId(id)}
            onSelectionUpdated={() => loadProjectDetail(projectData.id)}
            canEdit={!isSubcontractor}
          />
        ) : contextMode === "FLOOR_PLAN" && projectData ? (
          <FloorPlanCanvas
            project={projectData}
            rooms={projectData.rooms || []}
            selections={projectData.selections || []}
            selectedRoomId={
              selectedRoomId === "ALL"
                ? projectData.rooms?.[0]?.id
                : selectedRoomId
            }
            onSelectRoom={(id) => setSelectedRoomId(id)}
            canEdit={!isSubcontractor}
            isBuilderAdmin={isBuilderAdmin}
            onRoomUpdated={() => loadProjectDetail(projectData.id)}
            onOpenUpdatePlansModal={() => setShowUpdatePlansModal(true)}
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
            {/* Interactive Visual Floor-Plan Pin Mapper on Project Overview / Room-by-Room View */}
            {contextMode === "ROOM_MATRIX" && projectData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Interactive Visual Floor-Plan Pin Mapper (Overview & Room-by-Room)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOverviewPinMap(!showOverviewPinMap)}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white"
                  >
                    {showOverviewPinMap
                      ? "Collapse Floor Plan Map"
                      : "Expand Floor Plan Map"}
                  </button>
                </div>
                {showOverviewPinMap && (
                  <FloorPlanCanvas
                    project={projectData}
                    rooms={projectData.rooms || []}
                    selections={projectData.selections || []}
                    selectedRoomId={
                      selectedRoomId === "ALL"
                        ? projectData.rooms?.[0]?.id
                        : selectedRoomId
                    }
                    onSelectRoom={(id) => setSelectedRoomId(id)}
                    canEdit={!isSubcontractor}
                    isBuilderAdmin={isBuilderAdmin}
                    onRoomUpdated={() => loadProjectDetail(projectData.id)}
                    onOpenUpdatePlansModal={() => setShowUpdatePlansModal(true)}
                    interiorFramingType={projectData.interiorFramingType}
                    compactMode
                  />
                )}
              </div>
            )}

            {/* Filter Bar + Bulk Room Approval Action */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Room Filter + Quick 3D Room Tour Button */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="ALL">
                      All Rooms ({projectData?.rooms?.length || 0})
                    </option>
                    {(projectData?.rooms || []).map((r: any) => (
                      <option key={r.id} value={r.id}>
                        Room: {r.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setContextMode("HOUSE_3D_TOUR")}
                    className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition"
                    title="Open Interactive 3D Room & House Tour for this room"
                  >
                    <Box className="w-3.5 h-3.5" />
                    3D Room & House Tour
                  </button>
                </div>

                {/* Trade Filter + One-Click Copy Field Link when a Trade is active */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedTradeSlug}
                    onChange={(e) => setSelectedTradeSlug(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="ALL">
                      All Trade Categories ({tradeCategories.length || 12})
                    </option>
                    {tradeCategories.map((t) => (
                      <option key={t.id} value={t.slug}>
                        Trade: {t.name}
                      </option>
                    ))}
                  </select>

                  {selectedTradeSlug !== "ALL" && projectData && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyTokenizedFieldLink(selectedTradeSlug)
                        }
                        className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow whitespace-nowrap transition"
                        title={`Copy trade-locked zero-login field link for ${selectedTradeSlug}`}
                      >
                        {copiedFieldLink ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied Field Link!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Field Link
                          </>
                        )}
                      </button>
                      <Link
                        href={getTradeScopedFieldUrl(selectedTradeSlug)}
                        target="_blank"
                        className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-sky-500/40 text-sky-300"
                        title="Open Trade-Locked Field Link in New Tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </>
                  )}
                </div>

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

            {/* View B: Trade-by-Trade Filter Pills & Quick Subcontractor Share Bar */}
            {contextMode === "TRADE_MATRIX" && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    View B: Trade-by-Trade Specification Filter Pills (
                    {tradeCategories.length} Trades)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowShareLinksModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-[11px] font-semibold text-sky-300 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Share Trade Packet Links
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTradeSlug("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      selectedTradeSlug === "ALL"
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    All Trades ({projectData?.selections?.length || 0})
                  </button>
                  {tradeCategories.map((t) => {
                    const count = (projectData?.selections || []).filter(
                      (s: any) => s.tradeCategory?.slug === t.slug
                    ).length;
                    const isActive = selectedTradeSlug === t.slug;
                    return (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => setSelectedTradeSlug(t.slug)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive
                            ? "bg-amber-500 text-slate-950 shadow"
                            : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span>{t.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                            isActive
                              ? "bg-slate-950/20 text-slate-950"
                              : "bg-slate-800 text-amber-300"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                      {/* Product Photo + Swatch + Product Spec (5 Cols) */}
                      <div className="lg:col-span-5 flex items-start gap-3.5">
                        <button
                          type="button"
                          disabled={isSubcontractor}
                          onClick={() => !isSubcontractor && openEditSpecModal(item)}
                          className="relative w-24 h-20 rounded-xl border border-slate-700 bg-slate-950 shrink-0 shadow-md overflow-hidden group hover:border-amber-400 transition"
                          title={`Click to view/edit product photo & spec: ${item.productName}`}
                        >
                          {item.swatchImageUrl ? (
                            <img
                              src={item.swatchImageUrl}
                              alt={item.productName}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                          ) : null}
                          <span
                            className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded border border-slate-900/80 text-[9px] font-mono font-bold text-slate-950 shadow"
                            style={{
                              backgroundColor: item.colorHex || "#CBD5E1",
                            }}
                          >
                            {item.colorCode?.slice(0, 6) || "SWATCH"}
                          </span>
                        </button>
                        <div className="space-y-1 min-w-0">
                          <h4
                            onClick={() => !isSubcontractor && openEditSpecModal(item)}
                            className={`text-sm font-bold text-white ${
                              !isSubcontractor
                                ? "cursor-pointer hover:text-amber-300 transition"
                                : ""
                            }`}
                          >
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
                            <div className="pt-0.5">
                              <a
                                href={item.productUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-[11px] font-medium text-sky-300 transition"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span>
                                  Sourced via{" "}
                                  <strong>
                                    {item.vendorName || item.manufacturer}
                                  </strong>{" "}
                                  — View Product Spec
                                </span>
                              </a>
                            </div>
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

                        {/* Catalog Preset Quick-Swap, Edit Spec / Custom Color, & Lock Controls */}
                        {!isSubcontractor && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              {!isLocked && matchingPresets.length > 0 && (
                                <select
                                  value=""
                                  onChange={(e) =>
                                    handleApplyPreset(item.id, e.target.value)
                                  }
                                  className="flex-1 min-w-0 bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-1.5 text-[11px] text-amber-200"
                                >
                                  <option value="" disabled>
                                    Swap from Master Finish Catalog...
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

                              <button
                                type="button"
                                onClick={() => openEditSpecModal(item)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-[11px] font-semibold text-amber-300 flex items-center gap-1 shrink-0 transition"
                                title="Edit Spec"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit Spec
                              </button>

                              {isBuilderAdmin && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteSelectionItem(
                                      item.id,
                                      item.productName || item.componentName,
                                      item.room?.name || "this room"
                                    )
                                  }
                                  className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-[11px] font-semibold text-red-300 flex items-center gap-1 shrink-0 transition"
                                  title={`Delete '${item.productName || item.componentName}' from ${item.room?.name || "room"}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

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
                                    className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    Unlock Item
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
