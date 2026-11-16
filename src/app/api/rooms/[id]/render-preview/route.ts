import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadAsset } from "@/lib/storage";

export const maxDuration = 60;

interface FinishSpecSummary {
  wallHex: string;
  wallLabel: string;
  wallFinish: string;
  floorHex: string;
  floorLabel: string;
  floorPattern: "plank" | "tile" | "polymer";
  cabinetHex: string;
  cabinetLabel: string;
  counterHex: string;
  counterLabel: string;
  fixtureHex: string;
  fixtureLabel: string;
  lightingLabel: string;
  kelvin: number;
}

function buildArchitecturalPerspectiveSvg(opts: {
  projectName: string;
  roomName: string;
  lengthFt: number;
  widthFt: number;
  ceilingHeightFt: number;
  cf8iInteriorFinish: string;
  hasRadiantSlab: boolean;
  openingsCount: number;
  spec: FinishSpecSummary;
  variantLabel?: string;
}): string {
  const {
    projectName,
    roomName,
    lengthFt,
    widthFt,
    ceilingHeightFt,
    cf8iInteriorFinish,
    hasRadiantSlab,
    openingsCount,
    spec,
    variantLabel,
  } = opts;

  const isKitchen = roomName.toLowerCase().includes("kitchen");
  const isBath = roomName.toLowerCase().includes("bath");
  const isGarageOrMech =
    roomName.toLowerCase().includes("garage") ||
    roomName.toLowerCase().includes("mechanical");
  const isBed = roomName.toLowerCase().includes("bed");

  const warmGlow =
    spec.kelvin <= 2700 ? "#FDE68A" : spec.kelvin <= 3000 ? "#FEF3C7" : "#E0F2FE";

  // Floor pattern lines (perspective planks or large-format tile grid)
  let floorPatternSvg = "";
  if (spec.floorPattern === "plank") {
    const rays = [-600, -420, -260, -120, 0, 120, 260, 420, 600];
    floorPatternSvg = rays
      .map(
        (dx) =>
          `<line x1="${800 + dx * 0.35}" y1="620" x2="${
            800 + dx * 1.65
          }" y2="920" stroke="#0F172A" stroke-opacity="0.22" stroke-width="2"/>`
      )
      .join("\n");
    floorPatternSvg += `
      <line x1="220" y1="710" x2="1380" y2="710" stroke="#0F172A" stroke-opacity="0.14" stroke-width="1.5"/>
      <line x1="120" y1="805" x2="1480" y2="805" stroke="#0F172A" stroke-opacity="0.16" stroke-width="1.5"/>
    `;
  } else if (spec.floorPattern === "tile") {
    const rays = [-520, -340, -170, 0, 170, 340, 520];
    floorPatternSvg = rays
      .map(
        (dx) =>
          `<line x1="${800 + dx * 0.4}" y1="620" x2="${
            800 + dx * 1.5
          }" y2="920" stroke="#E2E8F0" stroke-opacity="0.38" stroke-width="2"/>`
      )
      .join("\n");
    floorPatternSvg += `
      <line x1="260" y1="685" x2="1340" y2="685" stroke="#E2E8F0" stroke-opacity="0.35" stroke-width="2"/>
      <line x1="175" y1="760" x2="1425" y2="760" stroke="#E2E8F0" stroke-opacity="0.35" stroke-width="2"/>
      <line x1="85" y1="845" x2="1515" y2="845" stroke="#E2E8F0" stroke-opacity="0.35" stroke-width="2"/>
    `;
  } else {
    floorPatternSvg = `
      <line x1="310" y1="750" x2="1290" y2="750" stroke="#94A3B8" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="12 8"/>
      <line x1="800" y1="620" x2="800" y2="920" stroke="#94A3B8" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="12 8"/>
    `;
  }

  // Casework / Focal Millwork based on room type
  let focalInteriorSvg = "";
  if (isKitchen) {
    focalInteriorSvg = `
      <!-- Rear Perimeter Cabinetry & Quartz Backsplash -->
      <rect x="410" y="250" width="520" height="145" rx="4" fill="${spec.cabinetHex}" stroke="#1E293B" stroke-width="2.5"/>
      <line x1="540" y1="250" x2="540" y2="395" stroke="#0F172A" stroke-opacity="0.35" stroke-width="2"/>
      <line x1="670" y1="250" x2="670" y2="395" stroke="#0F172A" stroke-opacity="0.35" stroke-width="2"/>
      <line x1="800" y1="250" x2="800" y2="395" stroke="#0F172A" stroke-opacity="0.35" stroke-width="2"/>
      <!-- Full-Height Quartz Backsplash -->
      <rect x="410" y="395" width="520" height="85" fill="${spec.counterHex}" stroke="#94A3B8" stroke-width="1.5"/>
      <path d="M430 420 Q560 455 710 412 T910 448" stroke="#64748B" stroke-opacity="0.35" stroke-width="2" fill="none"/>
      <!-- Base Cabinets -->
      <rect x="410" y="480" width="520" height="140" fill="${spec.cabinetHex}" stroke="#1E293B" stroke-width="2.5"/>
      <!-- Foreground Waterfall Quartz Island -->
      <polygon points="470,695 1130,695 1190,855 410,855" fill="${spec.cabinetHex}" stroke="#0F172A" stroke-width="3"/>
      <polygon points="455,665 1145,665 1195,705 405,705" fill="${spec.counterHex}" stroke="#CBD5E1" stroke-width="2.5"/>
      <polygon points="405,705 445,705 435,855 395,855" fill="${spec.counterHex}" stroke="#94A3B8" stroke-width="2"/>
      <polygon points="1155,705 1195,705 1205,855 1165,855" fill="${spec.counterHex}" stroke="#94A3B8" stroke-width="2"/>
      <!-- Articulating Faucet on Island -->
      <path d="M790 675 L790 615 Q790 592 814 592 L832 592 Q845 592 845 608 L845 625" stroke="${spec.fixtureHex}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <!-- 3 Sculptural Pendants -->
      <line x1="610" y1="140" x2="610" y2="310" stroke="${spec.fixtureHex}" stroke-width="3"/>
      <circle cx="610" cy="324" r="18" fill="${warmGlow}" stroke="${spec.fixtureHex}" stroke-width="3"/>
      <line x1="800" y1="140" x2="800" y2="310" stroke="${spec.fixtureHex}" stroke-width="3"/>
      <circle cx="800" cy="324" r="18" fill="${warmGlow}" stroke="${spec.fixtureHex}" stroke-width="3"/>
      <line x1="990" y1="140" x2="990" y2="310" stroke="${spec.fixtureHex}" stroke-width="3"/>
      <circle cx="990" cy="324" r="18" fill="${warmGlow}" stroke="${spec.fixtureHex}" stroke-width="3"/>
    `;
  } else if (isBath) {
    focalInteriorSvg = `
      <!-- Floating Rift Oak Double Vanity -->
      <rect x="430" y="455" width="440" height="110" rx="6" fill="${spec.cabinetHex}" stroke="#0F172A" stroke-width="2.5"/>
      <rect x="422" y="436" width="456" height="22" rx="3" fill="${spec.counterHex}" stroke="#CBD5E1" stroke-width="2"/>
      <!-- Dual Backlit Mirrors -->
      <rect x="465" y="255" width="150" height="155" rx="12" fill="#E0F2FE" fill-opacity="0.35" stroke="${spec.fixtureHex}" stroke-width="4"/>
      <rect x="685" y="255" width="150" height="155" rx="12" fill="#E0F2FE" fill-opacity="0.35" stroke="${spec.fixtureHex}" stroke-width="4"/>
      <!-- Zero-Entry Curbless Glass Shower Enclosure & Raincan -->
      <rect x="930" y="210" width="270" height="410" fill="#BAE6FD" fill-opacity="0.18" stroke="#94A3B8" stroke-width="2.5"/>
      <line x1="1065" y1="210" x2="1065" y2="250" stroke="${spec.fixtureHex}" stroke-width="4"/>
      <ellipse cx="1065" cy="254" rx="34" ry="8" fill="${spec.fixtureHex}"/>
      <circle cx="1065" cy="405" r="11" fill="${spec.fixtureHex}"/>
    `;
  } else if (isBed) {
    focalInteriorSvg = `
      <!-- Architectural Upholstered Bed & Wood Headboard Wall -->
      <rect x="520" y="380" width="440" height="150" rx="8" fill="${spec.cabinetHex}" stroke="#1E293B" stroke-width="2.5"/>
      <rect x="560" y="495" width="360" height="145" rx="10" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2"/>
      <rect x="545" y="545" width="390" height="125" rx="8" fill="${spec.counterHex}" stroke="#64748B" stroke-width="2"/>
    `;
  } else if (isGarageOrMech) {
    focalInteriorSvg = `
      <!-- Nuform CF8i Exposed Polymer Wall & Hydronic / EV Equipment -->
      <rect x="460" y="275" width="210" height="240" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="3"/>
      <text x="565" y="315" text-anchor="middle" fill="#F8FAFC" font-family="monospace" font-size="13" font-weight="bold">UPONOR 6-ZONE MANIFOLD</text>
      <line x1="500" y1="515" x2="500" y2="620" stroke="#DC2626" stroke-width="5"/>
      <line x1="535" y1="515" x2="535" y2="620" stroke="#DC2626" stroke-width="5"/>
      <line x1="570" y1="515" x2="570" y2="620" stroke="#2563EB" stroke-width="5"/>
      <line x1="605" y1="515" x2="605" y2="620" stroke="#2563EB" stroke-width="5"/>
      <rect x="740" y="290" width="240" height="220" rx="8" fill="#0F172A" stroke="#38BDF8" stroke-width="2.5"/>
      <text x="860" y="330" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="13" font-weight="bold">ZEHNDER ERV + IAQ CORE</text>
    `;
  } else {
    focalInteriorSvg = `
      <!-- Vaulted Great Room Custom Media & Fireplace Wall -->
      <rect x="540" y="230" width="380" height="390" fill="${spec.counterHex}" stroke="#64748B" stroke-width="2"/>
      <rect x="595" y="310" width="270" height="145" rx="4" fill="#0F172A" stroke="#334155" stroke-width="4"/>
      <rect x="600" y="510" width="260" height="58" rx="4" fill="#1E293B" stroke="#F59E0B" stroke-width="2"/>
      <path d="M635 555 Q665 518 690 555 T750 550 T815 555" stroke="#F97316" stroke-width="5" fill="none"/>
      <rect x="380" y="505" width="155" height="115" fill="${spec.cabinetHex}" stroke="#1E293B" stroke-width="2"/>
      <rect x="925" y="505" width="155" height="115" fill="${spec.cabinetHex}" stroke="#1E293B" stroke-width="2"/>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
    <defs>
      <linearGradient id="ceilingGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#F8FAFC"/>
        <stop offset="100%" stop-color="${spec.wallHex}"/>
      </linearGradient>
      <linearGradient id="daylight" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#BAE6FD" stop-opacity="0.88"/>
        <stop offset="100%" stop-color="#FEF3C7" stop-opacity="0.32"/>
      </linearGradient>
      <radialGradient id="canLight" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${warmGlow}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${warmGlow}" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Background Canvas -->
    <rect width="1600" height="1000" fill="#090D16"/>

    <!-- 3D Perspective Ceiling Plane -->
    <polygon points="80,40 1520,40 1240,210 360,210" fill="url(#ceilingGrad)" stroke="#475569" stroke-width="2"/>
    <!-- Flush Mud-In Linear Slot Diffusers & Recessed Can Glows -->
    <line x1="450" y1="125" x2="1150" y2="125" stroke="#0F172A" stroke-width="5"/>
    <ellipse cx="560" cy="155" rx="95" ry="32" fill="url(#canLight)"/>
    <ellipse cx="1040" cy="155" rx="95" ry="32" fill="url(#canLight)"/>

    <!-- Left Wall Plane (Nuform CF8i 8-3/8" Deep Window Buck Wall) -->
    <polygon points="80,40 360,210 360,620 80,920" fill="${spec.wallHex}" stroke="#334155" stroke-width="2"/>
    <!-- Left Wall Triple-Pane Window w/ Deep CF8i Jamb Return -->
    <polygon points="145,215 315,285 315,525 145,635" fill="#1E293B" stroke="#0F172A" stroke-width="3"/>
    <polygon points="162,228 308,292 308,515 162,612" fill="url(#daylight)" stroke="#334155" stroke-width="2"/>
    <line x1="238" y1="262" x2="238" y2="562" stroke="#1E293B" stroke-width="4"/>

    <!-- Right Wall Plane -->
    <polygon points="1520,40 1240,210 1240,620 1520,920" fill="${spec.wallHex}" stroke="#334155" stroke-width="2"/>

    <!-- Center Rear Wall Plane -->
    <rect x="360" y="210" width="880" height="410" fill="${spec.wallHex}" stroke="#334155" stroke-width="2.5"/>

    <!-- Floor Plane (Bound to Active Flooring / Tile Selection) -->
    <polygon points="360,620 1240,620 1520,920 80,920" fill="${spec.floorHex}" stroke="#1E293B" stroke-width="3"/>
    ${floorPatternSvg}

    <!-- Daylight Floor Reflection Polygon -->
    <polygon points="210,695 450,655 590,825 260,885" fill="#FEF9C3" fill-opacity="0.18"/>

    <!-- Room-Specific Millwork, Cabinetry, Countertops & Fixtures -->
    ${focalInteriorSvg}

    <!-- Architectural Specification Overlay HUD Bar -->
    <rect x="40" y="885" width="1520" height="92" rx="14" fill="#0B1120" fill-opacity="0.94" stroke="#F59E0B" stroke-opacity="0.55" stroke-width="2"/>
    <text x="68" y="918" fill="#F59E0B" font-family="sans-serif" font-size="13" font-weight="bold" letter-spacing="1.5">
      KO BUILDERS • PHOTOREALISTIC ARCHITECTURAL FINISH VISUALIZATION ${
        variantLabel ? `(${variantLabel.toUpperCase()})` : ""
      }
    </text>
    <text x="68" y="944" fill="#FFFFFF" font-family="sans-serif" font-size="20" font-weight="bold">
      ${roomName} — ${lengthFt}' × ${widthFt}' × ${ceilingHeightFt}' Ceiling (${Math.round(
    lengthFt * widthFt
  )} sq ft)
    </text>
    <text x="68" y="965" fill="#94A3B8" font-family="monospace" font-size="12">
      Envelope: ${cf8iInteriorFinish} | ${
    hasRadiantSlab ? "Hydronic Radiant Concrete Slab Zone" : "Standard Envelope Zone"
  } | Openings: ${openingsCount}
    </text>

    <!-- Active Swatch Chips on Right of HUD -->
    <g transform="translate(880, 900)">
      <rect x="0" y="0" width="160" height="60" rx="8" fill="#1E293B" stroke="#334155"/>
      <rect x="10" y="12" width="24" height="36" rx="4" fill="${spec.wallHex}" stroke="#0F172A"/>
      <text x="42" y="27" fill="#94A3B8" font-family="sans-serif" font-size="10">WALL PAINT</text>
      <text x="42" y="43" fill="#F8FAFC" font-family="sans-serif" font-size="11" font-weight="bold">${spec.wallLabel.slice(
        0,
        15
      )}</text>

      <rect x="172" y="0" width="165" height="60" rx="8" fill="#1E293B" stroke="#334155"/>
      <rect x="182" y="12" width="24" height="36" rx="4" fill="${spec.floorHex}" stroke="#0F172A"/>
      <text x="214" y="27" fill="#94A3B8" font-family="sans-serif" font-size="10">FLOORING / SLAB</text>
      <text x="214" y="43" fill="#F8FAFC" font-family="sans-serif" font-size="11" font-weight="bold">${spec.floorLabel.slice(
        0,
        15
      )}</text>

      <rect x="349" y="0" width="165" height="60" rx="8" fill="#1E293B" stroke="#334155"/>
      <rect x="359" y="12" width="24" height="36" rx="4" fill="${spec.cabinetHex}" stroke="#0F172A"/>
      <text x="391" y="27" fill="#94A3B8" font-family="sans-serif" font-size="10">CABINETRY / TRIM</text>
      <text x="391" y="43" fill="#F8FAFC" font-family="sans-serif" font-size="11" font-weight="bold">${spec.cabinetLabel.slice(
        0,
        15
      )}</text>

      <rect x="526" y="0" width="145" height="60" rx="8" fill="#1E293B" stroke="#334155"/>
      <rect x="536" y="12" width="24" height="36" rx="4" fill="${spec.counterHex}" stroke="#0F172A"/>
      <text x="568" y="27" fill="#94A3B8" font-family="sans-serif" font-size="10">COUNTER / STONE</text>
      <text x="568" y="43" fill="#F8FAFC" font-family="sans-serif" font-size="11" font-weight="bold">${spec.counterLabel.slice(
        0,
        13
      )}</text>
    </g>
  </svg>`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const body = await req.json().catch(() => ({}));

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        project: true,
        selections: {
          include: { tradeCategory: true },
        },
        openings: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const paintSel = room.selections.find(
      (s) => s.tradeCategory?.slug === "paint-finishes"
    );
    const floorSel = room.selections.find(
      (s) => s.tradeCategory?.slug === "flooring-tile"
    );
    const cabSel = room.selections.find(
      (s) => s.tradeCategory?.slug === "cabinetry-millwork"
    );
    const counterSel = room.selections.find(
      (s) => s.tradeCategory?.slug === "countertops-stone"
    );
    const plumbSel = room.selections.find(
      (s) => s.tradeCategory?.slug === "plumbing-fixtures"
    );
    const lightSel = room.selections.find(
      (s) => s.tradeCategory?.slug === "electrical-lighting"
    );

    const isExposedPolymer = room.cf8iInteriorFinish.includes(
      "Exposed Nuform Polymer"
    );

    const wallHex =
      body.overrideWallHex ||
      (isExposedPolymer ? "#F8FAFC" : paintSel?.colorHex || "#F2EFE9");
    const wallLabel =
      body.overrideWallLabel ||
      (isExposedPolymer
        ? "Nuform Polymer White"
        : paintSel
        ? `${paintSel.colorName} (${paintSel.colorCode || paintSel.finish})`
        : "SW 7008 Alabaster");
    const wallFinish = paintSel?.finish || "Cashmere Eggshell";

    const floorHex =
      body.overrideFloorHex ||
      (floorSel?.colorHex || (isExposedPolymer ? "#CBD5E1" : "#E6DAC8"));
    const floorLabel =
      body.overrideFloorLabel ||
      (floorSel
        ? `${floorSel.manufacturer} ${floorSel.colorName}`
        : isExposedPolymer
        ? "Sealed Concrete Slab"
        : "Kährs White Oak");
    const floorPattern: "plank" | "tile" | "polymer" =
      body.overrideFloorPattern ||
      (isExposedPolymer
        ? "polymer"
        : floorSel?.productName?.toLowerCase().includes("tile") ||
          floorSel?.productName?.toLowerCase().includes("porcelain")
        ? "tile"
        : "plank");

    const cabinetHex =
      body.overrideCabinetHex || cabSel?.colorHex || "#D7C4A5";
    const cabinetLabel =
      body.overrideCabinetLabel ||
      (cabSel ? `${cabSel.manufacturer} ${cabSel.colorName}` : "Rift White Oak");

    const counterHex =
      body.overrideCounterHex || counterSel?.colorHex || "#EFECE6";
    const counterLabel =
      body.overrideCounterLabel ||
      (counterSel
        ? `${counterSel.manufacturer} ${counterSel.colorName}`
        : "Cambria Brittanicca Warm");

    const fixtureHex = plumbSel?.colorHex || lightSel?.colorHex || "#C5A059";
    const fixtureLabel = plumbSel
      ? `${plumbSel.manufacturer} ${plumbSel.productName} (${plumbSel.finish})`
      : "Brizo Brushed Luxe Gold";
    const lightingLabel = lightSel
      ? `${lightSel.manufacturer} ${lightSel.productName}`
      : "Architectural Recessed & Linear LED";
    const kelvin = lightSel?.colorTempKelvin || 3000;

    const openingsDesc =
      room.openings.length > 0
        ? room.openings
            .map(
              (o) =>
                `${o.openingTag} ${o.openingType} (${o.widthInches}"x${o.heightInches}", ${o.glassSpec}, ${o.jambDepthInches}" CF8i jamb)`
            )
            .join("; ")
        : "Natural daylight via Nuform CF8i deep-buck casement windows";

    const promptSummary = [
      `Photorealistic architectural interior render of ${room.name} in ${room.project.name} (${room.lengthFt}' × ${room.widthFt}', ${room.ceilingHeightFt}' ceiling, ${room.floorAreaSqFt} sq ft).`,
      `Envelope: ${room.project.envelopeWallSystem} (${room.cf8iInteriorFinish}) + ${room.project.interiorFramingType}.`,
      `Walls: ${wallLabel} [${wallHex}] (${wallFinish}).`,
      `Flooring: ${floorLabel} [${floorHex}]${
        room.hasRadiantSlab ? " over Hydronic Radiant Concrete Slab" : ""
      }.`,
      `Cabinetry/Millwork: ${cabinetLabel} [${cabinetHex}].`,
      `Countertops/Stone: ${counterLabel} [${counterHex}].`,
      `Plumbing & Hardware: ${fixtureLabel}.`,
      `Lighting & Daylighting: ${lightingLabel} (${kelvin}K) + ${openingsDesc}.`,
      body.variantLabel ? `Comparison Mode: ${body.variantLabel}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";
    const geminiApiKey = process.env.GEMINI_API_KEY;

    let imageBuffer: Buffer | null = null;
    let fileExtension = "svg";
    let contentType = "image/svg+xml";
    let generatorSource = "architectural-perspective-engine";

    if (geminiApiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptSummary }] }],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part?.inlineData?.data) {
              imageBuffer = Buffer.from(part.inlineData.data, "base64");
              contentType = part.inlineData.mimeType || "image/png";
              fileExtension = contentType.includes("jpeg") ? "jpg" : "png";
              generatorSource = imageModel;
              break;
            }
          }
        }
      } catch {
        // Gracefully fall back to high-res architectural perspective SVG render
      }
    }

    if (!imageBuffer) {
      const svgString = buildArchitecturalPerspectiveSvg({
        projectName: room.project.name,
        roomName: room.name,
        lengthFt: room.lengthFt,
        widthFt: room.widthFt,
        ceilingHeightFt: room.ceilingHeightFt,
        cf8iInteriorFinish: room.cf8iInteriorFinish,
        hasRadiantSlab: room.hasRadiantSlab,
        openingsCount: room.openings.length,
        spec: {
          wallHex,
          wallLabel,
          wallFinish,
          floorHex,
          floorLabel,
          floorPattern,
          cabinetHex,
          cabinetLabel,
          counterHex,
          counterLabel,
          fixtureHex,
          fixtureLabel,
          lightingLabel,
          kelvin,
        },
        variantLabel: body.variantLabel,
      });
      imageBuffer = Buffer.from(svgString, "utf-8");
      fileExtension = "svg";
      contentType = "image/svg+xml";
    }

    const uploaded = await uploadAsset(
      imageBuffer,
      `room-render-${room.id}-${Date.now()}.${fileExtension}`,
      contentType
    );

    const createdRender = await prisma.roomRender.create({
      data: {
        roomId: room.id,
        imageUrl: uploaded.publicUrl,
        promptSummary,
      },
    });

    const allRenders = await prisma.roomRender.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      source: generatorSource,
      render: createdRender,
      renders: allRenders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate room render preview" },
      { status: 500 }
    );
  }
}
