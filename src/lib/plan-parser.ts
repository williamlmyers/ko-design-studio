import { computeCF8iJambDepth } from "./construction-rules";

export interface ParsedRoomPlan {
  name: string;
  roomType: string;
  floorLevel: string;
  lengthFt: number;
  widthFt: number;
  ceilingHeightFt: number;
  gridX: number;
  gridZ: number;
  pinX: number;
  pinY: number;
  hasRadiantSlab: boolean;
  hasExteriorCF8iWall: boolean;
  hasGarageFireWall: boolean;
  cf8iInteriorFinish: string;
}

export interface ParsedOpeningPlan {
  openingTag: string;
  roomName: string;
  openingType: string;
  widthInches: number;
  heightInches: number;
  sillHeightInches: number;
  manufacturer: string;
  modelSku: string;
  exteriorColor: string;
  interiorColor: string;
  glassSpec: string;
  jambDepthInches: number;
  fireRating: string;
  notes: string;
}

export interface ParsedPlanDecomposition {
  parserSource: "gemini-multimodal" | "smart-demo-fallback";
  modelUsed: string;
  suggestedProjectName: string;
  suggestedClientName: string;
  suggestedSiteAddress: string;
  envelopeWallSystem: string;
  interiorFramingType: string;
  hvacPrimaryHeat: string;
  rooms: ParsedRoomPlan[];
  openings: ParsedOpeningPlan[];
}

export function buildSmartDemoPlanDecomposition(fileName: string): ParsedPlanDecomposition {
  const baseTitle = fileName
    ? fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
    : "Custom ICF Solar Residence";

  const rooms: ParsedRoomPlan[] = [
    {
      name: "Exterior Facade & Nuform CF8i Shell",
      roomType: "EXTERIOR",
      floorLevel: "Exterior Envelope",
      lengthFt: 68,
      widthFt: 44,
      ceilingHeightFt: 11,
      gridX: 0,
      gridZ: 0,
      pinX: 12,
      pinY: 14,
      hasRadiantSlab: false,
      hasExteriorCF8iWall: true,
      hasGarageFireWall: true,
      cf8iInteriorFinish: "Exposed Nuform Polymer White/Tan — No Drywall",
    },
    {
      name: "Garage & Fire-Separated Mudroom",
      roomType: "GARAGE",
      floorLevel: "Main Level",
      lengthFt: 26,
      widthFt: 24,
      ceilingHeightFt: 11,
      gridX: 2,
      gridZ: 20,
      pinX: 20,
      pinY: 66,
      hasRadiantSlab: true,
      hasExteriorCF8iWall: true,
      hasGarageFireWall: true,
      cf8iInteriorFinish: "Exposed Nuform Polymer White/Tan — No Drywall",
    },
    {
      name: "Chef's Kitchen & Walk-In Pantry",
      roomType: "KITCHEN",
      floorLevel: "Main Level",
      lengthFt: 20,
      widthFt: 16,
      ceilingHeightFt: 10,
      gridX: 28,
      gridZ: 18,
      pinX: 46,
      pinY: 44,
      hasRadiantSlab: true,
      hasExteriorCF8iWall: true,
      hasGarageFireWall: true,
      cf8iInteriorFinish: "Furred Drywall + Paint",
    },
    {
      name: "Vaulted Great Room & Dining",
      roomType: "GREAT_ROOM",
      floorLevel: "Main Level",
      lengthFt: 24,
      widthFt: 18,
      ceilingHeightFt: 12,
      gridX: 28,
      gridZ: 0,
      pinX: 56,
      pinY: 26,
      hasRadiantSlab: true,
      hasExteriorCF8iWall: true,
      hasGarageFireWall: false,
      cf8iInteriorFinish: "Furred Drywall + Paint",
    },
    {
      name: "Primary Bedroom Suite",
      roomType: "PRIMARY_BED",
      floorLevel: "Main Level",
      lengthFt: 17,
      widthFt: 15,
      ceilingHeightFt: 10,
      gridX: 52,
      gridZ: 0,
      pinX: 80,
      pinY: 28,
      hasRadiantSlab: true,
      hasExteriorCF8iWall: true,
      hasGarageFireWall: false,
      cf8iInteriorFinish: "Furred Drywall + Paint",
    },
    {
      name: "Primary Bath & Wet-Zone Spa",
      roomType: "PRIMARY_BATH",
      floorLevel: "Main Level",
      lengthFt: 16,
      widthFt: 13,
      ceilingHeightFt: 10,
      gridX: 52,
      gridZ: 15,
      pinX: 82,
      pinY: 58,
      hasRadiantSlab: true,
      hasExteriorCF8iWall: true,
      hasGarageFireWall: false,
      cf8iInteriorFinish: "Furred Drywall + Paint",
    },
    {
      name: "Mechanical, Hydronic & Solar Vault",
      roomType: "MECHANICAL",
      floorLevel: "Main Level",
      lengthFt: 12,
      widthFt: 10,
      ceilingHeightFt: 10,
      gridX: 16,
      gridZ: 8,
      pinX: 30,
      pinY: 26,
      hasRadiantSlab: true,
      hasExteriorCF8iWall: true,
      hasGarageFireWall: true,
      cf8iInteriorFinish: "Exposed Nuform Polymer White/Tan — No Drywall",
    },
  ];

  const openings: ParsedOpeningPlan[] = [
    {
      openingTag: "W-01",
      roomName: "Vaulted Great Room & Dining",
      openingType: "Window",
      widthInches: 96,
      heightInches: 72,
      sillHeightInches: 24,
      manufacturer: "Pella Reserve Contemporary",
      modelSku: "PR-3P-9672",
      exteriorColor: "Matte Black Clad",
      interiorColor: "Warm White",
      glassSpec: "Triple-Pane Low-E Argon (U-0.20)",
      jambDepthInches: computeCF8iJambDepth("Window", true, false, "Furred Drywall + Paint"),
      fireRating: "Standard Exterior Envelope",
      notes: "CF8i 8-3/8\" deep buck & interior drywall return.",
    },
    {
      openingTag: "W-02",
      roomName: "Chef's Kitchen & Walk-In Pantry",
      openingType: "Window",
      widthInches: 60,
      heightInches: 48,
      sillHeightInches: 42,
      manufacturer: "Pella Reserve Contemporary",
      modelSku: "PR-AWN-6048",
      exteriorColor: "Matte Black Clad",
      interiorColor: "Warm White",
      glassSpec: "Triple-Pane Low-E Argon",
      jambDepthInches: computeCF8iJambDepth("Window", true, true, "Furred Drywall + Paint"),
      fireRating: "Standard Exterior Envelope",
      notes: "Over-sink casement with quartz sill return.",
    },
    {
      openingTag: "D-01",
      roomName: "Vaulted Great Room & Dining",
      openingType: "Exterior Door",
      widthInches: 144,
      heightInches: 96,
      sillHeightInches: 0,
      manufacturer: "Andersen Multi-Glide",
      modelSku: "AND-MLT-1208",
      exteriorColor: "Matte Black",
      interiorColor: "Natural White Oak",
      glassSpec: "Triple-Pane Tempered Low-E4",
      jambDepthInches: computeCF8iJambDepth("Exterior Door", true, false, "Furred Drywall + Paint"),
      fireRating: "Standard Exterior Envelope",
      notes: "Phase 1 thermally broken recessed slab sill pan.",
    },
    {
      openingTag: "FD-01",
      roomName: "Garage & Fire-Separated Mudroom",
      openingType: "Garage Fire-Separation Door",
      widthInches: 36,
      heightInches: 84,
      sillHeightInches: 0,
      manufacturer: "Masonite Safe 'N Sound Fire-Rated",
      modelSku: "MSN-90MIN-STL-3070",
      exteriorColor: "SW 7069 Iron Ore",
      interiorColor: "SW 7069 Iron Ore",
      glassSpec: "Solid Core 90-Min Fire Rated",
      jambDepthInches: computeCF8iJambDepth(
        "Garage Fire-Separation Door",
        true,
        true,
        "Exposed Nuform Polymer White/Tan — No Drywall"
      ),
      fireRating: "90-Min UL Self-Closing Fire Rated (2-Hr CF8i Wall)",
      notes: "Self-closing hinges + intumescent smoke gasket in CF8i garage separation wall.",
    },
  ];

  return {
    parserSource: "smart-demo-fallback",
    modelUsed: process.env.GEMINI_PLAN_MODEL || "gemini-3.5-flash-lite (Smart Demo Plan Parser)",
    suggestedProjectName: `${baseTitle} — KO Builders ICF Build`,
    suggestedClientName: "Custom Build Client",
    suggestedSiteAddress: "Delaware County, Sunbury OH",
    envelopeWallSystem: "Nuform ConForm 8-inch Insulated Form (CF8i)",
    interiorFramingType: "2x4 Light-Gauge Metal Framing",
    hvacPrimaryHeat: "Hydronic Radiant Concrete Slab",
    rooms,
    openings,
  };
}

/**
 * Generates room-specific SelectionItem seeds when onboarding a new project from decomposed plans.
 */
export function generateAutoSeedSelectionsForRoom(
  room: {
    id: string;
    name: string;
    floorAreaSqFt: number;
    netWallAreaSqFt: number;
    hasRadiantSlab: boolean;
    cf8iInteriorFinish: string;
  },
  tradeMap: Record<string, string>
) {
  const lower = room.name.toLowerCase();
  const isExposedPolymer = room.cf8iInteriorFinish.includes("Exposed Nuform Polymer");
  const items: Array<Record<string, any>> = [];

  if (lower.includes("exterior")) {
    items.push({
      roomId: room.id,
      tradeCategoryId: tradeMap["concrete-nuform-cf8i"],
      phaseGateway: "Phase 1: Pre-Pour / Slab & Nuform CF8i Embeds",
      status: "Option Selected",
      componentName: "Nuform ConForm CF8i Exterior Perimeter & Garage Fire-Wall Shell",
      manufacturer: "Nuform Building Technologies",
      productName: "CF8i 8\" Stay-In-Place Concrete Form (5.47\" Core + 2.13\" Insulation)",
      sku: "NUFORM-CF8I-STD",
      colorName: "White/Tan Polymer",
      colorCode: "CF8I",
      colorHex: "#E2E8F0",
      finish: "2-Hour Fire Rated Structural Shell",
      unitType: "sq ft",
      takeoffQty: 2400,
      wasteFactorPct: 4,
      unitCost: 18.5,
      allowanceAmount: 46000,
      leadTimeWeeks: 4,
      installNotes: "Pre-set all window bucks, hose bib sleeves, and solar conduit risers prior to concrete pour.",
    });
    return items;
  }

  // Paint & Drywall (Excluded on CF8i perimeter if Exposed Nuform Polymer)
  if (!isExposedPolymer && room.netWallAreaSqFt > 0) {
    items.push({
      roomId: room.id,
      tradeCategoryId: tradeMap["paint-finishes"],
      phaseGateway: "Phase 3: Post-Drywall Millwork, Tile & Trim-Out",
      status: "Pending Client Input",
      componentName: `${room.name} — Wall & Ceiling Paint Finish`,
      manufacturer: "Sherwin-Williams",
      productName: "Emerald Interior Acrylic Latex",
      sku: "SW-7008",
      colorName: "Alabaster",
      colorCode: "SW 7008",
      colorHex: "#F2EFE9",
      finish: "Cashmere Eggshell",
      unitType: "sq ft",
      takeoffQty: room.netWallAreaSqFt,
      wasteFactorPct: 5,
      unitCost: 1.85,
      allowanceAmount: Number((room.netWallAreaSqFt * 1.85).toFixed(0)),
      leadTimeWeeks: 2,
      installNotes: "Includes furred drywall over CF8i perimeter + 2x4 interior partitions.",
    });
  } else {
    items.push({
      roomId: room.id,
      tradeCategoryId: tradeMap["concrete-nuform-cf8i"],
      phaseGateway: "Phase 1: Pre-Pour / Slab & Nuform CF8i Embeds",
      status: "Client Approved & Locked",
      componentName: `${room.name} — Exposed Nuform Polymer Interior Wall Surface`,
      manufacturer: "Nuform Building Technologies",
      productName: "CF8i Washable White/Tan Polymer Surface (No Drywall/Paint Required)",
      sku: "NUFORM-EXP-WHT",
      colorName: "Polymer White",
      colorCode: "NF-WHT",
      colorHex: "#F8FAFC",
      finish: "Smooth Washable Class-A Polymer",
      unitType: "sq ft",
      takeoffQty: Number((room.floorAreaSqFt * 0.9).toFixed(0)),
      wasteFactorPct: 0,
      unitCost: 4.5,
      allowanceAmount: Number((room.floorAreaSqFt * 4.0).toFixed(0)),
      leadTimeWeeks: 4,
      installNotes: "Excluded from drywall and paint takeoffs per KO Builders CF8i rule.",
    });
  }

  // Flooring & Radiant Slab items
  if (room.hasRadiantSlab && !lower.includes("garage") && !lower.includes("mechanical")) {
    const isBathOrLaundry = lower.includes("bath") || lower.includes("laundry");
    items.push({
      roomId: room.id,
      tradeCategoryId: tradeMap["flooring-tile"],
      phaseGateway: "Phase 3: Post-Drywall Millwork, Tile & Trim-Out",
      status: "Pending Client Input",
      componentName: `${room.name} — Radiant-Approved ${
        isBathOrLaundry ? "Porcelain Floor Tile" : "Engineered White Oak Flooring"
      }`,
      manufacturer: isBathOrLaundry ? "Atlas Concorde" : "Kährs Sweden",
      productName: isBathOrLaundry
        ? "Boost Stone Ivory 24x48 Rectified Porcelain"
        : "Oak Nouveau Snow Radiant-Certified Engineered Plank",
      sku: isBathOrLaundry ? "AC-BST-IV2448" : "KAHRS-153N38EK09KW",
      colorName: isBathOrLaundry ? "Limestone Ivory" : "Nordic Warm White Oak",
      colorCode: isBathOrLaundry ? "AC-IV24" : "NW-104",
      colorHex: isBathOrLaundry ? "#DCD7CC" : "#E6DAC8",
      finish: "Matte",
      isRadiantFloorApproved: true,
      unitType: "sq ft",
      takeoffQty: room.floorAreaSqFt,
      wasteFactorPct: 10,
      unitCost: isBathOrLaundry ? 9.75 : 11.5,
      allowanceAmount: Number((room.floorAreaSqFt * 11).toFixed(0)),
      leadTimeWeeks: 4,
      installNotes: "Verified for hydronic radiant concrete slab installation.",
    });
  }

  // Bathroom-specific fixtures (Shower Valve, Vanity, Toilet, Exhaust/ERV)
  if (lower.includes("bath")) {
    items.push(
      {
        roomId: room.id,
        tradeCategoryId: tradeMap["plumbing-hydronic"],
        phaseGateway: "Phase 2: Pre-Drywall MEP, HVAC/IAQ & Low-Voltage Rough-In",
        status: "Pending Client Input",
        componentName: `${room.name} — Thermostatic Shower Rough-In Valve + Diverter`,
        manufacturer: "Brizo",
        productName: "MultiChoice Universal High-Flow Rough Valve",
        sku: "R60000-UNBXHF",
        colorName: "Brass Rough-In",
        colorCode: "BRZ-RGH",
        colorHex: "#B4833E",
        finish: "Concealed Brass",
        unitType: "each",
        takeoffQty: 1,
        wasteFactorPct: 0,
        unitCost: 485,
        allowanceAmount: 450,
        leadTimeWeeks: 3,
        mountingHeight: "48\" AFF in 2x4 stud bay",
        installNotes: "Anchor to 16-ga steel backing bridge in 2x4 stud wall.",
      },
      {
        roomId: room.id,
        tradeCategoryId: tradeMap["cabinetry-millwork"],
        phaseGateway: "Phase 3: Post-Drywall Millwork, Tile & Trim-Out",
        status: "Pending Client Input",
        componentName: `${room.name} — Custom Floating Rift Oak Vanity & Quartz Top`,
        manufacturer: "Shiloh Custom Cabinetry",
        productName: "Floating White Oak Vanity + Cambria Quartz Top",
        sku: "SHL-VAN-RWO",
        colorName: "Natural Rift White Oak",
        colorCode: "RWO-01",
        colorHex: "#D5BF9E",
        finish: "Matte Catalyzed Varnish",
        unitType: "each",
        takeoffQty: 1,
        wasteFactorPct: 0,
        unitCost: 4200,
        allowanceAmount: 4000,
        leadTimeWeeks: 8,
        mountingHeight: "35\" AFF",
        installNotes: "Requires reinforced backing plate in 2x4 framing.",
      }
    );
  }

  // Kitchen-specific items
  if (lower.includes("kitchen")) {
    items.push(
      {
        roomId: room.id,
        tradeCategoryId: tradeMap["cabinetry-millwork"],
        phaseGateway: "Phase 3: Post-Drywall Millwork, Tile & Trim-Out",
        status: "Pending Client Input",
        componentName: "Custom Kitchen Perimeter & Island Cabinetry Package",
        manufacturer: "Shiloh Custom Cabinetry",
        productName: "Full-Overlay Shaker & Rift White Oak Island Package",
        sku: "SHL-KIT-PKG",
        colorName: "SW Alabaster & Rift White Oak",
        colorCode: "SW-7008-RWO",
        colorHex: "#D7C4A5",
        finish: "Matte Conversion Varnish",
        unitType: "allowance lump sum",
        takeoffQty: 1,
        wasteFactorPct: 0,
        unitCost: 34000,
        allowanceAmount: 34000,
        leadTimeWeeks: 10,
        installNotes: "Includes continuous backing in 2x4 metal stud walls.",
      },
      {
        roomId: room.id,
        tradeCategoryId: tradeMap["countertops-stone"],
        phaseGateway: "Phase 3: Post-Drywall Millwork, Tile & Trim-Out",
        status: "Pending Client Input",
        componentName: "3cm Quartz Countertops & Waterfall Island",
        manufacturer: "Cambria",
        productName: "Brittanicca Warm 3cm Honed Quartz",
        sku: "CAM-BRIT-W3CM",
        colorName: "Warm White Veined",
        colorCode: "BRIT-W",
        colorHex: "#EFECE6",
        finish: "Honed Matte",
        unitType: "sq ft",
        takeoffQty: 105,
        wasteFactorPct: 5,
        unitCost: 128,
        allowanceAmount: 13500,
        leadTimeWeeks: 4,
        installNotes: "Template after base cabinets are installed.",
      }
    );
  }

  return items;
}
