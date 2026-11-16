import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      roomId,
      tradeCategoryId,
      phaseGateway = "Phase 3: Post-Drywall Millwork, Tile & Trim-Out",
      parentItemId = null,
      status = "Option Selected",
      isOwnerFurnished = false,
      componentName,
      manufacturer = "Custom Selection",
      productName = "Custom Product Entry",
      sku = "CUSTOM-SKU",
      colorName = "Custom Finish",
      colorCode = "",
      colorHex = "#D97706",
      finish = "Standard",
      productUrl = null,
      swatchImageUrl = null,
      mountingHeight = null,
      isRadiantFloorApproved = true,
      switchGroup = null,
      dimmerType = null,
      colorTempKelvin = null,
      installNotes = null,
      leadTimeWeeks = 4,
      targetInstallDate,
      unitType = "each",
      takeoffQty = 1,
      wasteFactorPct = 0,
      unitCost = 0,
      allowanceAmount = 0,
    } = body;

    const created = await prisma.selectionItem.create({
      data: {
        projectId,
        roomId,
        tradeCategoryId,
        phaseGateway,
        parentItemId: parentItemId || null,
        status,
        isOwnerFurnished: Boolean(isOwnerFurnished),
        componentName: componentName || "New Selection Specification",
        manufacturer,
        productName,
        sku,
        colorName,
        colorCode,
        colorHex,
        finish,
        productUrl,
        swatchImageUrl,
        mountingHeight,
        isRadiantFloorApproved: Boolean(isRadiantFloorApproved),
        switchGroup,
        dimmerType,
        colorTempKelvin: colorTempKelvin ? Number(colorTempKelvin) : null,
        installNotes,
        leadTimeWeeks: Number(leadTimeWeeks) || 4,
        targetInstallDate: targetInstallDate
          ? new Date(targetInstallDate)
          : new Date("2027-02-01T12:00:00Z"),
        unitType,
        takeoffQty: Number(takeoffQty) || 1,
        wasteFactorPct: Number(wasteFactorPct) || 0,
        unitCost: Number(unitCost) || 0,
        allowanceAmount: Number(allowanceAmount) || 0,
      },
    });

    return NextResponse.json({ ok: true, selection: created });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create selection item" },
      { status: 500 }
    );
  }
}
