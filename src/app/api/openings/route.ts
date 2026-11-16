import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCF8iJambDepth } from "@/lib/construction-rules";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      roomId,
      openingTag,
      openingType = "Window",
      widthInches = 48,
      heightInches = 60,
      sillHeightInches = 36,
      manufacturer = "Pella Reserve Contemporary",
      modelSku = "PR-3P-4860",
      exteriorColor = "Matte Black Clad",
      interiorColor = "Warm White",
      glassSpec = "Triple-Pane Low-E Argon",
      fireRating,
      notes,
    } = body;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const jambDepthInches = computeCF8iJambDepth(
      openingType,
      room.hasExteriorCF8iWall,
      room.hasGarageFireWall,
      room.cf8iInteriorFinish
    );

    const computedFireRating =
      fireRating ||
      (openingType === "Garage Fire-Separation Door"
        ? "90-Min UL Self-Closing Fire-Rated + Intumescent Smoke Seal"
        : "Standard Exterior Envelope");

    const created = await prisma.windowDoorOpening.create({
      data: {
        projectId,
        roomId,
        openingTag: openingTag || `W-${Math.floor(Math.random() * 90 + 10)}`,
        openingType,
        widthInches: Number(widthInches),
        heightInches: Number(heightInches),
        sillHeightInches: Number(sillHeightInches),
        manufacturer,
        modelSku,
        exteriorColor,
        interiorColor,
        glassSpec,
        jambDepthInches,
        fireRating: computedFireRating,
        notes: notes || null,
      },
      include: { room: true },
    });

    return NextResponse.json({ ok: true, opening: created });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create opening" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing opening id" }, { status: 400 });
    }
    await prisma.windowDoorOpening.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete opening" },
      { status: 500 }
    );
  }
}
