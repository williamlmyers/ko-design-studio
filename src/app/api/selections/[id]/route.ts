import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { computeItemFinancials } from "@/lib/construction-rules";

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

    // Handle applying a CatalogItem (Good / Better / Best Showroom Drawer)
    if (body.action === "apply_catalog_item" && body.catalogItemId) {
      const catItem = await prisma.catalogItem.findUnique({
        where: { id: body.catalogItemId },
      });
      if (!catItem) {
        return NextResponse.json(
          { error: "CatalogItem not found" },
          { status: 404 }
        );
      }

      const currentItem = await prisma.selectionItem.findUnique({
        where: { id },
      });
      if (!currentItem) {
        return NextResponse.json(
          { error: "SelectionItem not found" },
          { status: 404 }
        );
      }

      let linkedParentId = currentItem.parentItemId;

      if (catItem.pairedRoughInSku) {
        const roughName =
          catItem.pairedRoughInName ||
          `${catItem.manufacturer} Paired Phase 2 Rough-In (${catItem.pairedRoughInSku})`;
        const roughNotes = `Auto-synced Phase 2 rough-in required for paired finish item: ${catItem.manufacturer} ${catItem.productName} (${catItem.sku}).`;

        if (linkedParentId) {
          await prisma.selectionItem.update({
            where: { id: linkedParentId },
            data: {
              componentName: roughName,
              manufacturer: catItem.manufacturer,
              productName: roughName,
              sku: catItem.pairedRoughInSku,
              installNotes: roughNotes,
              status: "Option Selected",
            },
          });
        } else {
          const createdRough = await prisma.selectionItem.create({
            data: {
              projectId: currentItem.projectId,
              roomId: currentItem.roomId,
              tradeCategoryId: currentItem.tradeCategoryId,
              phaseGateway:
                "Phase 2: Pre-Drywall MEP, HVAC/IAQ & Low-Voltage Rough-In",
              status: "Option Selected",
              componentName: roughName,
              manufacturer: catItem.manufacturer,
              productName: roughName,
              sku: catItem.pairedRoughInSku,
              colorName: "Concealed Rough-In Body",
              colorCode: "ROUGH-IN",
              colorHex: "#64748B",
              finish: "Concealed Rough-In",
              installNotes: roughNotes,
              leadTimeWeeks: Math.max(2, catItem.leadTimeWeeks - 1),
              targetInstallDate: currentItem.targetInstallDate,
              unitType: "each",
              takeoffQty: currentItem.takeoffQty || 1,
              wasteFactorPct: 0,
              unitCost: 265,
              allowanceAmount: 265,
            },
          });
          linkedParentId = createdRough.id;
        }
      }

      const updated = await prisma.selectionItem.update({
        where: { id },
        data: {
          parentItemId: linkedParentId,
          manufacturer: catItem.manufacturer,
          productName: catItem.productName,
          sku: catItem.sku,
          colorName: catItem.colorName,
          colorCode: catItem.colorCode,
          colorHex: catItem.colorHex,
          finish: catItem.finish,
          unitCost: catItem.unitCost,
          leadTimeWeeks: catItem.leadTimeWeeks,
          isRadiantFloorApproved: catItem.isRadiantFloorApproved,
          installNotes: catItem.notes || currentItem.installNotes,
          swatchImageUrl: null,
          productUrl: null,
          status: catItem.isRadiantFloorApproved
            ? "Option Selected"
            : "Compatibility Warning",
        },
      });

      return NextResponse.json({
        ok: true,
        selection: updated,
        pairedRoughInSynced: Boolean(catItem.pairedRoughInSku),
      });
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

    // General field update (Selection Item Specification Details modal)
    const sessionUser = await getSessionUser();
    if (sessionUser.role === "SUBCONTRACTOR") {
      return NextResponse.json(
        { error: "Forbidden: Subcontractors cannot edit selection specifications." },
        { status: 403 }
      );
    }

    const updateData: Record<string, any> = {};
    const stringFields = [
      "roomId",
      "tradeCategoryId",
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

    // Support normalized field aliases
    if (body.name !== undefined && updateData.productName === undefined) {
      updateData.productName = body.name;
    }
    if (body.modelNumber !== undefined && updateData.sku === undefined) {
      updateData.sku = body.modelNumber;
    }
    if (body.phase !== undefined && updateData.phaseGateway === undefined) {
      updateData.phaseGateway = body.phase;
    }
    if (body.unit !== undefined && updateData.unitType === undefined) {
      updateData.unitType = body.unit;
    }
    if (body.vendorUrl !== undefined && updateData.productUrl === undefined) {
      updateData.productUrl = body.vendorUrl;
    }
    if (body.imageUrl !== undefined && updateData.swatchImageUrl === undefined) {
      updateData.swatchImageUrl = body.imageUrl;
    }
    if (body.specNotes !== undefined && updateData.installNotes === undefined) {
      updateData.installNotes = body.specNotes;
    }
    if (body.tradeNotes !== undefined && updateData.installNotes === undefined) {
      updateData.installNotes = body.tradeNotes;
    }

    // Allow passing tradeCategory by slug or ID if tradeCategoryId wasn't passed directly
    if (body.tradeCategory && !updateData.tradeCategoryId) {
      const matchedTrade = await prisma.tradeCategory.findFirst({
        where: {
          OR: [{ id: body.tradeCategory }, { slug: body.tradeCategory }],
        },
      });
      if (matchedTrade) {
        updateData.tradeCategoryId = matchedTrade.id;
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
      } else if (body[nf] === "" && nf === "colorTempKelvin") {
        updateData[nf] = null;
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

    // If pairedRoughInSku was passed during a direct modal save, auto-create or update the paired Phase 2 rough-in item
    if (body.pairedRoughInSku) {
      const currentItem = await prisma.selectionItem.findUnique({
        where: { id },
      });
      if (currentItem) {
        const roughName =
          body.pairedRoughInName ||
          `${body.manufacturer || currentItem.manufacturer} Paired Phase 2 Rough-In (${body.pairedRoughInSku})`;
        const roughNotes = `Auto-synced Phase 2 rough-in required for paired finish item: ${
          body.manufacturer || currentItem.manufacturer
        } ${body.productName || currentItem.productName} (${
          body.sku || currentItem.sku
        }).`;

        if (currentItem.parentItemId) {
          await prisma.selectionItem.update({
            where: { id: currentItem.parentItemId },
            data: {
              componentName: roughName,
              manufacturer: body.manufacturer || currentItem.manufacturer,
              productName: roughName,
              sku: body.pairedRoughInSku,
              installNotes: roughNotes,
              status: "Option Selected",
            },
          });
        } else {
          const createdRough = await prisma.selectionItem.create({
            data: {
              projectId: currentItem.projectId,
              roomId: updateData.roomId || currentItem.roomId,
              tradeCategoryId:
                updateData.tradeCategoryId || currentItem.tradeCategoryId,
              phaseGateway:
                "Phase 2: Pre-Drywall MEP, HVAC/IAQ & Low-Voltage Rough-In",
              status: "Option Selected",
              componentName: roughName,
              manufacturer: body.manufacturer || currentItem.manufacturer,
              productName: roughName,
              sku: body.pairedRoughInSku,
              colorName: "Concealed Rough-In Body",
              colorCode: "ROUGH-IN",
              colorHex: "#64748B",
              finish: "Concealed Rough-In",
              installNotes: roughNotes,
              leadTimeWeeks: Number(body.leadTimeWeeks) || 3,
              targetInstallDate: currentItem.targetInstallDate,
              unitType: "each",
              takeoffQty:
                updateData.takeoffQty ?? (currentItem.takeoffQty || 1),
              wasteFactorPct: 0,
              unitCost: 265,
              allowanceAmount: 265,
            },
          });
          updateData.parentItemId = createdRough.id;
        }
      }
    }

    const updated = await prisma.selectionItem.update({
      where: { id },
      data: updateData,
      include: {
        room: true,
        tradeCategory: true,
      },
    });

    const financials = computeItemFinancials(updated);

    revalidatePath("/");
    revalidatePath(`/projects/${updated.projectId}/print/master-takeoff`);
    revalidatePath(`/projects/${updated.projectId}/print/trade-packet`);
    revalidatePath(`/projects/${updated.projectId}/print/closeout-binder`);

    return NextResponse.json({
      ok: true,
      selection: {
        ...updated,
        ...financials,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update selection item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const sessionUser = await getSessionUser();

    if (sessionUser.role !== "BUILDER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Builder Admins can delete selection items." },
        { status: 403 }
      );
    }

    const existing = await prisma.selectionItem.findUnique({
      where: { id: itemId },
      select: { id: true, projectId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "SelectionItem not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.selectionItem.updateMany({
        where: { parentItemId: itemId },
        data: { parentItemId: null },
      }),
      prisma.selectionComment.deleteMany({
        where: { selectionItemId: itemId },
      }),
      prisma.selectionItem.delete({
        where: { id: itemId },
      }),
    ]);

    revalidatePath("/");
    revalidatePath(`/projects/${existing.projectId}/print/master-takeoff`);
    revalidatePath(`/projects/${existing.projectId}/print/trade-packet`);
    revalidatePath(`/projects/${existing.projectId}/print/closeout-binder`);

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete selection item" },
      { status: 500 }
    );
  }
}
