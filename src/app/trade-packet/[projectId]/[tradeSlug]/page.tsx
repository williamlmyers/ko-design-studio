import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  computeItemFinancials,
  getFramingContextNote,
  sanitizeProjectForRole,
} from "@/lib/construction-rules";
import { getDefaultProductMedia } from "@/lib/product-media";
import { verifyTradeToken } from "@/lib/trade-token";
import { AlertTriangle } from "lucide-react";
import { TradePacketView } from "@/components/TradePacketView";
import { ensureSplitPlumbingAndRadiantTrades } from "@/lib/seed-data";

export default async function TokenizedTradePacketPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; tradeSlug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  await ensureSplitPlumbingAndRadiantTrades();

  const { projectId, tradeSlug } = await params;
  const { token } = await searchParams;

  // 1. Strictly validate `tradeSlug` server-side against `TradeCategory` (return 404 if invalid)
  const normalizedSlug = (tradeSlug || "").trim().toLowerCase();
  const activeTrade = await prisma.tradeCategory.findUnique({
    where: { slug: normalizedSlug },
  });

  if (!activeTrade) {
    notFound();
  }

  // 2. Fetch lightweight project identity ONLY to verify the cryptographic HMAC token first
  const projectAuthMeta = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      magicAccessToken: true,
    },
  });

  if (!projectAuthMeta) {
    notFound();
  }

  // 3. Verify `token` against HMAC(`${projectId}:${tradeSlug}:${project.magicAccessToken}`)
  //    BEFORE querying or rendering any trade items.
  const isTokenValid = verifyTradeToken(
    projectAuthMeta.id,
    normalizedSlug,
    projectAuthMeta.magicAccessToken,
    token
  );

  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-2xl p-6 text-center space-y-3 shadow-2xl">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <div className="text-[11px] font-mono uppercase tracking-widest text-red-400 font-bold">
            403 Unauthorized / Invalid Trade Link
          </div>
          <h1 className="text-lg font-bold text-white">
            Cryptographic Trade Scope Verification Failed
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This field link is cryptographically bound to a single trade scope (
            <code>{normalizedSlug}</code>) via HMAC-SHA256. Modifying the{" "}
            <code>tradeSlug</code> in the URL or using an invalid token is
            blocked. Please request a trade-specific field link from KO
            Builders.
          </p>
        </div>
      </div>
    );
  }

  // 4. Only after HMAC verification succeeds, query the project and the single trade's selections
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      rooms: { orderBy: { name: "asc" } },
      openings: { include: { room: true }, orderBy: { openingTag: "asc" } },
      selections: {
        where: {
          tradeCategoryId: activeTrade.id,
        },
        include: {
          room: true,
          tradeCategory: true,
          parentItem: {
            select: {
              id: true,
              componentName: true,
              sku: true,
              phaseGateway: true,
            },
          },
          pairedChildren: {
            select: {
              id: true,
              componentName: true,
              sku: true,
              phaseGateway: true,
            },
          },
        },
        orderBy: [{ phaseGateway: "asc" }, { componentName: "asc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  const enrichedSelections = project.selections.map((sel) => {
    const financials = computeItemFinancials(sel);
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
      effectiveQty: financials.effectiveQty,
      dynamicFramingNote,
      swatchImageUrl: media.swatchImageUrl,
      productUrl: media.productUrl,
      vendorName: media.vendorName,
    };
  });

  // 5. Strictly sanitize to guarantee zero pricing on the server
  const sanitizedProject = sanitizeProjectForRole(
    {
      ...project,
      selections: enrichedSelections,
    },
    "SUBCONTRACTOR"
  );

  return (
    <TradePacketView
      project={sanitizedProject}
      isTokenizedExternalView={true}
      lockedTrade={activeTrade}
      initialTradeSlug={activeTrade.slug}
    />
  );
}
