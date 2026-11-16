import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  calculateRoomMetrics,
  computeCF8iJambDepth,
  computeItemFinancials,
  evaluateSelectionWarnings,
  getFramingContextNote,
  resolveCascadedTakeoffQty,
  sanitizeProjectForRole,
} from "@/lib/construction-rules";
import { getDefaultProductMedia } from "@/lib/product-media";
import { generateTradeToken } from "@/lib/trade-token";
import { generateAutoSeedSelectionsForRoom } from "@/lib/plan-parser";
import { ensureSplitPlumbingAndRadiantTrades } from "@/lib/seed-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSplitPlumbingAndRadiantTrades();

    const { id } = await params;
    const roleOverride = req.nextUrl.searchParams.get("role");
    const sessionUser = await getSessionUser();
    const activeRole = roleOverride || sessionUser.role;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            renders: {
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { name: "asc" },
        },
        openings: {
          include: { room: true },
          orderBy: { openingTag: "asc" },
        },
        selections: {
          include: {
            room: true,
            tradeCategory: true,
            parentItem: {
              select: {
                id: true,
                componentName: true,
                sku: true,
                phaseGateway: true,
                status: true,
              },
            },
            pairedChildren: {
              select: {
                id: true,
                componentName: true,
                sku: true,
                phaseGateway: true,
                status: true,
              },
            },
            comments: {
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: [{ phaseGateway: "asc" }, { componentName: "asc" }],
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const enrichedSelections = project.selections.map((sel) => {
      const financials = computeItemFinancials(sel);
      const warnings = evaluateSelectionWarnings(
        sel,
        sel.room,
        sel.tradeCategory.slug
      );
      const dynamicFramingNote = getFramingContextNote(
        project.interiorFramingType,
        sel.tradeCategory.slug
      );
      const media = getDefaultProductMedia({
        sku: sel.sku,
        manufacturer: sel.manufacturer,
        productName: sel.productName,
        colorName: sel.colorName,
        colorCode: sel.colorCode,
        colorHex: sel.colorHex,
        tradeSlug: sel.tradeCategory.slug,
        swatchImageUrl: sel.swatchImageUrl,
        productUrl: sel.productUrl,
      });

      return {
        ...sel,
        swatchImageUrl: media.swatchImageUrl,
        productUrl: media.productUrl,
        vendorName: media.vendorName,
        effectiveQty: financials.effectiveQty,
        extendedCost: financials.extendedCost,
        variance: financials.variance,
        computedStatus: warnings.computedStatus,
        radiantWarning: warnings.radiantWarning,
        leadTimeWarning: warnings.leadTimeWarning,
        dynamicFramingNote,
      };
    });

    const allTrades = await prisma.tradeCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });
    const tradeShareTokens: Record<string, string> = {};
    for (const t of allTrades) {
      tradeShareTokens[t.slug] = generateTradeToken(
        project.id,
        t.slug,
        project.magicAccessToken
      );
    }

    const fullPayload = {
      ...project,
      tradeCategories: allTrades,
      tradeShareTokens,
      selections: enrichedSelections,
    };

    const sanitized = sanitizeProjectForRole(fullPayload, activeRole);
    return NextResponse.json({
      project: sanitized,
      activeRole,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Non-destructive "Re-Parse & Sync Rooms / Openings from Updated Plans" merge mode
    if (body.action === "merge_parsed_plan") {
      const existingProject = await prisma.project.findUnique({
        where: { id },
        include: {
          rooms: {
            include: {
              selections: { include: { tradeCategory: true } },
            },
          },
          openings: true,
        },
      });

      if (!existingProject) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      if (body.floorPlanUrl !== undefined) {
        await prisma.project.update({
          where: { id },
          data: { floorPlanUrl: body.floorPlanUrl },
        });
      }

      const trades = await prisma.tradeCategory.findMany();
      const tradeMap: Record<string, string> = {};
      for (const t of trades) {
        tradeMap[t.slug] = t.id;
      }

      const incomingRooms: any[] = Array.isArray(body.rooms) ? body.rooms : [];
      const incomingOpenings: any[] = Array.isArray(body.openings)
        ? body.openings
        : [];

      let updatedRoomsCount = 0;
      let addedRoomsCount = 0;
      let syncedOpeningsCount = 0;

      const roomLookupByName: Record<string, any> = {};
      for (const er of existingProject.rooms) {
        roomLookupByName[er.name.trim().toLowerCase()] = er;
      }

      for (let idx = 0; idx < incomingRooms.length; idx++) {
        const inc = incomingRooms[idx];
        const incName = (inc.name || `Room ${idx + 1}`).trim();
        const incLower = incName.toLowerCase();

        // Match exact name or primary room keyword without touching locked selections
        let matchedRoom = roomLookupByName[incLower];
        if (!matchedRoom) {
          matchedRoom = existingProject.rooms.find((er) => {
            const erLower = er.name.toLowerCase();
            return (
              (incLower.includes("kitchen") && erLower.includes("kitchen")) ||
              (incLower.includes("great room") &&
                erLower.includes("great room")) ||
              (incLower.includes("primary bed") &&
                erLower.includes("primary bed")) ||
              (incLower.includes("primary bath") &&
                erLower.includes("primary bath")) ||
              (incLower.includes("garage") && erLower.includes("garage")) ||
              (incLower.includes("mechanical") &&
                erLower.includes("mechanical")) ||
              (incLower.includes("exterior") && erLower.includes("exterior"))
            );
          });
        }

        const lengthFt = Number(inc.lengthFt) || 16;
        const widthFt = Number(inc.widthFt) || 14;
        const ceilingHeightFt = Number(inc.ceilingHeightFt) || 10;
        const cf8iInteriorFinish =
          inc.cf8iInteriorFinish || "Furred Drywall + Paint";

        const metrics = calculateRoomMetrics({
          lengthFt,
          widthFt,
          ceilingHeightFt,
          cf8iInteriorFinish,
        });

        if (matchedRoom) {
          // Update room dimensions & wall flags without deleting or overwriting locked selections
          const savedRoom = await prisma.room.update({
            where: { id: matchedRoom.id },
            data: {
              lengthFt,
              widthFt,
              ceilingHeightFt,
              floorAreaSqFt: metrics.floorAreaSqFt,
              perimeterLinFt: metrics.perimeterLinFt,
              interiorPartitionSqFt: metrics.interiorPartitionSqFt,
              netWallAreaSqFt: metrics.netWallAreaSqFt,
              cf8iInteriorFinish,
              hasRadiantSlab:
                typeof inc.hasRadiantSlab === "boolean"
                  ? inc.hasRadiantSlab
                  : matchedRoom.hasRadiantSlab,
              hasExteriorCF8iWall:
                typeof inc.hasExteriorCF8iWall === "boolean"
                  ? inc.hasExteriorCF8iWall
                  : matchedRoom.hasExteriorCF8iWall,
              hasGarageFireWall:
                typeof inc.hasGarageFireWall === "boolean"
                  ? inc.hasGarageFireWall
                  : matchedRoom.hasGarageFireWall,
            },
          });

          // Cascade takeoff quantities across all area/linear selections in this room
          for (const sel of matchedRoom.selections || []) {
            const nextQty = resolveCascadedTakeoffQty(sel, metrics);
            if (nextQty !== null && nextQty !== sel.takeoffQty) {
              await prisma.selectionItem.update({
                where: { id: sel.id },
                data: { takeoffQty: nextQty },
              });
            }
          }

          roomLookupByName[incLower] = savedRoom;
          updatedRoomsCount++;
        } else {
          // Create newly detected room and auto-seed its selection checklist
          const createdRoom = await prisma.room.create({
            data: {
              projectId: id,
              name: incName,
              floorLevel: inc.floorLevel || "Main Level",
              lengthFt,
              widthFt,
              ceilingHeightFt,
              floorAreaSqFt: metrics.floorAreaSqFt,
              perimeterLinFt: metrics.perimeterLinFt,
              netWallAreaSqFt: metrics.netWallAreaSqFt,
              pinX: Number(inc.pinX) || 25 + (idx * 12) % 65,
              pinY: Number(inc.pinY) || 30 + (idx * 15) % 55,
              gridX: Number(inc.gridX) || idx * 14,
              gridZ: Number(inc.gridZ) || 20,
              hasExteriorCF8iWall:
                typeof inc.hasExteriorCF8iWall === "boolean"
                  ? inc.hasExteriorCF8iWall
                  : true,
              hasGarageFireWall: Boolean(inc.hasGarageFireWall),
              interiorPartitionSqFt: metrics.interiorPartitionSqFt,
              cf8iInteriorFinish,
              hasRadiantSlab:
                typeof inc.hasRadiantSlab === "boolean"
                  ? inc.hasRadiantSlab
                  : true,
            },
          });

          const autoItems = generateAutoSeedSelectionsForRoom(
            createdRoom,
            tradeMap
          );
          for (const item of autoItems) {
            await prisma.selectionItem.create({
              data: {
                projectId: id,
                roomId: item.roomId,
                tradeCategoryId: item.tradeCategoryId,
                phaseGateway: item.phaseGateway,
                status: item.status,
                componentName: item.componentName,
                manufacturer: item.manufacturer,
                productName: item.productName,
                sku: item.sku,
                colorName: item.colorName,
                colorCode: item.colorCode,
                colorHex: item.colorHex,
                finish: item.finish,
                isRadiantFloorApproved:
                  typeof item.isRadiantFloorApproved === "boolean"
                    ? item.isRadiantFloorApproved
                    : true,
                mountingHeight: item.mountingHeight || null,
                installNotes: item.installNotes || null,
                leadTimeWeeks: item.leadTimeWeeks || 4,
                targetInstallDate: new Date("2027-02-15T12:00:00Z"),
                unitType: item.unitType,
                takeoffQty: item.takeoffQty,
                wasteFactorPct: item.wasteFactorPct || 0,
                unitCost: item.unitCost,
                allowanceAmount: item.allowanceAmount,
              },
            });
          }

          roomLookupByName[incLower] = createdRoom;
          addedRoomsCount++;
        }
      }

      // Sync or add WindowDoorOpening schedule entries
      const fallbackRoom =
        Object.values(roomLookupByName)[0] || existingProject.rooms[0];

      for (const op of incomingOpenings) {
        const targetRoom =
          roomLookupByName[(op.roomName || "").trim().toLowerCase()] ||
          fallbackRoom;
        if (!targetRoom) continue;

        const jambDepthInches = computeCF8iJambDepth(
          op.openingType || "Window",
          targetRoom.hasExteriorCF8iWall,
          targetRoom.hasGarageFireWall,
          targetRoom.cf8iInteriorFinish
        );

        const existingOp = existingProject.openings.find(
          (eo) =>
            eo.openingTag.toLowerCase() ===
            (op.openingTag || "").trim().toLowerCase()
        );

        if (existingOp) {
          await prisma.windowDoorOpening.update({
            where: { id: existingOp.id },
            data: {
              roomId: targetRoom.id,
              openingType: op.openingType || existingOp.openingType,
              widthInches: Number(op.widthInches) || existingOp.widthInches,
              heightInches: Number(op.heightInches) || existingOp.heightInches,
              sillHeightInches:
                op.sillHeightInches !== undefined
                  ? Number(op.sillHeightInches)
                  : existingOp.sillHeightInches,
              manufacturer: op.manufacturer || existingOp.manufacturer,
              modelSku: op.modelSku || existingOp.modelSku,
              jambDepthInches,
              fireRating: op.fireRating || existingOp.fireRating,
              notes: op.notes || existingOp.notes,
            },
          });
        } else {
          await prisma.windowDoorOpening.create({
            data: {
              projectId: id,
              roomId: targetRoom.id,
              openingTag: op.openingTag || `W-${Date.now() % 100}`,
              openingType: op.openingType || "Window",
              widthInches: Number(op.widthInches) || 48,
              heightInches: Number(op.heightInches) || 60,
              sillHeightInches: Number(op.sillHeightInches) || 36,
              manufacturer: op.manufacturer || "Pella Reserve Contemporary",
              modelSku: op.modelSku || "PR-3P",
              exteriorColor: op.exteriorColor || "Matte Black Clad",
              interiorColor: op.interiorColor || "Warm White",
              glassSpec: op.glassSpec || "Triple-Pane Low-E Argon",
              jambDepthInches,
              fireRating: op.fireRating || "Standard Exterior Envelope",
              notes: op.notes || null,
            },
          });
        }
        syncedOpeningsCount++;
      }

      return NextResponse.json({
        ok: true,
        updatedRoomsCount,
        addedRoomsCount,
        syncedOpeningsCount,
      });
    }

    const allowedFields: Record<string, any> = {};
    const keys = [
      "name",
      "clientName",
      "clientEmail",
      "siteAddress",
      "totalAllowanceBudget",
      "envelopeWallSystem",
      "interiorFramingType",
      "framingWoodDelta",
      "hvacPrimaryHeat",
      "hvacCoolingSystem",
      "hvacVentilationIaq",
      "floorPlanUrl",
      "isTemplate",
    ];

    for (const k of keys) {
      if (body[k] !== undefined) {
        allowedFields[k] = body[k];
      }
    }

    if (body.targetOccupancyDate) {
      allowedFields.targetOccupancyDate = new Date(body.targetOccupancyDate);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: allowedFields,
    });

    return NextResponse.json({ ok: true, project: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update project" },
      { status: 500 }
    );
  }
}
