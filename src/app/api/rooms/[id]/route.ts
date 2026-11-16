import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  calculateRoomMetrics,
  computeCF8iJambDepth,
  resolveCascadedTakeoffQty,
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
      include: {
        selections: { include: { tradeCategory: true } },
        openings: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const updatedName =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : existing.name;
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
        : undefined;
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
    const pinX =
      body.pinX !== undefined
        ? Math.max(1, Math.min(99, Number(body.pinX)))
        : existing.pinX;
    const pinY =
      body.pinY !== undefined
        ? Math.max(1, Math.min(99, Number(body.pinY)))
        : existing.pinY;
    const gridX =
      body.gridX !== undefined ? Number(body.gridX) : existing.gridX;
    const gridZ =
      body.gridZ !== undefined ? Number(body.gridZ) : existing.gridZ;

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
        name: updatedName,
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
        pinX,
        pinY,
        gridX,
        gridZ,
      },
    });

    // Cascade updated room dimensions (floorArea, perimeter, wallArea) across all area/linear SelectionItem records in this room
    let cascadedItemsCount = 0;
    for (const sel of existing.selections) {
      const nextQty = resolveCascadedTakeoffQty(sel, metrics);
      if (nextQty !== null && nextQty !== sel.takeoffQty) {
        await prisma.selectionItem.update({
          where: { id: sel.id },
          data: { takeoffQty: nextQty },
        });
        cascadedItemsCount++;
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

    revalidatePath("/");
    revalidatePath(`/projects/${existing.projectId}/print/master-takeoff`);
    revalidatePath(`/projects/${existing.projectId}/print/trade-packet`);
    revalidatePath(`/projects/${existing.projectId}/print/closeout-binder`);

    return NextResponse.json({
      ok: true,
      room: updatedRoom,
      cascadedItemsCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update room" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const sessionUser = await getSessionUser();

    if (sessionUser.role !== "BUILDER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Builder Admins can delete rooms." },
        { status: 403 }
      );
    }

    const existing = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.selectionComment.deleteMany({
        where: {
          selectionItem: {
            roomId,
          },
        },
      }),
      prisma.selectionItem.deleteMany({
        where: { roomId },
      }),
      prisma.windowDoorOpening.deleteMany({
        where: { roomId },
      }),
      prisma.room.delete({
        where: { id: roomId },
      }),
    ]);

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete room" },
      { status: 500 }
    );
  }
}
