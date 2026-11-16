import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, roomId, initials = "JRT" } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      );
    }

    const whereClause: Record<string, any> = {
      projectId,
      status: {
        notIn: ["Client Approved & Locked", "Compatibility Warning"],
      },
    };

    if (roomId && roomId !== "ALL") {
      whereClause.roomId = roomId;
    }

    const result = await prisma.selectionItem.updateMany({
      where: whereClause,
      data: {
        status: "Client Approved & Locked",
        approvedByInitials: initials.toUpperCase(),
        approvedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      lockedCount: result.count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Bulk approve failed" },
      { status: 500 }
    );
  }
}
