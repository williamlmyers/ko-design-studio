import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  calculateRoomMetrics,
  computeCF8iJambDepth,
} from "@/lib/construction-rules";
import { generateAutoSeedSelectionsForRoom } from "@/lib/plan-parser";
import { seedDatabase } from "@/lib/seed-data";

export async function GET() {
  try {
    let projects = await prisma.project.findMany({
      orderBy: [{ isTemplate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        clientName: true,
        siteAddress: true,
        isTemplate: true,
        magicAccessToken: true,
        envelopeWallSystem: true,
        interiorFramingType: true,
        targetOccupancyDate: true,
      },
    });

    if (projects.length === 0) {
      await seedDatabase();
      projects = await prisma.project.findMany({
        orderBy: [{ isTemplate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          clientName: true,
          siteAddress: true,
          isTemplate: true,
          magicAccessToken: true,
          envelopeWallSystem: true,
          interiorFramingType: true,
          targetOccupancyDate: true,
        },
      });
    }

    const [sessionUser, tradeCategories, catalogPresets] = await Promise.all([
      getSessionUser(),
      prisma.tradeCategory.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.catalogPreset.findMany({ orderBy: { manufacturer: "asc" } }),
    ]);

    return NextResponse.json({
      projects,
      sessionUser,
      tradeCategories,
      catalogPresets:
        sessionUser.role === "SUBCONTRACTOR"
          ? catalogPresets.map((c) => {
              const copy: Record<string, any> = { ...c };
              delete copy.unitCost;
              return copy;
            })
          : catalogPresets,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = "from-plan",
      sourceProjectId,
      name,
      clientName,
      clientEmail,
      siteAddress,
      targetOccupancyDate,
      totalAllowanceBudget = 185000,
      floorPlanUrl,
      isTemplate = false,
      envelopeWallSystem = "Nuform ConForm 8-inch Insulated Form (CF8i)",
      interiorFramingType = "2x4 Light-Gauge Metal Framing",
      hvacPrimaryHeat = "Hydronic Radiant Concrete Slab",
      hvacCoolingSystem = "Air-Source Heat Pump",
      hvacVentilationIaq = "ERV + Whole-House Dehumidifier + MERV-13/HEPA",
      rooms = [],
      openings = [],
    } = body;

    const magicToken = `ko-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    if (mode === "clone" && sourceProjectId) {
      const source = await prisma.project.findUnique({
        where: { id: sourceProjectId },
        include: {
          rooms: true,
          openings: true,
          selections: true,
        },
      });

      if (!source) {
        return NextResponse.json(
          { error: "Source project not found" },
          { status: 404 }
        );
      }

      const cloned = await prisma.project.create({
        data: {
          name: name || `${source.name} (Copy)`,
          clientName: clientName || source.clientName,
          clientEmail: clientEmail || source.clientEmail,
          siteAddress: siteAddress || source.siteAddress,
          targetOccupancyDate: targetOccupancyDate
            ? new Date(targetOccupancyDate)
            : source.targetOccupancyDate,
          totalAllowanceBudget: source.totalAllowanceBudget,
          floorPlanUrl: source.floorPlanUrl,
          magicAccessToken: magicToken,
          isTemplate: Boolean(isTemplate),
          envelopeWallSystem: source.envelopeWallSystem,
          interiorFramingType: source.interiorFramingType,
          framingWoodDelta: source.framingWoodDelta,
          hvacPrimaryHeat: source.hvacPrimaryHeat,
          hvacCoolingSystem: source.hvacCoolingSystem,
          hvacVentilationIaq: source.hvacVentilationIaq,
        },
      });

      const oldToNewRoomId: Record<string, string> = {};
      for (const r of source.rooms) {
        const createdRoom = await prisma.room.create({
          data: {
            projectId: cloned.id,
            name: r.name,
            floorLevel: r.floorLevel,
            lengthFt: r.lengthFt,
            widthFt: r.widthFt,
            ceilingHeightFt: r.ceilingHeightFt,
            floorAreaSqFt: r.floorAreaSqFt,
            perimeterLinFt: r.perimeterLinFt,
            netWallAreaSqFt: r.netWallAreaSqFt,
            pinX: r.pinX,
            pinY: r.pinY,
            gridX: r.gridX,
            gridZ: r.gridZ,
            hasExteriorCF8iWall: r.hasExteriorCF8iWall,
            hasGarageFireWall: r.hasGarageFireWall,
            interiorPartitionSqFt: r.interiorPartitionSqFt,
            cf8iInteriorFinish: r.cf8iInteriorFinish,
            hasRadiantSlab: r.hasRadiantSlab,
          },
        });
        oldToNewRoomId[r.id] = createdRoom.id;
      }

      for (const op of source.openings) {
        const mappedRoomId = oldToNewRoomId[op.roomId];
        if (!mappedRoomId) continue;
        await prisma.windowDoorOpening.create({
          data: {
            projectId: cloned.id,
            roomId: mappedRoomId,
            openingTag: op.openingTag,
            openingType: op.openingType,
            widthInches: op.widthInches,
            heightInches: op.heightInches,
            sillHeightInches: op.sillHeightInches,
            manufacturer: op.manufacturer,
            modelSku: op.modelSku,
            exteriorColor: op.exteriorColor,
            interiorColor: op.interiorColor,
            glassSpec: op.glassSpec,
            jambDepthInches: op.jambDepthInches,
            fireRating: op.fireRating,
            notes: op.notes,
          },
        });
      }

      for (const sel of source.selections) {
        const mappedRoomId = oldToNewRoomId[sel.roomId];
        if (!mappedRoomId) continue;
        await prisma.selectionItem.create({
          data: {
            projectId: cloned.id,
            roomId: mappedRoomId,
            tradeCategoryId: sel.tradeCategoryId,
            phaseGateway: sel.phaseGateway,
            status: isTemplate ? "Pending Client Input" : sel.status,
            isOwnerFurnished: sel.isOwnerFurnished,
            componentName: sel.componentName,
            manufacturer: sel.manufacturer,
            productName: sel.productName,
            sku: sel.sku,
            colorName: sel.colorName,
            colorCode: sel.colorCode,
            colorHex: sel.colorHex,
            finish: sel.finish,
            productUrl: sel.productUrl,
            swatchImageUrl: sel.swatchImageUrl,
            mountingHeight: sel.mountingHeight,
            isRadiantFloorApproved: sel.isRadiantFloorApproved,
            switchGroup: sel.switchGroup,
            dimmerType: sel.dimmerType,
            colorTempKelvin: sel.colorTempKelvin,
            installNotes: sel.installNotes,
            leadTimeWeeks: sel.leadTimeWeeks,
            targetInstallDate: sel.targetInstallDate,
            unitType: sel.unitType,
            takeoffQty: sel.takeoffQty,
            wasteFactorPct: sel.wasteFactorPct,
            unitCost: sel.unitCost,
            allowanceAmount: sel.allowanceAmount,
          },
        });
      }

      return NextResponse.json({ ok: true, projectId: cloned.id });
    }

    // Create new project from decomposed architectural plans
    const createdProject = await prisma.project.create({
      data: {
        name: name || "New Custom KO Builders ICF Residence",
        clientName: clientName || "Custom Home Client",
        clientEmail: clientEmail || "client@kobuilders.com",
        siteAddress: siteAddress || "Sunbury, OH",
        targetOccupancyDate: targetOccupancyDate
          ? new Date(targetOccupancyDate)
          : new Date("2027-06-15T12:00:00Z"),
        totalAllowanceBudget: Number(totalAllowanceBudget) || 185000,
        floorPlanUrl: floorPlanUrl || "/titko-floorplan-preview.svg",
        magicAccessToken: magicToken,
        isTemplate: Boolean(isTemplate),
        envelopeWallSystem,
        interiorFramingType,
        hvacPrimaryHeat,
        hvacCoolingSystem,
        hvacVentilationIaq,
      },
    });

    const trades = await prisma.tradeCategory.findMany();
    const tradeMap: Record<string, string> = {};
    for (const t of trades) {
      tradeMap[t.slug] = t.id;
    }

    const createdRoomsByName: Record<string, any> = {};
    let firstRoom: any = null;

    for (let idx = 0; idx < rooms.length; idx++) {
      const r = rooms[idx];
      const metrics = calculateRoomMetrics({
        lengthFt: Number(r.lengthFt) || 16,
        widthFt: Number(r.widthFt) || 14,
        ceilingHeightFt: Number(r.ceilingHeightFt) || 10,
        cf8iInteriorFinish: r.cf8iInteriorFinish || "Furred Drywall + Paint",
      });

      const savedRoom = await prisma.room.create({
        data: {
          projectId: createdProject.id,
          name: r.name || `Room ${idx + 1}`,
          floorLevel: r.floorLevel || "Main Level",
          lengthFt: Number(r.lengthFt) || 16,
          widthFt: Number(r.widthFt) || 14,
          ceilingHeightFt: Number(r.ceilingHeightFt) || 10,
          floorAreaSqFt: metrics.floorAreaSqFt,
          perimeterLinFt: metrics.perimeterLinFt,
          netWallAreaSqFt: metrics.netWallAreaSqFt,
          pinX: Number(r.pinX) || 20 + idx * 10,
          pinY: Number(r.pinY) || 30 + (idx % 3) * 20,
          gridX: Number(r.gridX) || idx * 14,
          gridZ: Number(r.gridZ) || 0,
          hasExteriorCF8iWall:
            typeof r.hasExteriorCF8iWall === "boolean"
              ? r.hasExteriorCF8iWall
              : true,
          hasGarageFireWall: Boolean(r.hasGarageFireWall),
          interiorPartitionSqFt: metrics.interiorPartitionSqFt,
          cf8iInteriorFinish: r.cf8iInteriorFinish || "Furred Drywall + Paint",
          hasRadiantSlab:
            typeof r.hasRadiantSlab === "boolean" ? r.hasRadiantSlab : true,
        },
      });

      createdRoomsByName[savedRoom.name.toLowerCase()] = savedRoom;
      if (!firstRoom) firstRoom = savedRoom;

      const autoItems = generateAutoSeedSelectionsForRoom(savedRoom, tradeMap);
      for (const item of autoItems) {
        await prisma.selectionItem.create({
          data: {
            projectId: createdProject.id,
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
    }

    for (const op of openings) {
      const targetRoom =
        createdRoomsByName[(op.roomName || "").toLowerCase()] || firstRoom;
      if (!targetRoom) continue;

      const jambDepth = computeCF8iJambDepth(
        op.openingType || "Window",
        targetRoom.hasExteriorCF8iWall,
        targetRoom.hasGarageFireWall,
        targetRoom.cf8iInteriorFinish
      );

      await prisma.windowDoorOpening.create({
        data: {
          projectId: createdProject.id,
          roomId: targetRoom.id,
          openingTag: op.openingTag || "W-01",
          openingType: op.openingType || "Window",
          widthInches: Number(op.widthInches) || 48,
          heightInches: Number(op.heightInches) || 60,
          sillHeightInches: Number(op.sillHeightInches) || 36,
          manufacturer: op.manufacturer || "Pella Reserve",
          modelSku: op.modelSku || "PR-3P",
          exteriorColor: op.exteriorColor || "Matte Black",
          interiorColor: op.interiorColor || "Warm White",
          glassSpec: op.glassSpec || "Triple-Pane Low-E Argon",
          jambDepthInches: jambDepth,
          fireRating: op.fireRating || "Standard",
          notes: op.notes || null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      projectId: createdProject.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create project" },
      { status: 500 }
    );
  }
}
