import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateRoomMetrics,
  computeCF8iJambDepth,
} from "@/lib/construction-rules";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.room.findUnique({
      where: { id },
      include: { selections: { include: { tradeCategory: true } }, openings: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const lengthFt =
      body.lengthFt !== undefined ? Number(body.lengthFt) : existing.lengthFt;
    const widthFt =
      body.widthFt !== undefined ? Number(body.widthFt) : existing.widthFt;
    const ceilingHeightFt =
      body.ceilingHeightFt !== undefined
        ? Number(body.ceilingHeightFt)
        : existing.ceilingHeightFt;
    const cf8iInteriorFinish =
      body.cf8iInteriorFinish !== undefined
        ? body.cf8iInteriorFinish
        : existing.cf8iInteriorFinish;
    const interiorPartitionSqFt =
      body.interiorPartitionSqFt !== undefined
        ? Number(body.interiorPartitionSqFt)
        : existing.interiorPartitionSqFt;
    const hasRadiantSlab =
      body.hasRadiantSlab !== undefined
        ? Boolean(body.hasRadiantSlab)
        : existing.hasRadiantSlab;
    const hasExteriorCF8iWall =
      body.hasExteriorCF8iWall !== undefined
        ? Boolean(body.hasExteriorCF8iWall)
        : existing.hasExteriorCF8iWall;
    const hasGarageFireWall =
      body.hasGarageFireWall !== undefined
        ? Boolean(body.hasGarageFireWall)
        : existing.hasGarageFireWall;

    const metrics = calculateRoomMetrics({
      lengthFt,
      widthFt,
      ceilingHeightFt,
      interiorPartitionSqFt,
      cf8iInteriorFinish,
    });

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        lengthFt,
        widthFt,
        ceilingHeightFt,
        floorAreaSqFt: metrics.floorAreaSqFt,
        perimeterLinFt: metrics.perimeterLinFt,
        interiorPartitionSqFt: metrics.interiorPartitionSqFt,
        netWallAreaSqFt: metrics.netWallAreaSqFt,
        cf8iInteriorFinish,
        hasRadiantSlab,
        hasExteriorCF8iWall,
        hasGarageFireWall,
      },
    });

    // Automatically update room-dimension-driven takeoff quantities for unlocked items
    for (const sel of existing.selections) {
      if (sel.status === "Client Approved & Locked") continue;
      if (sel.unitType === "sq ft") {
        if (sel.tradeCategory.slug === "flooring-tile") {
          await prisma.selectionItem.update({
            where: { id: sel.id },
            data: { takeoffQty: metrics.floorAreaSqFt },
          });
        } else if (
          sel.tradeCategory.slug === "paint-finishes" ||
          sel.tradeCategory.slug === "framing-drywall"
        ) {
          await prisma.selectionItem.update({
            where: { id: sel.id },
            data: { takeoffQty: metrics.netWallAreaSqFt },
          });
        }
      }
    }

    // Recompute CF8i jamb depths for openings in this room
    for (const op of existing.openings) {
      const newJamb = computeCF8iJambDepth(
        op.openingType,
        hasExteriorCF8iWall,
        hasGarageFireWall,
        cf8iInteriorFinish
      );
      await prisma.windowDoorOpening.update({
        where: { id: op.id },
        data: { jambDepthInches: newJamb },
      });
    }

    return NextResponse.json({ ok: true, room: updatedRoom });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update room" },
      { status: 500 }
    );
  }
}
