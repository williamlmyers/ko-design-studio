import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  computeItemFinancials,
  evaluateSelectionWarnings,
  getFramingContextNote,
  sanitizeProjectForRole,
} from "@/lib/construction-rules";
import { getDefaultProductMedia } from "@/lib/product-media";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roleOverride = req.nextUrl.searchParams.get("role");
    const sessionUser = await getSessionUser();
    const activeRole = roleOverride || sessionUser.role;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        rooms: {
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

    const fullPayload = {
      ...project,
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
