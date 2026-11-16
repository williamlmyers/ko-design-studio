import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { calculateRoomMetrics } from "@/lib/construction-rules";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const sessionUser = await getSessionUser();

    if (sessionUser.role !== "BUILDER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Builder Admins can add rooms." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Room name is required." },
        { status: 400 }
      );
    }

    const floorLevel = body.floorLevel || "Main Level";
    const lengthFt = Math.max(1, Number(body.lengthFt) || 14);
    const widthFt = Math.max(1, Number(body.widthFt) || 12);
    const ceilingHeightFt = Math.max(6, Number(body.ceilingHeightFt) || 10);
    const pinX = Math.max(2, Math.min(98, Number(body.pinX) || 50));
    const pinY = Math.max(3, Math.min(97, Number(body.pinY) || 50));

    const isRadiantZone =
      body.isRadiantZone !== undefined
        ? Boolean(body.isRadiantZone)
        : floorLevel !== "Exterior";

    const exteriorWallSystem =
      body.exteriorWallSystem || "Nuform CF8i Perimeter + 2x4 Interior";
    const hasExteriorCF8iWall = exteriorWallSystem.includes("CF8i");
    const cf8iInteriorFinish =
      body.cf8iInteriorFinish ||
      (floorLevel === "Exterior"
        ? "Exposed Nuform Polymer White/Tan — No Drywall"
        : "Furred Drywall + Paint");

    const metrics = calculateRoomMetrics({
      lengthFt,
      widthFt,
      ceilingHeightFt,
      cf8iInteriorFinish,
    });

    // Compute non-overlapping default gridX / gridZ from pinX / pinY percentages
    const gridX = Number(((pinX / 100) * 64).toFixed(1));
    const gridZ = Number(((pinY / 100) * 42).toFixed(1));

    const createdRoom = await prisma.room.create({
      data: {
        projectId,
        name,
        floorLevel,
        lengthFt,
        widthFt,
        ceilingHeightFt,
        floorAreaSqFt: metrics.floorAreaSqFt,
        perimeterLinFt: metrics.perimeterLinFt,
        interiorPartitionSqFt: metrics.interiorPartitionSqFt,
        netWallAreaSqFt: metrics.netWallAreaSqFt,
        pinX,
        pinY,
        gridX,
        gridZ,
        hasExteriorCF8iWall,
        hasGarageFireWall: Boolean(body.hasGarageFireWall),
        cf8iInteriorFinish,
        hasRadiantSlab: isRadiantZone,
      },
    });

    return NextResponse.json({ ok: true, room: createdRoom }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create room" },
      { status: 500 }
    );
  }
}
