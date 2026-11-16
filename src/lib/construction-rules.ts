export const PHASE_GATEWAYS = [
  "Phase 1: Pre-Pour / Slab & Nuform CF8i Embeds",
  "Phase 2: Pre-Drywall MEP, HVAC/IAQ & Low-Voltage Rough-In",
  "Phase 3: Post-Drywall Millwork, Tile & Trim-Out",
  "Phase 4: Final Trim, Hardware, Grilles & Appliances",
] as const;

export const SELECTION_STATUSES = [
  "TBD / Carrying Allowance",
  "Pending Client Input",
  "Option Selected",
  "Compatibility Warning",
  "Lead-Time Warning",
  "Needs Builder Review",
  "Client Approved & Locked",
  "Change Order Required",
] as const;

export const CF8I_FINISH_OPTIONS = [
  "Furred Drywall + Paint",
  "Exposed Nuform Polymer White/Tan — No Drywall",
] as const;

export const FRAMING_OPTIONS = [
  "2x4 Light-Gauge Metal Framing",
  "2x4 Wood Framing",
] as const;

export const HVAC_COOLING_OPTIONS = [
  "Air-Source Heat Pump",
  "Air-to-Water Heat Pump w/ Fan Coils",
  "Ductless Mini-Splits",
] as const;

export const HVAC_VENTILATION_OPTIONS = [
  "ERV + Whole-House Dehumidifier + MERV-13/HEPA",
  "HRV + Whole-House Dehumidifier + MERV-13/HEPA",
] as const;

/**
 * Computes the required window/door jamb depth for a Nuform ConForm CF8i wall:
 * - CF8i nominal structural assembly = 7.875" (5.47" concrete core + 2.13" polyurethane insulation + polymer shell)
 * - If interior finish is Furred Drywall + Paint, adds 0.5" drywall -> 8.375" jamb depth
 * - If Exposed Nuform Polymer White/Tan — No Drywall, jamb depth is 7.875"
 */
export function computeCF8iJambDepth(
  openingType: string,
  hasExteriorCF8iWall: boolean,
  hasGarageFireWall: boolean,
  cf8iInteriorFinish: string
): number {
  if (openingType === "Interior Door") {
    return 4.5625; // Standard 2x4 interior partition jamb
  }
  if (hasExteriorCF8iWall || hasGarageFireWall || openingType === "Garage Fire-Separation Door") {
    const isExposedPolymer = cf8iInteriorFinish.includes("Exposed Nuform Polymer");
    return isExposedPolymer ? 7.875 : 8.375;
  }
  return 6.5625;
}

/**
 * Calculates room metrics and paint/drywallable wall area respecting CF8i interior finish rules.
 */
export function calculateRoomMetrics(input: {
  lengthFt: number;
  widthFt: number;
  ceilingHeightFt: number;
  interiorPartitionSqFt?: number;
  cf8iInteriorFinish: string;
}) {
  const floorAreaSqFt = Number((input.lengthFt * input.widthFt).toFixed(1));
  const perimeterLinFt = Number((2 * (input.lengthFt + input.widthFt)).toFixed(1));
  const grossPerimeterWallSqFt = Number((perimeterLinFt * input.ceilingHeightFt).toFixed(1));
  const partitionSqFt =
    typeof input.interiorPartitionSqFt === "number"
      ? input.interiorPartitionSqFt
      : Number((grossPerimeterWallSqFt * 0.45).toFixed(1));

  // If CF8i wall is left as Exposed Nuform Polymer White/Tan, exclude CF8i perimeter walls from drywall/paint
  const isExposedPolymer = input.cf8iInteriorFinish.includes("Exposed Nuform Polymer");
  const netWallAreaSqFt = isExposedPolymer
    ? Number(partitionSqFt.toFixed(1))
    : Number((grossPerimeterWallSqFt * 0.85 + partitionSqFt).toFixed(1));

  return {
    floorAreaSqFt,
    perimeterLinFt,
    interiorPartitionSqFt: partitionSqFt,
    netWallAreaSqFt,
  };
}

/**
 * Computes extended cost (with waste factor if applicable) and variance against allowance.
 * Owner-Furnished (OFCI) items have $0 builder material cost.
 */
export function computeItemFinancials(item: {
  unitType: string;
  takeoffQty: number;
  wasteFactorPct: number;
  unitCost: number;
  allowanceAmount: number;
  isOwnerFurnished: boolean;
}) {
  const effectiveQty = Number(
    (item.takeoffQty * (1 + (item.wasteFactorPct || 0) / 100)).toFixed(2)
  );

  if (item.isOwnerFurnished) {
    return {
      effectiveQty,
      extendedCost: 0,
      variance: -item.allowanceAmount,
    };
  }

  const extendedCost =
    item.unitType === "allowance lump sum"
      ? Number(item.unitCost.toFixed(2))
      : Number((effectiveQty * item.unitCost).toFixed(2));

  const variance = Number((extendedCost - item.allowanceAmount).toFixed(2));

  return {
    effectiveQty,
    extendedCost,
    variance,
  };
}

/**
 * Evaluates Radiant Concrete Slab compatibility & Lead-Time Gate rules.
 */
export function evaluateSelectionWarnings(
  item: {
    status: string;
    isRadiantFloorApproved: boolean;
    leadTimeWeeks: number;
    targetInstallDate: Date | string;
    builderOverrideNote?: string | null;
  },
  room: { hasRadiantSlab: boolean },
  tradeSlug: string
): {
  computedStatus: string;
  radiantWarning: string | null;
  leadTimeWarning: string | null;
} {
  let radiantWarning: string | null = null;
  let leadTimeWarning: string | null = null;

  if (
    room.hasRadiantSlab &&
    tradeSlug === "flooring-tile" &&
    !item.isRadiantFloorApproved &&
    !item.builderOverrideNote
  ) {
    radiantWarning =
      "Radiant Slab Compatibility Warning: Product exceeds thermal resistance (R-value) limit or lacks hydronic concrete slab approval.";
  }

  const installDate = new Date(item.targetInstallDate);
  const now = new Date();
  const projectedDelivery = new Date(
    now.getTime() + (item.leadTimeWeeks || 0) * 7 * 24 * 60 * 60 * 1000
  );

  if (
    projectedDelivery > installDate &&
    item.status !== "Client Approved & Locked" &&
    !item.builderOverrideNote
  ) {
    const daysLate = Math.ceil(
      (projectedDelivery.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    leadTimeWarning = `Lead-Time Warning: ${item.leadTimeWeeks} wk lead time exceeds target install (${installDate.toLocaleDateString()}) by ~${daysLate} days.`;
  }

  let computedStatus = item.status;
  if (item.status !== "Client Approved & Locked" && item.status !== "Change Order Required") {
    if (radiantWarning) {
      computedStatus = "Compatibility Warning";
    } else if (leadTimeWarning) {
      computedStatus = "Lead-Time Warning";
    }
  }

  return {
    computedStatus,
    radiantWarning,
    leadTimeWarning,
  };
}

/**
 * Generates framing-specific installation notes depending on whether 2x4 Light-Gauge Metal
 * or 2x4 Wood Framing is active on the project.
 */
export function getFramingContextNote(
  interiorFramingType: string,
  tradeSlug: string
): string {
  const isMetal = interiorFramingType.includes("Metal");
  if (tradeSlug === "framing-drywall") {
    return isMetal
      ? "2x4 Light-Gauge Metal Framing (20-ga EQ studs @ 16\" O.C.): Use fine-thread self-drilling drywall screws, mineral wool acoustic batts, and 16-ga sheet-metal/fire-treated wood backing plates at all cabinet/vanity/TV walls."
      : "2x4 Kiln-Dried Wood Framing (@ 16\" O.C.): Use coarse-thread drywall screws, standard 2x6/2x8 solid wood blocking at vanities/cabinets/TV mounts, and acoustic batt insulation.";
  }
  if (tradeSlug === "plumbing-hydronic" || tradeSlug === "electrical-lighting") {
    return isMetal
      ? "Metal Stud Requirement: Install snap-in plastic/neoprene grommet bushings in all 2x4 metal stud web knockouts before pulling PEX or Romex/Cat6."
      : "Wood Stud Requirement: Bore centered 1-1/4\" holes and install 16-ga steel nail plates wherever piping/wiring is within 1-1/4\" of stud face.";
  }
  if (tradeSlug === "cabinetry-millwork") {
    return isMetal
      ? "Verify pre-installed 16-ga continuous steel strap + 3/4\" plywood backing inside 2x4 metal stud walls prior to hanging upper cabinets or floating vanities."
      : "Anchor upper cabinets and floating vanities into solid 2x8 wood blocking @ 34\" and 84\" AFF.";
  }
  return "";
}

/**
 * Strict Zero-Pricing Sanitizer for Subcontractor role & Trade Packet exports.
 * Strips all dollar amounts, unit costs, allowances, markups, and budget variances.
 */
export function sanitizeProjectForRole<T extends Record<string, any>>(
  project: T,
  role: string
): T {
  if (role !== "SUBCONTRACTOR") {
    return project;
  }

  const clone = JSON.parse(JSON.stringify(project));
  delete clone.totalAllowanceBudget;
  delete clone.framingWoodDelta;

  if (Array.isArray(clone.selections)) {
    clone.selections = clone.selections.map((sel: Record<string, any>) => {
      const sanitized = { ...sel };
      delete sanitized.unitCost;
      delete sanitized.allowanceAmount;
      delete sanitized.extendedCost;
      delete sanitized.variance;
      return sanitized;
    });
  }

  return clone;
}
