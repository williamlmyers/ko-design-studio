"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  Box,
  Camera,
  Check,
  Compass,
  Eye,
  Flame,
  Footprints,
  Layers,
  Loader2,
  Maximize2,
  Move,
  Palette,
  RotateCcw,
  Sparkles,
  SplitSquareHorizontal,
  Sun,
} from "lucide-react";

interface House3DTourVisualizerProps {
  project: any;
  rooms: any[];
  selections: any[];
  openings: any[];
  catalogPresets: any[];
  catalogItems: any[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onSelectionUpdated: () => void;
  canEdit: boolean;
}

interface AlternateFinishOverride {
  enabled: boolean;
  splitView5050: boolean;
  wallHex: string;
  wallLabel: string;
  wallSheen: "matte" | "eggshell" | "satin" | "semigloss";
  floorHex: string;
  floorLabel: string;
  floorPattern: "plank" | "tile" | "polymer";
  cabinetHex: string;
  cabinetLabel: string;
  counterHex: string;
  counterLabel: string;
  presetIdToApply?: string;
  targetSelectionId?: string;
}

function createProceduralFloorTexture(
  hexColor: string,
  pattern: "plank" | "tile" | "polymer"
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = hexColor || "#E6DAC8";
  ctx.fillRect(0, 0, 512, 512);

  if (pattern === "plank") {
    // Wide-plank engineered hardwood seams + subtle grain
    ctx.strokeStyle = "rgba(15, 23, 42, 0.24)";
    ctx.lineWidth = 3;
    const plankRows = 6;
    const rowH = 512 / plankRows;
    for (let r = 0; r <= plankRows; r++) {
      const y = r * rowH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      const jointX = ((r * 173) % 360) + 70;
      ctx.beginPath();
      ctx.moveTo(jointX, y);
      ctx.lineTo(jointX, y + rowH);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 28; i++) {
      const y = (i * 19) % 512;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + 4);
      ctx.stroke();
    }
  } else if (pattern === "tile") {
    // Large-format 24x48 rectified porcelain tile grid + subtle stone veining
    ctx.strokeStyle = "rgba(226, 232, 240, 0.55)";
    ctx.lineWidth = 4;
    const cols = 2;
    const rows = 4;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo((c * 512) / cols, 0);
      ctx.lineTo((c * 512) / cols, 512);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, (r * 512) / rows);
      ctx.lineTo(512, (r * 512) / rows);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(100, 116, 139, 0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 80);
    ctx.quadraticCurveTo(220, 160, 480, 60);
    ctx.moveTo(60, 340);
    ctx.quadraticCurveTo(280, 290, 460, 430);
    ctx.stroke();
  } else {
    // Smooth sealed concrete / Nuform polymer utility zone
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, 496, 496);
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;
  return tex;
}

function getRoughnessForSheen(finishText: string): number {
  const lower = (finishText || "").toLowerCase();
  if (lower.includes("semi-gloss") || lower.includes("gloss") || lower.includes("polished")) {
    return 0.22;
  }
  if (lower.includes("satin") || lower.includes("enamel")) {
    return 0.42;
  }
  if (lower.includes("eggshell") || lower.includes("cashmere")) {
    return 0.65;
  }
  return 0.85; // Dead-flat / Matte
}

export function House3DTourVisualizer({
  project,
  rooms,
  selections,
  openings,
  catalogPresets,
  catalogItems,
  selectedRoomId,
  onSelectRoom,
  onSelectionUpdated,
  canEdit,
}: House3DTourVisualizerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [tourMode, setTourMode] = useState<"DOLLHOUSE" | "WALKTHROUGH">(
    "DOLLHOUSE"
  );
  const [floorFilter, setFloorFilter] = useState<string>("ALL");
  const [showRadiantLoopsOverlay, setShowRadiantLoopsOverlay] =
    useState<boolean>(false);
  const [showRoofCeilingCutaway, setShowRoofCeilingCutaway] =
    useState<boolean>(true);
  const [daylightAzimuthDeg, setDaylightAzimuthDeg] = useState<number>(135);

  // Camera state for Orbit (Dollhouse) and First-Person Walkthrough
  const [orbitAngle, setOrbitAngle] = useState<number>(0.68);
  const [orbitPitch, setOrbitPitch] = useState<number>(0.72);
  const [orbitDistance, setOrbitDistance] = useState<number>(72);
  const [fpYaw, setFpYaw] = useState<number>(0);
  const [fpOffset, setFpOffset] = useState<{ x: number; z: number }>({
    x: 0,
    z: 0,
  });

  // Photorealistic AI Room Render state
  const [renderingPreview, setRenderingPreview] = useState<boolean>(false);
  const [renderStatusMsg, setRenderStatusMsg] = useState<string>("");
  const [localRendersByRoom, setLocalRendersByRoom] = useState<
    Record<string, any[]>
  >({});
  const [compareRenderIds, setCompareRenderIds] = useState<string[]>([]);
  const [applyingOverride, setApplyingOverride] = useState<boolean>(false);

  const interiorRooms = useMemo(() => {
    const filtered = (rooms || []).filter(
      (r) => !r.name.toLowerCase().includes("exterior facade")
    );
    return filtered.length > 0 ? filtered : rooms || [];
  }, [rooms]);

  const activeRoom = useMemo(() => {
    return (
      interiorRooms.find((r) => r.id === selectedRoomId) ||
      interiorRooms[0] ||
      rooms?.[0] ||
      null
    );
  }, [interiorRooms, rooms, selectedRoomId]);

  const activeRoomSelections = useMemo(() => {
    if (!activeRoom) return [];
    return (selections || []).filter((s) => s.roomId === activeRoom.id);
  }, [selections, activeRoom]);

  // Extract current room finishes from SelectionItem records
  const currentRoomFinishes = useMemo(() => {
    const isExposedPolymer = activeRoom?.cf8iInteriorFinish?.includes(
      "Exposed Nuform Polymer"
    );
    const paintSel = activeRoomSelections.find(
      (s) => s.tradeCategory?.slug === "paint-finishes"
    );
    const floorSel = activeRoomSelections.find(
      (s) => s.tradeCategory?.slug === "flooring-tile"
    );
    const cabSel = activeRoomSelections.find(
      (s) => s.tradeCategory?.slug === "cabinetry-millwork"
    );
    const counterSel = activeRoomSelections.find(
      (s) => s.tradeCategory?.slug === "countertops-stone"
    );
    const plumbSel = activeRoomSelections.find(
      (s) => s.tradeCategory?.slug === "plumbing-fixtures"
    );

    const floorPattern: "plank" | "tile" | "polymer" = isExposedPolymer
      ? "polymer"
      : floorSel?.productName?.toLowerCase().includes("tile") ||
        floorSel?.productName?.toLowerCase().includes("porcelain")
      ? "tile"
      : "plank";

    return {
      paintSel,
      floorSel,
      cabSel,
      counterSel,
      plumbSel,
      wallHex: isExposedPolymer
        ? "#F8FAFC"
        : paintSel?.colorHex || "#F2EFE9",
      wallLabel: isExposedPolymer
        ? "Exposed Nuform CF8i Polymer White"
        : paintSel
        ? `${paintSel.manufacturer} ${paintSel.colorName} (${
            paintSel.colorCode || paintSel.finish
          })`
        : "SW 7008 Alabaster (Default)",
      wallFinish: paintSel?.finish || "Cashmere Eggshell",
      floorHex:
        floorSel?.colorHex || (isExposedPolymer ? "#CBD5E1" : "#E6DAC8"),
      floorLabel: floorSel
        ? `${floorSel.manufacturer} — ${floorSel.productName}`
        : isExposedPolymer
        ? "Sealed Hydronic Concrete Slab"
        : "Kährs Oak Nouveau Snow",
      floorPattern,
      cabinetHex: cabSel?.colorHex || "#D7C4A5",
      cabinetLabel: cabSel
        ? `${cabSel.manufacturer} — ${cabSel.colorName}`
        : "Natural Rift White Oak",
      counterHex: counterSel?.colorHex || "#EFECE6",
      counterLabel: counterSel
        ? `${counterSel.manufacturer} — ${counterSel.productName}`
        : "Cambria Brittanicca Warm Quartz",
      fixtureHex: plumbSel?.colorHex || "#C5A059",
    };
  }, [activeRoom, activeRoomSelections]);

  // "Compare Selected vs. Alternate Finish" State
  const [altOverride, setAltOverride] = useState<AlternateFinishOverride>({
    enabled: false,
    splitView5050: true,
    wallHex: "#434341",
    wallLabel: "SW 7069 Iron Ore (Satin Accent)",
    wallSheen: "satin",
    floorHex: "#DCD7CC",
    floorLabel: "Atlas Concorde Boost Stone Ivory 24x48 Tile",
    floorPattern: "tile",
    cabinetHex: "#434341",
    cabinetLabel: "SW 7069 Iron Ore Inset Shaker",
    counterHex: "#EFECE6",
    counterLabel: "Cambria Brittanicca Warm 3cm",
  });

  // Reset first-person offset when switching rooms
  useEffect(() => {
    setFpOffset({ x: 0, z: 0 });
  }, [activeRoom?.id]);

  // Keyboard WASD + Arrow navigation in Walkthrough mode
  useEffect(() => {
    if (tourMode !== "WALKTHROUGH") return;
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const step = 2.0;
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        e.preventDefault();
        setFpOffset((prev) => ({
          x: prev.x - Math.sin(fpYaw) * step,
          z: prev.z - Math.cos(fpYaw) * step,
        }));
      } else if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") {
        e.preventDefault();
        setFpOffset((prev) => ({
          x: prev.x + Math.sin(fpYaw) * step,
          z: prev.z + Math.cos(fpYaw) * step,
        }));
      } else if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") {
        e.preventDefault();
        setFpYaw((prev) => prev + 0.18);
      } else if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
        e.preventDefault();
        setFpYaw((prev) => prev - 0.18);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tourMode, fpYaw]);

  // Compute deterministic architectural layout positions from room gridX / gridZ / pinX / pinY
  const roomLayouts = useMemo(() => {
    const visible = interiorRooms.filter(
      (r) => floorFilter === "ALL" || r.floorLevel === floorFilter
    );
    const list = visible.length > 0 ? visible : interiorRooms;

    // Calculate center offset so the entire house centers nicely around (0, 0, 0)
    const rawCoords = list.map((r, idx) => {
      const w = Math.max(8, Number(r.lengthFt) || 16);
      const d = Math.max(8, Number(r.widthFt) || 14);
      const h = Math.max(8, Number(r.ceilingHeightFt) || 10);
      const gx =
        typeof r.gridX === "number" && (r.gridX !== 0 || idx === 0)
          ? Number(r.gridX)
          : ((Number(r.pinX) || 50) - 50) * 1.1;
      const gz =
        typeof r.gridZ === "number" && (r.gridZ !== 0 || idx === 0)
          ? Number(r.gridZ)
          : ((Number(r.pinY) || 50) - 50) * 0.9;
      return { room: r, w, d, h, gx, gz };
    });

    if (rawCoords.length === 0) return [];

    const minX = Math.min(...rawCoords.map((c) => c.gx));
    const maxX = Math.max(...rawCoords.map((c) => c.gx + c.w));
    const minZ = Math.min(...rawCoords.map((c) => c.gz));
    const maxZ = Math.max(...rawCoords.map((c) => c.gz + c.d));
    const centerShiftX = (minX + maxX) / 2;
    const centerShiftZ = (minZ + maxZ) / 2;

    return rawCoords.map((c) => ({
      room: c.room,
      w: c.w,
      d: c.d,
      h: c.h,
      centerX: c.gx + c.w / 2 - centerShiftX,
      centerZ: c.gz + c.d / 2 - centerShiftZ,
    }));
  }, [interiorRooms, floorFilter]);

  // Core Vanilla Three.js Procedural Architectural Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#070B14");
    scene.fog = new THREE.FogExp2("#070B14", 0.0045);

    const camera = new THREE.PerspectiveCamera(
      tourMode === "WALKTHROUGH" ? 64 : 45,
      width / height,
      0.2,
      400
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Ambient + Hemisphere + Natural Daylight Sun Light
    const hemiLight = new THREE.HemisphereLight(0xfefce8, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const sunRad = (daylightAzimuthDeg * Math.PI) / 180;
    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    dirLight.position.set(
      Math.cos(sunRad) * 55,
      48,
      Math.sin(sunRad) * 55
    );
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Subtle ground site pad & architectural grid
    const siteGrid = new THREE.GridHelper(130, 65, 0x334155, 0x1e293b);
    siteGrid.position.y = -0.15;
    scene.add(siteGrid);

    const disposableGeometries: THREE.BufferGeometry[] = [];
    const disposableMaterials: THREE.Material[] = [];
    const disposableTextures: THREE.Texture[] = [];

    // Build each Room procedurally from its DB dimensions & SelectionItem finishes
    for (const layout of roomLayouts) {
      const { room, w, d, h, centerX, centerZ } = layout;
      const isSelected = activeRoom?.id === room.id;
      const roomSels = (selections || []).filter((s) => s.roomId === room.id);
      const roomOpenings = (openings || []).filter((o) => o.roomId === room.id);

      const isExposedPolymer = room.cf8iInteriorFinish?.includes(
        "Exposed Nuform Polymer"
      );
      const paintSel = roomSels.find(
        (s) => s.tradeCategory?.slug === "paint-finishes"
      );
      const floorSel = roomSels.find(
        (s) => s.tradeCategory?.slug === "flooring-tile"
      );
      const cabSel = roomSels.find(
        (s) => s.tradeCategory?.slug === "cabinetry-millwork"
      );
      const counterSel = roomSels.find(
        (s) => s.tradeCategory?.slug === "countertops-stone"
      );
      const plumbSel = roomSels.find(
        (s) => s.tradeCategory?.slug === "plumbing-fixtures"
      );

      const baseWallHex = isExposedPolymer
        ? "#F8FAFC"
        : paintSel?.colorHex || "#F2EFE9";
      const baseWallRoughness = isExposedPolymer
        ? 0.25
        : getRoughnessForSheen(paintSel?.finish || "Eggshell");

      const baseFloorHex =
        floorSel?.colorHex || (isExposedPolymer ? "#CBD5E1" : "#E6DAC8");
      const baseFloorPattern: "plank" | "tile" | "polymer" = isExposedPolymer
        ? "polymer"
        : floorSel?.productName?.toLowerCase().includes("tile") ||
          floorSel?.productName?.toLowerCase().includes("porcelain")
        ? "tile"
        : "plank";

      const baseCabHex = cabSel?.colorHex || "#D7C4A5";
      const baseCounterHex = counterSel?.colorHex || "#EFECE6";
      const baseFixtureHex = plumbSel?.colorHex || "#C5A059";

      const useAltFull =
        isSelected && altOverride.enabled && !altOverride.splitView5050;
      const useAltSplit =
        isSelected && altOverride.enabled && altOverride.splitView5050;

      const roomGroup = new THREE.Group();
      roomGroup.position.set(centerX, 0, centerZ);
      scene.add(roomGroup);

      // 1. Floor Mesh (supports 50/50 split comparison when active on the selected room)
      if (useAltSplit) {
        const leftTex = createProceduralFloorTexture(
          baseFloorHex,
          baseFloorPattern
        );
        const rightTex = createProceduralFloorTexture(
          altOverride.floorHex,
          altOverride.floorPattern
        );
        disposableTextures.push(leftTex, rightTex);

        const leftGeo = new THREE.BoxGeometry(w / 2, 0.35, d);
        const leftMat = new THREE.MeshStandardMaterial({
          map: leftTex,
          roughness: baseFloorPattern === "tile" ? 0.35 : 0.55,
        });
        const leftMesh = new THREE.Mesh(leftGeo, leftMat);
        leftMesh.position.set(-w / 4, 0.175, 0);
        leftMesh.receiveShadow = true;
        roomGroup.add(leftMesh);

        const rightGeo = new THREE.BoxGeometry(w / 2, 0.35, d);
        const rightMat = new THREE.MeshStandardMaterial({
          map: rightTex,
          roughness: altOverride.floorPattern === "tile" ? 0.35 : 0.55,
        });
        const rightMesh = new THREE.Mesh(rightGeo, rightMat);
        rightMesh.position.set(w / 4, 0.175, 0);
        rightMesh.receiveShadow = true;
        roomGroup.add(rightMesh);

        // Glowing center split divider line
        const divGeo = new THREE.BoxGeometry(0.12, 0.42, d + 0.2);
        const divMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        const divMesh = new THREE.Mesh(divGeo, divMat);
        divMesh.position.set(0, 0.22, 0);
        roomGroup.add(divMesh);

        disposableGeometries.push(leftGeo, rightGeo, divGeo);
        disposableMaterials.push(leftMat, rightMat, divMat);
      } else {
        const activeFloorHex = useAltFull ? altOverride.floorHex : baseFloorHex;
        const activeFloorPattern = useAltFull
          ? altOverride.floorPattern
          : baseFloorPattern;
        const floorTex = createProceduralFloorTexture(
          activeFloorHex,
          activeFloorPattern
        );
        disposableTextures.push(floorTex);

        const floorGeo = new THREE.BoxGeometry(w, 0.35, d);
        const floorMat = new THREE.MeshStandardMaterial({
          map: floorTex,
          roughness: activeFloorPattern === "tile" ? 0.35 : 0.55,
        });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.position.set(0, 0.175, 0);
        floorMesh.receiveShadow = true;
        roomGroup.add(floorMesh);
        disposableGeometries.push(floorGeo);
        disposableMaterials.push(floorMat);
      }

      // Optional Hydronic Radiant PEX-a Loop Overlay on heated slab zones
      if (showRadiantLoopsOverlay && room.hasRadiantSlab) {
        const loopPoints: THREE.Vector3[] = [];
        const margin = 1.4;
        const spacing = 1.6;
        let dir = 1;
        for (let z = -d / 2 + margin; z <= d / 2 - margin; z += spacing) {
          const xStart = dir === 1 ? -w / 2 + margin : w / 2 - margin;
          const xEnd = dir === 1 ? w / 2 - margin : -w / 2 + margin;
          loopPoints.push(new THREE.Vector3(xStart, 0.4, z));
          loopPoints.push(new THREE.Vector3(xEnd, 0.4, z));
          dir *= -1;
        }
        const loopGeo = new THREE.BufferGeometry().setFromPoints(loopPoints);
        const loopMat = new THREE.LineBasicMaterial({
          color: 0xf97316,
          linewidth: 2,
        });
        const loopLine = new THREE.Line(loopGeo, loopMat);
        roomGroup.add(loopLine);
        disposableGeometries.push(loopGeo);
        disposableMaterials.push(loopMat);
      }

      // 2. Wall Assemblies: Nuform CF8i (7-7/8" = 0.656 ft) vs. 2x4 Interior Partitions (0.375 ft)
      const cf8iThickness = 0.66;
      const stud2x4Thickness = 0.38;
      const northSouthThick = room.hasExteriorCF8iWall
        ? cf8iThickness
        : stud2x4Thickness;
      const eastWestThick = room.hasGarageFireWall
        ? cf8iThickness
        : stud2x4Thickness;

      const leftWallColor = useAltFull ? altOverride.wallHex : baseWallHex;
      const rightWallColor =
        useAltFull || useAltSplit ? altOverride.wallHex : baseWallHex;

      const leftWallMat = new THREE.MeshStandardMaterial({
        color: leftWallColor,
        roughness: baseWallRoughness,
      });
      const rightWallMat = new THREE.MeshStandardMaterial({
        color: rightWallColor,
        roughness:
          useAltFull || useAltSplit
            ? getRoughnessForSheen(altOverride.wallSheen)
            : baseWallRoughness,
      });
      disposableMaterials.push(leftWallMat, rightWallMat);

      const wallHeight =
        tourMode === "DOLLHOUSE" && showRoofCeilingCutaway ? h * 0.62 : h;

      // North Wall (-Z) with Window Cutouts if room has windows
      const hasWindow = roomOpenings.some((o) => o.openingType === "Window");
      if (hasWindow) {
        const sideW = w * 0.28;
        const winW = w - sideW * 2;
        const sillH = Math.min(2.6, wallHeight * 0.35);
        const headH = Math.max(0.8, wallHeight * 0.16);
        const glassH = Math.max(1.2, wallHeight - sillH - headH);

        const nwLeftGeo = new THREE.BoxGeometry(
          sideW,
          wallHeight,
          northSouthThick
        );
        const nwLeft = new THREE.Mesh(nwLeftGeo, leftWallMat);
        nwLeft.position.set(
          -w / 2 + sideW / 2,
          wallHeight / 2,
          -d / 2 + northSouthThick / 2
        );

        const nwRightGeo = new THREE.BoxGeometry(
          sideW,
          wallHeight,
          northSouthThick
        );
        const nwRight = new THREE.Mesh(nwRightGeo, rightWallMat);
        nwRight.position.set(
          w / 2 - sideW / 2,
          wallHeight / 2,
          -d / 2 + northSouthThick / 2
        );

        const sillGeo = new THREE.BoxGeometry(winW, sillH, northSouthThick);
        const sillMesh = new THREE.Mesh(sillGeo, leftWallMat);
        sillMesh.position.set(0, sillH / 2, -d / 2 + northSouthThick / 2);

        const headerGeo = new THREE.BoxGeometry(winW, headH, northSouthThick);
        const headerMesh = new THREE.Mesh(headerGeo, leftWallMat);
        headerMesh.position.set(
          0,
          wallHeight - headH / 2,
          -d / 2 + northSouthThick / 2
        );

        // Triple-Pane Low-E Glass & Matte Black Pella Frame inside 8.375" CF8i Buck
        const glassGeo = new THREE.BoxGeometry(winW, glassH, 0.12);
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0xbae6fd,
          transparent: true,
          opacity: 0.34,
          roughness: 0.1,
          transmission: 0.6,
        });
        const glassMesh = new THREE.Mesh(glassGeo, glassMat);
        glassMesh.position.set(
          0,
          sillH + glassH / 2,
          -d / 2 + northSouthThick / 2
        );

        roomGroup.add(nwLeft, nwRight, sillMesh, headerMesh, glassMesh);
        disposableGeometries.push(
          nwLeftGeo,
          nwRightGeo,
          sillGeo,
          headerGeo,
          glassGeo
        );
        disposableMaterials.push(glassMat);
      } else {
        const northGeo = new THREE.BoxGeometry(w, wallHeight, northSouthThick);
        const northMesh = new THREE.Mesh(northGeo, leftWallMat);
        northMesh.position.set(0, wallHeight / 2, -d / 2 + northSouthThick / 2);
        northMesh.castShadow = true;
        roomGroup.add(northMesh);
        disposableGeometries.push(northGeo);
      }

      // South Wall (+Z) with Doorway Portal Opening so rooms connect visually
      const doorW = Math.min(3.5, w * 0.28);
      const southSegW = (w - doorW) / 2;
      const swLeftGeo = new THREE.BoxGeometry(
        southSegW,
        wallHeight,
        stud2x4Thickness
      );
      const swLeft = new THREE.Mesh(swLeftGeo, leftWallMat);
      swLeft.position.set(
        -w / 2 + southSegW / 2,
        wallHeight / 2,
        d / 2 - stud2x4Thickness / 2
      );

      const swRightGeo = new THREE.BoxGeometry(
        southSegW,
        wallHeight,
        stud2x4Thickness
      );
      const swRight = new THREE.Mesh(swRightGeo, rightWallMat);
      swRight.position.set(
        w / 2 - southSegW / 2,
        wallHeight / 2,
        d / 2 - stud2x4Thickness / 2
      );
      roomGroup.add(swLeft, swRight);
      disposableGeometries.push(swLeftGeo, swRightGeo);

      // West Wall (-X) & East Wall (+X)
      const westGeo = new THREE.BoxGeometry(eastWestThick, wallHeight, d);
      const westMesh = new THREE.Mesh(westGeo, leftWallMat);
      westMesh.position.set(-w / 2 + eastWestThick / 2, wallHeight / 2, 0);
      westMesh.castShadow = true;

      const eastGeo = new THREE.BoxGeometry(eastWestThick, wallHeight, d);
      const eastMesh = new THREE.Mesh(eastGeo, rightWallMat);
      eastMesh.position.set(w / 2 - eastWestThick / 2, wallHeight / 2, 0);
      eastMesh.castShadow = true;

      roomGroup.add(westMesh, eastMesh);
      disposableGeometries.push(westGeo, eastGeo);

      // 3. Ceiling Plane (shown in First-Person Walkthrough or when Cutaway is toggled off)
      if (tourMode === "WALKTHROUGH" || !showRoofCeilingCutaway) {
        const ceilGeo = new THREE.BoxGeometry(w, 0.25, d);
        const ceilMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.9,
        });
        const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
        ceilMesh.position.set(0, h, 0);
        roomGroup.add(ceilMesh);
        disposableGeometries.push(ceilGeo);
        disposableMaterials.push(ceilMat);
      }

      // 4. Interior Architectural Casework, Countertops & Fixtures bound to live SelectionItems
      const activeCabHex =
        useAltFull || useAltSplit ? altOverride.cabinetHex : baseCabHex;
      const activeCounterHex =
        useAltFull || useAltSplit ? altOverride.counterHex : baseCounterHex;

      const cabMat = new THREE.MeshStandardMaterial({
        color: activeCabHex,
        roughness: 0.48,
      });
      const counterMat = new THREE.MeshStandardMaterial({
        color: activeCounterHex,
        roughness: 0.22,
        metalness: 0.08,
      });
      const fixtureMat = new THREE.MeshStandardMaterial({
        color: baseFixtureHex,
        roughness: 0.25,
        metalness: 0.78,
      });
      disposableMaterials.push(cabMat, counterMat, fixtureMat);

      const lowerName = room.name.toLowerCase();
      if (lowerName.includes("kitchen")) {
        // Rear Perimeter Base Cabinets + Quartz Top
        const baseCabGeo = new THREE.BoxGeometry(w * 0.66, 3.0, 2.1);
        const baseCab = new THREE.Mesh(baseCabGeo, cabMat);
        baseCab.position.set(0, 1.65, -d / 2 + 1.8);
        baseCab.castShadow = true;

        const perimTopGeo = new THREE.BoxGeometry(w * 0.67, 0.22, 2.25);
        const perimTop = new THREE.Mesh(perimTopGeo, counterMat);
        perimTop.position.set(0, 3.26, -d / 2 + 1.8);

        // Center Waterfall Quartz Island
        const islW = Math.min(10, w * 0.52);
        const islD = 3.6;
        const islBaseGeo = new THREE.BoxGeometry(islW, 3.0, islD);
        const islBase = new THREE.Mesh(islBaseGeo, cabMat);
        islBase.position.set(0, 1.65, 0.5);
        islBase.castShadow = true;

        const islTopGeo = new THREE.BoxGeometry(islW + 0.3, 0.25, islD + 0.4);
        const islTop = new THREE.Mesh(islTopGeo, counterMat);
        islTop.position.set(0, 3.28, 0.5);

        // Faucet & 3 Island Pendants
        const faucetGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
        const faucet = new THREE.Mesh(faucetGeo, fixtureMat);
        faucet.position.set(0, 3.9, 0.5);

        roomGroup.add(baseCab, perimTop, islBase, islTop, faucet);
        disposableGeometries.push(
          baseCabGeo,
          perimTopGeo,
          islBaseGeo,
          islTopGeo,
          faucetGeo
        );
      } else if (lowerName.includes("bath")) {
        // Wall-Hung Floating Double Vanity + Quartz Top
        const vanW = Math.min(6.0, w * 0.45);
        const vanGeo = new THREE.BoxGeometry(vanW, 1.9, 1.85);
        const vanMesh = new THREE.Mesh(vanGeo, cabMat);
        vanMesh.position.set(-w * 0.16, 2.1, -d / 2 + 1.5);

        const vanTopGeo = new THREE.BoxGeometry(vanW + 0.15, 0.2, 1.95);
        const vanTop = new THREE.Mesh(vanTopGeo, counterMat);
        vanTop.position.set(-w * 0.16, 3.15, -d / 2 + 1.5);

        // Zero-Entry Glass Shower Partition
        const shGlassGeo = new THREE.BoxGeometry(
          0.1,
          Math.min(6.8, wallHeight * 0.9),
          4.2
        );
        const shGlassMat = new THREE.MeshPhysicalMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.32,
          roughness: 0.08,
        });
        const shGlass = new THREE.Mesh(shGlassGeo, shGlassMat);
        shGlass.position.set(
          w * 0.18,
          Math.min(3.4, wallHeight * 0.45),
          -d / 2 + 2.5
        );

        roomGroup.add(vanMesh, vanTop, shGlass);
        disposableGeometries.push(vanGeo, vanTopGeo, shGlassGeo);
        disposableMaterials.push(shGlassMat);
      } else if (lowerName.includes("great room")) {
        // Hearth & Built-In Media Cabinetry
        const hearthGeo = new THREE.BoxGeometry(
          5.5,
          Math.min(wallHeight * 0.85, 8.5),
          1.4
        );
        const hearthMesh = new THREE.Mesh(hearthGeo, counterMat);
        hearthMesh.position.set(
          0,
          Math.min(wallHeight * 0.425, 4.25),
          -d / 2 + 1.2
        );

        const leftBuiltInGeo = new THREE.BoxGeometry(3.8, 2.4, 1.5);
        const leftBuiltIn = new THREE.Mesh(leftBuiltInGeo, cabMat);
        leftBuiltIn.position.set(-4.8, 1.35, -d / 2 + 1.25);

        const rightBuiltIn = new THREE.Mesh(leftBuiltInGeo, cabMat);
        rightBuiltIn.position.set(4.8, 1.35, -d / 2 + 1.25);

        roomGroup.add(hearthMesh, leftBuiltIn, rightBuiltIn);
        disposableGeometries.push(hearthGeo, leftBuiltInGeo);
      } else if (lowerName.includes("bed")) {
        // Architectural Headboard & Bed Platform
        const headGeo = new THREE.BoxGeometry(6.8, 3.8, 0.4);
        const headMesh = new THREE.Mesh(headGeo, cabMat);
        headMesh.position.set(0, 2.1, -d / 2 + 0.9);

        const bedGeo = new THREE.BoxGeometry(5.6, 1.6, 6.6);
        const bedMesh = new THREE.Mesh(bedGeo, counterMat);
        bedMesh.position.set(0, 0.95, -d / 2 + 4.2);

        roomGroup.add(headMesh, bedMesh);
        disposableGeometries.push(headGeo, bedGeo);
      }

      // 5. Highlight Ring around Currently Selected Room
      if (isSelected) {
        const ringGeo = new THREE.EdgesGeometry(
          new THREE.BoxGeometry(w + 0.5, wallHeight + 0.2, d + 0.5)
        );
        const ringMat = new THREE.LineBasicMaterial({
          color: 0xf59e0b,
          linewidth: 2,
        });
        const ring = new THREE.LineSegments(ringGeo, ringMat);
        ring.position.set(0, wallHeight / 2, 0);
        roomGroup.add(ring);
        disposableGeometries.push(ringGeo);
        disposableMaterials.push(ringMat);
      }
    }

    // Position Camera based on DOLLHOUSE vs WALKTHROUGH mode
    const activeLayout =
      roomLayouts.find((l) => l.room.id === activeRoom?.id) || roomLayouts[0];

    if (tourMode === "WALKTHROUGH" && activeLayout) {
      const eyeY = 5.4;
      const clampX = Math.max(
        -activeLayout.w / 2 + 1.8,
        Math.min(activeLayout.w / 2 - 1.8, fpOffset.x)
      );
      const clampZ = Math.max(
        -activeLayout.d / 2 + 1.8,
        Math.min(activeLayout.d / 2 - 1.8, fpOffset.z + activeLayout.d * 0.22)
      );

      const camX = activeLayout.centerX + clampX;
      const camZ = activeLayout.centerZ + clampZ;
      camera.position.set(camX, eyeY, camZ);

      const lookX = camX - Math.sin(fpYaw) * 10;
      const lookZ = camZ - Math.cos(fpYaw) * 10;
      camera.lookAt(lookX, eyeY - 0.35, lookZ);
    } else {
      // Dollhouse Overview Orbit Camera
      const targetX = activeLayout ? activeLayout.centerX * 0.35 : 0;
      const targetZ = activeLayout ? activeLayout.centerZ * 0.35 : 0;
      const camX =
        targetX +
        orbitDistance * Math.sin(orbitPitch) * Math.sin(orbitAngle);
      const camY = Math.max(12, orbitDistance * Math.cos(orbitPitch));
      const camZ =
        targetZ +
        orbitDistance * Math.sin(orbitPitch) * Math.cos(orbitAngle);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(targetX, 3.5, targetZ);
    }

    renderer.render(scene, camera);

    function handleResize() {
      if (!container) return;
      const wNew = container.clientWidth || 960;
      const hNew = container.clientHeight || 540;
      camera.aspect = wNew / hNew;
      camera.updateProjectionMatrix();
      renderer.setSize(wNew, hNew);
      renderer.render(scene, camera);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      disposableTextures.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, [
    roomLayouts,
    activeRoom?.id,
    selections,
    openings,
    tourMode,
    showRadiantLoopsOverlay,
    showRoofCeilingCutaway,
    daylightAzimuthDeg,
    orbitAngle,
    orbitPitch,
    orbitDistance,
    fpYaw,
    fpOffset,
    altOverride,
  ]);

  // Mouse Drag to Orbit (Dollhouse) or Look Around (Walkthrough)
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
  }>({ active: false, startX: 0, startY: 0 });

  function handlePointerDown(e: React.PointerEvent) {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;

    if (tourMode === "WALKTHROUGH") {
      setFpYaw((prev) => prev - dx * 0.006);
    } else {
      setOrbitAngle((prev) => prev - dx * 0.007);
      setOrbitPitch((prev) =>
        Math.max(0.28, Math.min(1.38, prev - dy * 0.006))
      );
    }
  }

  function handlePointerUp() {
    dragRef.current.active = false;
  }

  // Trigger Photorealistic AI Room Preview (`POST /api/rooms/[roomId]/render-preview`)
  async function handleGeneratePhotorealisticPreview(useAltVariant = false) {
    if (!activeRoom) return;
    setRenderingPreview(true);
    setRenderStatusMsg(
      `Compiling room dimensions (${activeRoom.lengthFt}'×${activeRoom.widthFt}'×${activeRoom.ceilingHeightFt}'), Nuform CF8i envelope, daylight windows, and active finish swatches...`
    );

    try {
      const payload =
        useAltVariant && altOverride.enabled
          ? {
              variantLabel: "Alternate Comparison Finish",
              overrideWallHex: altOverride.wallHex,
              overrideWallLabel: altOverride.wallLabel,
              overrideFloorHex: altOverride.floorHex,
              overrideFloorLabel: altOverride.floorLabel,
              overrideFloorPattern: altOverride.floorPattern,
              overrideCabinetHex: altOverride.cabinetHex,
              overrideCabinetLabel: altOverride.cabinetLabel,
              overrideCounterHex: altOverride.counterHex,
              overrideCounterLabel: altOverride.counterLabel,
            }
          : {
              variantLabel: "Selected Room Specification",
            };

      const res = await fetch(`/api/rooms/${activeRoom.id}/render-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.ok && data.render) {
        setLocalRendersByRoom((prev) => ({
          ...prev,
          [activeRoom.id]: data.renders || [
            data.render,
            ...(prev[activeRoom.id] || activeRoom.renders || []),
          ],
        }));
        setRenderStatusMsg(
          `Saved photorealistic room preview (${data.source}) to RoomRender history!`
        );
        onSelectionUpdated();
      } else {
        setRenderStatusMsg(data.error || "Could not generate room preview.");
      }
    } catch (err: any) {
      setRenderStatusMsg(
        err?.message || "Failed to generate room render preview."
      );
    } finally {
      setRenderingPreview(false);
    }
  }

  // Apply an alternate finish preset directly to the active room's SelectionItem
  async function handleApplyPresetToRoomSelection(
    selectionId: string,
    presetId: string
  ) {
    if (!selectionId || !presetId) return;
    setApplyingOverride(true);
    try {
      await fetch(`/api/selections/${selectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_preset",
          presetId,
        }),
      });
      onSelectionUpdated();
    } finally {
      setApplyingOverride(false);
    }
  }

  const activeRoomRenders = useMemo(() => {
    if (!activeRoom) return [];
    return localRendersByRoom[activeRoom.id] || activeRoom.renders || [];
  }, [activeRoom, localRendersByRoom]);

  const comparedRenders = useMemo(() => {
    if (compareRenderIds.length === 0) {
      return activeRoomRenders.slice(0, 2);
    }
    return activeRoomRenders.filter((r: any) =>
      compareRenderIds.includes(r.id)
    );
  }, [activeRoomRenders, compareRenderIds]);

  return (
    <div className="space-y-5">
      {/* Top 3D Tour & Visualizer Control Bar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Box className="w-4 h-4" />
              Interactive 3D House Tour &amp; Room Finish Visualizer (Nuform
              CF8i + 2x4 Assembly)
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Procedurally extruded from live database room dimensions (
              <code>lengthFt × widthFt × ceilingHeightFt</code>),{" "}
              <code>7-7/8&quot;</code> Nuform CF8i walls, window/door cutouts,
              and active room finish selections.
            </p>
          </div>

          {/* Dollhouse Overview vs First-Person Walkthrough Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-950 border border-slate-800 p-1">
              <button
                type="button"
                onClick={() => setTourMode("DOLLHOUSE")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  tourMode === "DOLLHOUSE"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                3D Dollhouse Overview
              </button>
              <button
                type="button"
                onClick={() => setTourMode("WALKTHROUGH")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  tourMode === "WALKTHROUGH"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                First-Person Walkthrough (WASD)
              </button>
            </div>

            <button
              type="button"
              disabled={renderingPreview || !activeRoom}
              onClick={() => handleGeneratePhotorealisticPreview(false)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition whitespace-nowrap"
            >
              {renderingPreview ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rendering Photorealistic Preview...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Render Photorealistic Preview
                </>
              )}
            </button>
          </div>
        </div>

        {/* Room Portal Bar (Click any room to teleport or inspect in 3D) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Room Portals:
            </span>
            {interiorRooms.map((r) => {
              const isAct = activeRoom?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRoom(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    isAct
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  }`}
                >
                  <span>{r.name}</span>
                  <span
                    className={`text-[10px] font-mono ${
                      isAct ? "text-slate-900" : "text-slate-500"
                    }`}
                  >
                    {r.lengthFt}&apos;×{r.widthFt}&apos;
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                setShowRadiantLoopsOverlay(!showRadiantLoopsOverlay)
              }
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition ${
                showRadiantLoopsOverlay
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              {showRadiantLoopsOverlay
                ? "Hide Radiant PEX Loops"
                : "Show Radiant PEX Loops"}
            </button>

            <button
              type="button"
              onClick={() =>
                setAltOverride((prev) => ({
                  ...prev,
                  enabled: !prev.enabled,
                }))
              }
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition ${
                altOverride.enabled
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              {altOverride.enabled
                ? "Comparing Selected vs. Alternate (ON)"
                : "Compare Selected vs. Alternate Finish"}
            </button>
          </div>
        </div>
      </div>

      {/* Main 3D Viewport + Right-Hand Live Material & Finish Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left 8 Columns: Interactive Three.js WebGL Canvas & On-Screen Controls */}
        <div className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <div className="relative w-full h-[540px] select-none">
            <div
              ref={mountRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={(e) => {
                if (tourMode === "DOLLHOUSE") {
                  setOrbitDistance((prev) =>
                    Math.max(24, Math.min(125, prev + e.deltaY * 0.04))
                  );
                }
              }}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            />

            {/* Top-Left Active Room & Camera HUD Overlay */}
            {activeRoom && (
              <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs space-y-1 pointer-events-none max-w-md">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] uppercase">
                    {tourMode === "WALKTHROUGH"
                      ? "First-Person Walkthrough"
                      : "3D Dollhouse Cutaway"}
                  </span>
                  <span className="font-bold text-white">
                    {activeRoom.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono">
                  {activeRoom.lengthFt}&apos; L × {activeRoom.widthFt}&apos; W ×{" "}
                  {activeRoom.ceilingHeightFt}&apos; H ({activeRoom.floorAreaSqFt}{" "}
                  sq ft) • {activeRoom.cf8iInteriorFinish}
                </div>
                {altOverride.enabled && (
                  <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                    <SplitSquareHorizontal className="w-3.5 h-3.5" />
                    {altOverride.splitView5050
                      ? "50/50 Split View: Left = Selected Finish | Right = Alternate Finish"
                      : "Full Room Previewing Alternate Finish"}
                  </div>
                )}
              </div>
            )}

            {/* Top-Right Sun / Daylight Angle & Cutaway Controls */}
            <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-slate-300">Daylight:</span>
                <input
                  type="range"
                  min={20}
                  max={320}
                  value={daylightAzimuthDeg}
                  onChange={(e) =>
                    setDaylightAzimuthDeg(Number(e.target.value))
                  }
                  className="w-20 accent-amber-500 cursor-pointer"
                />
              </div>
              {tourMode === "DOLLHOUSE" && (
                <button
                  type="button"
                  onClick={() =>
                    setShowRoofCeilingCutaway(!showRoofCeilingCutaway)
                  }
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                >
                  {showRoofCeilingCutaway ? "Cutaway Walls" : "Full Height"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOrbitAngle(0.68);
                  setOrbitPitch(0.72);
                  setOrbitDistance(72);
                  setFpYaw(0);
                  setFpOffset({ x: 0, z: 0 });
                }}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Reset 3D Camera"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom On-Screen Walkthrough Touch / Click Controls */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-1.5 pointer-events-auto text-xs">
                {tourMode === "WALKTHROUGH" ? (
                  <>
                    <span className="text-[11px] text-slate-400 mr-1">
                      Walk / Look:
                    </span>
                    <button
                      type="button"
                      onClick={() => setFpYaw((p) => p + 0.25)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono"
                    >
                      ↺ Turn L
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFpOffset((p) => ({
                          x: p.x - Math.sin(fpYaw) * 2.2,
                          z: p.z - Math.cos(fpYaw) * 2.2,
                        }))
                      }
                      className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold"
                    >
                      ↑ Walk Forward (W)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFpOffset((p) => ({
                          x: p.x + Math.sin(fpYaw) * 2.2,
                          z: p.z + Math.cos(fpYaw) * 2.2,
                        }))
                      }
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      ↓ Step Back (S)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFpYaw((p) => p - 0.25)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono"
                    >
                      Turn R ↻
                    </button>
                  </>
                ) : (
                  <>
                    <Move className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] text-slate-300">
                      Drag to rotate 3D house • Scroll to zoom • Click any room
                      portal above to inspect or walk inside
                    </span>
                  </>
                )}
              </div>

              {/* Active Swatch Legend Pills on Bottom Right */}
              <div className="bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-2.5 pointer-events-auto text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded border border-slate-600"
                    style={{ backgroundColor: currentRoomFinishes.wallHex }}
                  />
                  <span className="text-slate-300">
                    Wall: <strong>{currentRoomFinishes.wallHex}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded border border-slate-600"
                    style={{ backgroundColor: currentRoomFinishes.floorHex }}
                  />
                  <span className="text-slate-300">
                    Floor: <strong>{currentRoomFinishes.floorHex}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded border border-slate-600"
                    style={{ backgroundColor: currentRoomFinishes.cabinetHex }}
                  />
                  <span className="text-slate-300">
                    Casework: <strong>{currentRoomFinishes.cabinetHex}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Live 3D Material Binding & Compare Selected vs. Alternate Finish Inspector */}
        <div className="xl:col-span-4 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Live 3D Room Finish Binding
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {activeRoom?.name || "Selected Room"}
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                {activeRoomSelections.length} Active Specs
              </span>
            </div>

            {/* Active Room Bound Materials */}
            <div className="space-y-2.5 text-xs">
              {/* 1. Wall Paint / CF8i Surface */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-lg border border-slate-700 shrink-0 shadow"
                      style={{ backgroundColor: currentRoomFinishes.wallHex }}
                    />
                    <div>
                      <div className="text-[10px] uppercase text-slate-400">
                        3D Wall &amp; Ceiling Surface
                      </div>
                      <div className="font-semibold text-white">
                        {currentRoomFinishes.wallLabel}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300">
                    {currentRoomFinishes.wallFinish}
                  </span>
                </div>

                {canEdit && currentRoomFinishes.paintSel && (
                  <select
                    value=""
                    disabled={applyingOverride}
                    onChange={(e) =>
                      handleApplyPresetToRoomSelection(
                        currentRoomFinishes.paintSel.id,
                        e.target.value
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-200"
                  >
                    <option value="" disabled>
                      Live Swap Wall Paint in 3D...
                    </option>
                    {catalogPresets
                      .filter((p) => p.tradeSlug === "paint-finishes")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.manufacturer} — {p.colorName} ({p.colorCode} •{" "}
                          {p.finish})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* 2. Flooring / Tile / Radiant Slab Surface */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-lg border border-slate-700 shrink-0 shadow"
                      style={{ backgroundColor: currentRoomFinishes.floorHex }}
                    />
                    <div>
                      <div className="text-[10px] uppercase text-slate-400">
                        3D Floor Mesh ({currentRoomFinishes.floorPattern})
                      </div>
                      <div className="font-semibold text-white">
                        {currentRoomFinishes.floorLabel}
                      </div>
                    </div>
                  </div>
                  {activeRoom?.hasRadiantSlab && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
                      Radiant Zone
                    </span>
                  )}
                </div>

                {canEdit && currentRoomFinishes.floorSel && (
                  <select
                    value=""
                    disabled={applyingOverride}
                    onChange={(e) =>
                      handleApplyPresetToRoomSelection(
                        currentRoomFinishes.floorSel.id,
                        e.target.value
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-200"
                  >
                    <option value="" disabled>
                      Live Swap Flooring / Tile in 3D...
                    </option>
                    {catalogPresets
                      .filter((p) => p.tradeSlug === "flooring-tile")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.manufacturer} — {p.productName} (
                          {p.isRadiantFloorApproved
                            ? "Radiant OK"
                            : "Unapproved"}
                          )
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* 3. Cabinetry & Countertop Slabs */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded border border-slate-700 shrink-0"
                    style={{ backgroundColor: currentRoomFinishes.cabinetHex }}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase text-slate-400">
                      Cabinetry
                    </div>
                    <div className="font-semibold text-white truncate">
                      {currentRoomFinishes.cabinetLabel}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded border border-slate-700 shrink-0"
                    style={{ backgroundColor: currentRoomFinishes.counterHex }}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase text-slate-400">
                      Countertop Slab
                    </div>
                    <div className="font-semibold text-white truncate">
                      {currentRoomFinishes.counterLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compare Selected vs. Alternate Finish Controls */}
            <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <SplitSquareHorizontal className="w-3.5 h-3.5" />
                  Compare Selected vs. Alternate Finish
                </span>
                <input
                  type="checkbox"
                  checked={altOverride.enabled}
                  onChange={(e) =>
                    setAltOverride({
                      ...altOverride,
                      enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {altOverride.enabled && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAltOverride({ ...altOverride, splitView5050: true })
                      }
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${
                        altOverride.splitView5050
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-900 text-slate-300"
                      }`}
                    >
                      50/50 Split Room
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAltOverride({ ...altOverride, splitView5050: false })
                      }
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${
                        !altOverride.splitView5050
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-900 text-slate-300"
                      }`}
                    >
                      Full Alternate
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        Alternate Wall Color
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={altOverride.wallHex}
                          onChange={(e) =>
                            setAltOverride({
                              ...altOverride,
                              wallHex: e.target.value,
                              wallLabel: `Custom Paint (${e.target.value})`,
                            })
                          }
                          className="w-7 h-7 rounded bg-slate-900 border border-slate-700 cursor-pointer"
                        />
                        <input
                          value={altOverride.wallHex}
                          onChange={(e) =>
                            setAltOverride({
                              ...altOverride,
                              wallHex: e.target.value,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        Alternate Floor Color
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={altOverride.floorHex}
                          onChange={(e) =>
                            setAltOverride({
                              ...altOverride,
                              floorHex: e.target.value,
                              floorLabel: `Custom Floor (${e.target.value})`,
                            })
                          }
                          className="w-7 h-7 rounded bg-slate-900 border border-slate-700 cursor-pointer"
                        />
                        <select
                          value={altOverride.floorPattern}
                          onChange={(e) =>
                            setAltOverride({
                              ...altOverride,
                              floorPattern: e.target.value as any,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-white"
                        >
                          <option value="plank">Wood Plank</option>
                          <option value="tile">Porcelain Tile</option>
                          <option value="polymer">Polymer Slab</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={renderingPreview}
                    onClick={() => handleGeneratePhotorealisticPreview(true)}
                    className="w-full py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Render Alternate Finish Preview for Side-by-Side Comparison
                  </button>
                </div>
              )}
            </div>
          </div>

          {renderStatusMsg && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{renderStatusMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Saved Photorealistic AI Room Render Gallery & Side-by-Side Comparison */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              Photorealistic AI Room Previews &amp; Side-by-Side Finish
              Comparison ({activeRoom?.name})
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Generated from {activeRoom?.name}&apos;s dimensions, windows,
              paint sheen, flooring/tile, cabinetry, countertops, and lighting
              kelvin. Persisted to <code>RoomRender</code> via{" "}
              <code>uploadAsset()</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={renderingPreview || !activeRoom}
              onClick={() => handleGeneratePhotorealisticPreview(false)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              {renderingPreview ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Render Selected Finishes
                </>
              )}
            </button>
            {altOverride.enabled && (
              <button
                type="button"
                disabled={renderingPreview || !activeRoom}
                onClick={() => handleGeneratePhotorealisticPreview(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                Render Alternate Finish
              </button>
            )}
          </div>
        </div>

        {activeRoomRenders.length === 0 ? (
          <div className="bg-slate-950/90 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-2">
            <Camera className="w-8 h-8 text-amber-400 mx-auto opacity-80" />
            <div className="text-sm font-bold text-white">
              No Photorealistic Room Previews Saved for {activeRoom?.name} Yet
            </div>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Click <strong>Render Photorealistic Preview</strong> above to
              compile all selected finishes in {activeRoom?.name} and generate a
              high-resolution architectural preview stored in{" "}
              <code>RoomRender</code>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeRoomRenders.map((renderItem: any, idx: number) => (
              <div
                key={renderItem.id}
                className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between"
              >
                <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                  <img
                    src={renderItem.imageUrl}
                    alt={`${activeRoom?.name} Render ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-slate-950/85 border border-amber-500/40 text-[11px] font-bold text-amber-300">
                    Render #{activeRoomRenders.length - idx} •{" "}
                    {new Date(renderItem.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <a
                    href={renderItem.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-700 text-slate-200"
                    title="Open Full-Resolution Render in New Tab"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="p-3.5 space-y-1">
                  <div className="text-[11px] font-semibold text-amber-300">
                    Compiled Architectural Specification Prompt Summary:
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                    {renderItem.promptSummary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
