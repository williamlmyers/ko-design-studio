"use client";

import React, { use, useEffect, useState } from "react";
import { TradePacketView } from "@/components/TradePacketView";

export default function SubcontractorTradePacketPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<any | null>(null);

  useEffect(() => {
    // Strictly request role=SUBCONTRACTOR so zero pricing is returned by the API
    fetch(`/api/projects/${id}?role=SUBCONTRACTOR&_t=${Date.now()}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => setProject(d.project));
  }, [id]);

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 p-10 text-sm">
        Loading Subcontractor Trade Work Order Packet (Zero Pricing)...
      </div>
    );
  }

  return (
    <TradePacketView
      project={project}
      isTokenizedExternalView={false}
      initialTradeSlug="ALL"
    />
  );
}
