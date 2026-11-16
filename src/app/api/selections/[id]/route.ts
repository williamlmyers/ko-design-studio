import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Handle adding a comment to this selection item
    if (body.action === "add_comment") {
      const comment = await prisma.selectionComment.create({
        data: {
          selectionItemId: id,
          authorName: body.authorName || "Portal User",
          authorRole: body.authorRole || "HOMEOWNER",
          body: body.commentBody || "",
          attachmentUrl: body.attachmentUrl || null,
        },
      });
      return NextResponse.json({ ok: true, comment });
    }

    // Handle applying a CatalogPreset with one click
    if (body.action === "apply_preset" && body.presetId) {
      const preset = await prisma.catalogPreset.findUnique({
        where: { id: body.presetId },
      });
      if (!preset) {
        return NextResponse.json({ error: "Preset not found" }, { status: 404 });
      }

      const updated = await prisma.selectionItem.update({
        where: { id },
        data: {
          manufacturer: preset.manufacturer,
          productName: preset.productName,
          sku: preset.sku,
          colorName: preset.colorName,
          colorCode: preset.colorCode,
          colorHex: preset.colorHex,
          finish: preset.finish,
          unitCost: preset.unitCost,
          leadTimeWeeks: preset.leadTimeWeeks,
          isRadiantFloorApproved: preset.isRadiantFloorApproved,
          colorTempKelvin: preset.colorTempKelvin,
          installNotes: preset.installNotes,
          swatchImageUrl: null,
          productUrl: null,
          status: preset.isRadiantFloorApproved
            ? "Option Selected"
            : "Compatibility Warning",
        },
      });
      return NextResponse.json({ ok: true, selection: updated });
    }

    // Handle Approve & Lock (single item)
    if (body.action === "approve_lock") {
      const initials = (body.initials || "JRT").toUpperCase();
      const updated = await prisma.selectionItem.update({
        where: { id },
        data: {
          status: "Client Approved & Locked",
          approvedByInitials: initials,
          approvedAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true, selection: updated });
    }

    // Handle Unlock (Builder Admin only)
    if (body.action === "unlock") {
      const updated = await prisma.selectionItem.update({
        where: { id },
        data: {
          status: "Option Selected",
          approvedByInitials: null,
          approvedAt: null,
        },
      });
      return NextResponse.json({ ok: true, selection: updated });
    }

    // General field update (including Edit Spec / Custom Color modal)
    const updateData: Record<string, any> = {};
    const stringFields = [
      "componentName",
      "manufacturer",
      "productName",
      "sku",
      "colorName",
      "colorCode",
      "colorHex",
      "finish",
      "productUrl",
      "swatchImageUrl",
      "mountingHeight",
      "switchGroup",
      "dimmerType",
      "installNotes",
      "unitType",
      "status",
      "phaseGateway",
      "builderOverrideNote",
    ];

    for (const f of stringFields) {
      if (body[f] !== undefined) {
        updateData[f] = body[f];
      }
    }

    const numericFields = [
      "leadTimeWeeks",
      "takeoffQty",
      "wasteFactorPct",
      "unitCost",
      "allowanceAmount",
      "colorTempKelvin",
    ];

    for (const nf of numericFields) {
      if (body[nf] !== undefined && body[nf] !== null && body[nf] !== "") {
        updateData[nf] = Number(body[nf]);
      }
    }

    if (body.isRadiantFloorApproved !== undefined) {
      updateData.isRadiantFloorApproved = Boolean(body.isRadiantFloorApproved);
      if (updateData.status === undefined) {
        updateData.status = body.isRadiantFloorApproved
          ? "Option Selected"
          : "Compatibility Warning";
      }
    }

    if (body.isOwnerFurnished !== undefined) {
      updateData.isOwnerFurnished = Boolean(body.isOwnerFurnished);
    }

    if (body.targetInstallDate) {
      updateData.targetInstallDate = new Date(body.targetInstallDate);
    }

    const updated = await prisma.selectionItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, selection: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update selection item" },
      { status: 500 }
    );
  }
}
