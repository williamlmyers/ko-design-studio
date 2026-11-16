import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface StoredBookmarkletClip {
  id: string;
  timestamp: number;
  url: string;
  product: ClippedProductPayload;
}

const globalForClipper = globalThis as unknown as {
  latestBookmarkletClip?: StoredBookmarkletClip | null;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      latestClip: globalForClipper.latestBookmarkletClip || null,
    },
    { headers: CORS_HEADERS }
  );
}

export interface ClippedProductPayload {
  manufacturer: string;
  modelNumber: string;
  productName: string;
  finish: string;
  colorName: string;
  colorCode: string;
  colorHex: string;
  unitCost: number;
  unit: string;
  imageUrl: string;
  tradeCategory: string;
  specNotes: string;
}

function inferHexFromFinishText(text: string): {
  colorHex: string;
  finish: string;
  colorName: string;
  colorCode: string;
} {
  const lower = text.toLowerCase();

  if (
    lower.includes("moderne brass") ||
    lower.includes("luxe gold") ||
    lower.includes("champagne bronze") ||
    lower.includes("satin brass") ||
    lower.includes("brushed gold") ||
    lower.includes("antique brass")
  ) {
    const code = lower.includes("2mb")
      ? "2MB"
      : lower.includes("cz")
      ? "CZ"
      : lower.includes("gl")
      ? "GL"
      : "BRS";
    const finishName = lower.includes("moderne brass")
      ? "Vibrant Brushed Moderne Brass"
      : lower.includes("champagne bronze")
      ? "Champagne Bronze"
      : lower.includes("luxe gold")
      ? "Brushed Luxe Gold"
      : "Brushed Brass / Gold";
    return {
      colorHex: "#C5A059",
      finish: finishName,
      colorName: finishName,
      colorCode: code,
    };
  }

  if (
    lower.includes("matte black") ||
    lower.includes("iron ore") ||
    lower.includes("flat black") ||
    lower.includes("oil-rubbed bronze") ||
    lower.includes("dark bronze")
  ) {
    return {
      colorHex: "#1F2022",
      finish: "Matte Black",
      colorName: "Matte Black",
      colorCode: "BL",
    };
  }

  if (
    lower.includes("polished nickel") ||
    lower.includes("brushed nickel") ||
    lower.includes("arctic stainless") ||
    lower.includes("stainless") ||
    lower.includes("chrome")
  ) {
    const isChrome = lower.includes("chrome");
    return {
      colorHex: "#D1D5DB",
      finish: isChrome ? "Polished Chrome" : "Vibrant Brushed Nickel / Stainless",
      colorName: isChrome ? "Polished Chrome" : "Brushed Nickel / Stainless",
      colorCode: isChrome ? "CP" : "BN",
    };
  }

  if (lower.includes("white oak") || lower.includes("natural oak") || lower.includes("hickory")) {
    return {
      colorHex: "#D7C4A5",
      finish: "Ultra-Matte Brushed Wood",
      colorName: "Natural White Oak",
      colorCode: "RWO",
    };
  }

  if (lower.includes("alabaster") || lower.includes("white") || lower.includes("ivory")) {
    return {
      colorHex: "#F2EFE9",
      finish: "Architectural Matte White",
      colorName: "Warm White / Alabaster",
      colorCode: "WHT",
    };
  }

  return {
    colorHex: "#CBD5E1",
    finish: "Standard Architectural Finish",
    colorName: "Standard Finish",
    colorCode: "STD",
  };
}

function inferTradeSlugFromText(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("radiant") ||
    lower.includes("hydronic") ||
    lower.includes("manifold") ||
    lower.includes("hepex") ||
    lower.includes("uponor") ||
    lower.includes("lochinvar") ||
    lower.includes("slab loop") ||
    lower.includes("pex-a loop")
  ) {
    return "hydronic-radiant";
  }
  if (
    lower.includes("faucet") ||
    lower.includes("shower") ||
    lower.includes("valve") ||
    lower.includes("toilet") ||
    lower.includes("tub") ||
    lower.includes("sink") ||
    lower.includes("kohler") ||
    lower.includes("brizo") ||
    lower.includes("moen") ||
    lower.includes("delta")
  ) {
    return "plumbing-fixtures";
  }
  if (
    lower.includes("pendant") ||
    lower.includes("sconce") ||
    lower.includes("chandelier") ||
    lower.includes("downlight") ||
    lower.includes("recessed") ||
    lower.includes("dimmer") ||
    lower.includes("lutron") ||
    lower.includes("kelvin") ||
    lower.includes("visual comfort")
  ) {
    return "electrical-lighting";
  }
  if (
    lower.includes("tile") ||
    lower.includes("porcelain") ||
    lower.includes("hardwood") ||
    lower.includes("plank") ||
    lower.includes("lvp") ||
    lower.includes("flooring") ||
    lower.includes("kahrs") ||
    lower.includes("kährs")
  ) {
    return "flooring-tile";
  }
  if (
    lower.includes("paint") ||
    lower.includes("sherwin") ||
    lower.includes("benjamin moore") ||
    lower.includes("eggshell") ||
    lower.includes("primer")
  ) {
    return "paint-finishes";
  }
  if (
    lower.includes("quartz") ||
    lower.includes("cambria") ||
    lower.includes("countertop") ||
    lower.includes("granite") ||
    lower.includes("marble")
  ) {
    return "countertops-stone";
  }
  if (
    lower.includes("cabinet") ||
    lower.includes("vanity") ||
    lower.includes("millwork") ||
    lower.includes("shiloh")
  ) {
    return "cabinetry-millwork";
  }
  if (
    lower.includes("range") ||
    lower.includes("refrigerator") ||
    lower.includes("dishwasher") ||
    lower.includes("oven") ||
    lower.includes("wolf") ||
    lower.includes("sub-zero")
  ) {
    return "appliances";
  }
  if (
    lower.includes("diffuser") ||
    lower.includes("erv") ||
    lower.includes("hrv") ||
    lower.includes("thermostat") ||
    lower.includes("heat pump") ||
    lower.includes("zehnder") ||
    lower.includes("titus")
  ) {
    return "hvac-iaq";
  }
  if (
    lower.includes("window") ||
    lower.includes("door") ||
    lower.includes("pella") ||
    lower.includes("andersen") ||
    lower.includes("schlage") ||
    lower.includes("emtek") ||
    lower.includes("lever")
  ) {
    return "windows-doors-trim";
  }
  if (lower.includes("nuform") || lower.includes("cf8i") || lower.includes("concrete")) {
    return "concrete-nuform-cf8i";
  }
  return "plumbing-fixtures";
}

function parseHtmlMetadataAndJsonLd(html: string, url: string) {
  let jsonLdProduct: any = null;
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
        ? parsed["@graph"]
        : [parsed];
      for (const node of candidates) {
        const nodeType = String(node?.["@type"] || "").toLowerCase();
        if (nodeType.includes("product")) {
          jsonLdProduct = node;
          break;
        }
      }
      if (jsonLdProduct) break;
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  function getMetaContent(propName: string): string {
    const reg = new RegExp(
      `<meta[^>]+(?:property|name)=["']${propName}["'][^>]+content=["']([^"']+)["']`,
      "i"
    );
    const m = reg.exec(html);
    if (m?.[1]) return m[1];
    const regRev = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propName}["']`,
      "i"
    );
    const m2 = regRev.exec(html);
    return m2?.[1] || "";
  }

  const titleTagMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const ogTitle =
    getMetaContent("og:title") ||
    getMetaContent("twitter:title") ||
    (titleTagMatch ? titleTagMatch[1].trim() : "");
  const ogImage =
    getMetaContent("og:image") || getMetaContent("twitter:image") || "";
  const ogPrice =
    getMetaContent("product:price:amount") ||
    getMetaContent("og:price:amount") ||
    "";
  const ogBrand = getMetaContent("product:brand") || "";
  const ogDescription =
    getMetaContent("og:description") || getMetaContent("description") || "";

  const cleanedText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);

  return {
    jsonLdProduct,
    ogTitle,
    ogImage,
    ogPrice,
    ogBrand,
    ogDescription,
    cleanedText,
    url,
  };
}

function buildHeuristicProductClip(input: {
  jsonLdProduct?: any;
  ogTitle?: string;
  ogImage?: string;
  ogPrice?: string;
  ogBrand?: string;
  ogDescription?: string;
  cleanedText: string;
  url: string;
}): ClippedProductPayload {
  const {
    jsonLdProduct,
    ogTitle = "",
    ogImage = "",
    ogPrice = "",
    ogBrand = "",
    ogDescription = "",
    cleanedText,
    url,
  } = input;

  const combinedText = `${url} ${ogTitle} ${ogBrand} ${ogDescription} ${
    jsonLdProduct ? JSON.stringify(jsonLdProduct) : ""
  } ${cleanedText}`;

  // 1. Manufacturer detection
  let manufacturer =
    (typeof jsonLdProduct?.brand === "string"
      ? jsonLdProduct.brand
      : jsonLdProduct?.brand?.name) ||
    ogBrand ||
    "";

  if (!manufacturer) {
    const knownBrands = [
      "Brizo",
      "Kohler",
      "Delta",
      "Moen",
      "Hansgrohe",
      "Rohl",
      "Kährs",
      "Kahrs",
      "Atlas Concorde",
      "Cambria",
      "Sherwin-Williams",
      "Benjamin Moore",
      "Visual Comfort",
      "Tech Lighting",
      "DMF Lighting",
      "Lutron",
      "Sub-Zero",
      "Wolf",
      "Miele",
      "Thermador",
      "Pella",
      "Andersen",
      "Marvin",
      "Emtek",
      "Schlage",
      "Baldwin",
      "Buster + Punch",
      "Zehnder",
      "Titus",
      "Uponor",
      "Nuform",
      "Shiloh",
    ];
    for (const b of knownBrands) {
      if (combinedText.toLowerCase().includes(b.toLowerCase())) {
        manufacturer = b;
        break;
      }
    }
  }

  if (!manufacturer && url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
      manufacturer = host.charAt(0).toUpperCase() + host.slice(1);
    } catch {
      manufacturer = "Specified Brand";
    }
  }

  // 2. Model / SKU detection
  let modelNumber =
    jsonLdProduct?.sku ||
    jsonLdProduct?.mpn ||
    jsonLdProduct?.model ||
    jsonLdProduct?.productID ||
    "";

  if (!modelNumber) {
    const skuMatch =
      /(?:SKU|Model|Item|Part\s*#|Style\s*#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._-]{3,22})/i.exec(
        combinedText
      ) || /\b([A-Z]{1,4}-?[0-9]{3,6}[A-Z0-9-]{0,10})\b/.exec(combinedText);
    modelNumber = skuMatch?.[1] || "SPEC-SKU-01";
  }

  // 3. Product Name
  let productName =
    jsonLdProduct?.name ||
    ogTitle.split("|")[0].split(" - ")[0].trim() ||
    "";

  if (!productName && url) {
    try {
      const segments = new URL(url).pathname.split("/").filter(Boolean);
      const lastSeg = segments[segments.length - 1] || "Architectural Fixture";
      productName = lastSeg
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      productName = "Custom Clipped Product";
    }
  }
  if (!productName) {
    productName = `${manufacturer || "Custom"} Architectural Fixture`;
  }

  // 4. Finish & Color Swatch
  const finishInfo = inferHexFromFinishText(
    `${jsonLdProduct?.color || ""} ${productName} ${ogDescription} ${cleanedText.slice(
      0,
      1500
    )}`
  );

  // 5. Unit Cost
  let unitCost = 0;
  const offerObj = Array.isArray(jsonLdProduct?.offers)
    ? jsonLdProduct.offers[0]
    : jsonLdProduct?.offers;
  if (offerObj?.price) {
    unitCost = Number(String(offerObj.price).replace(/[^0-9.]/g, "")) || 0;
  } else if (ogPrice) {
    unitCost = Number(String(ogPrice).replace(/[^0-9.]/g, "")) || 0;
  } else {
    const priceMatch = /\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/.exec(
      combinedText
    );
    if (priceMatch?.[1]) {
      unitCost = Number(priceMatch[1].replace(/,/g, "")) || 0;
    }
  }
  if (!unitCost) {
    unitCost = 485;
  }

  // 6. Image URL
  let imageUrl = "";
  if (typeof jsonLdProduct?.image === "string") {
    imageUrl = jsonLdProduct.image;
  } else if (Array.isArray(jsonLdProduct?.image)) {
    imageUrl =
      typeof jsonLdProduct.image[0] === "string"
        ? jsonLdProduct.image[0]
        : jsonLdProduct.image[0]?.url || "";
  } else if (jsonLdProduct?.image?.url) {
    imageUrl = jsonLdProduct.image.url;
  }
  if (!imageUrl && ogImage) {
    imageUrl = ogImage;
  }

  // 7. Trade Category & Unit
  const tradeCategory = inferTradeSlugFromText(combinedText);
  const unit =
    tradeCategory === "flooring-tile" ||
    tradeCategory === "paint-finishes" ||
    tradeCategory === "countertops-stone" ||
    tradeCategory === "hydronic-radiant"
      ? "sq ft"
      : "each";

  // 8. Technical Spec Notes
  const gpmMatch = /(\d+(?:\.\d+)?\s*GPM)/i.exec(combinedText);
  const kelvinMatch = /(\d{4}\s*K)/i.exec(combinedText);
  const rawDesc = (jsonLdProduct?.description || ogDescription || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  const specParts = [
    gpmMatch ? `Flow Rate: ${gpmMatch[1]}` : "",
    kelvinMatch ? `Color Temp: ${kelvinMatch[1]}` : "",
    rawDesc || "Verify rough-in template and mounting height per manufacturer spec sheet.",
  ].filter(Boolean);

  return {
    manufacturer: manufacturer || "Kohler",
    modelNumber,
    productName,
    finish: jsonLdProduct?.color || finishInfo.finish,
    colorName: jsonLdProduct?.color || finishInfo.colorName,
    colorCode: finishInfo.colorCode,
    colorHex: finishInfo.colorHex,
    unitCost: Number(unitCost.toFixed(2)),
    unit,
    imageUrl,
    tradeCategory,
    specNotes: specParts.join(" | "),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      url = "",
      rawText = "",
      ogTitle = "",
      ogImage = "",
      ogPrice = "",
      ogBrand = "",
      jsonLd = "",
      fromBookmarklet = false,
    } = body as {
      url?: string;
      rawText?: string;
      ogTitle?: string;
      ogImage?: string;
      ogPrice?: string;
      ogBrand?: string;
      jsonLd?: string;
      fromBookmarklet?: boolean;
    };

    if (!url.trim() && !rawText.trim() && !ogTitle.trim()) {
      return NextResponse.json(
        { error: "Please provide a product URL or pasted product text." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let parsedJsonLdFromBookmarklet: any = null;
    if (jsonLd && typeof jsonLd === "string") {
      try {
        const parsed = JSON.parse(jsonLd);
        const candidates = Array.isArray(parsed)
          ? parsed
          : parsed["@graph"]
          ? parsed["@graph"]
          : [parsed];
        for (const node of candidates) {
          const nodeType = String(node?.["@type"] || "").toLowerCase();
          if (nodeType.includes("product")) {
            parsedJsonLdFromBookmarklet = node;
            break;
          }
        }
      } catch {
        // Ignore if multiple scripts or raw text
      }
    }

    let parsedHtmlMeta = {
      jsonLdProduct: parsedJsonLdFromBookmarklet,
      ogTitle: ogTitle.trim(),
      ogImage: ogImage.trim(),
      ogPrice: ogPrice.trim(),
      ogBrand: ogBrand.trim(),
      ogDescription: "",
      cleanedText: `${jsonLd ? jsonLd + " " : ""}${rawText.trim()}`.slice(
        0,
        14000
      ),
      url: url.trim(),
    };

    // 1. If a URL is provided and no rawText override was given, attempt server-side fetch
    if (url.trim() && !rawText.trim() && !ogTitle.trim()) {
      try {
        const res = await fetch(url.trim(), {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
          },
          redirect: "follow",
        });

        if (res.status === 403 || res.status === 429 || res.status === 503) {
          return NextResponse.json(
            {
              blocked: true,
              message:
                "Vendor blocked direct fetch—use the 1-Click KO Clipper Bookmarklet or paste page text below to auto-fill.",
            },
            { headers: CORS_HEADERS }
          );
        }

        if (res.ok) {
          const html = await res.text();
          // Detect Cloudflare/captcha challenge shells with empty product content
          if (
            html.includes("cf-browser-verification") ||
            (html.includes("Just a moment...") && html.length < 15000)
          ) {
            return NextResponse.json(
              {
                blocked: true,
                message:
                  "Vendor blocked direct fetch—use the 1-Click KO Clipper Bookmarklet or paste page text below to auto-fill.",
              },
              { headers: CORS_HEADERS }
            );
          }
          parsedHtmlMeta = parseHtmlMetadataAndJsonLd(html, url.trim());
        }
      } catch {
        // If running in an environment where external vendor fetch is blocked and no rawText was provided,
        // check if the URL itself contains rich product slug data or prompt for rawText
      }
    }

    // 2. Build baseline extraction from JSON-LD, OpenGraph, Regex, and URL structure
    const heuristicClip = buildHeuristicProductClip(parsedHtmlMeta);

    // 3. If GEMINI_API_KEY is configured, enhance and normalize with Gemini 2.5 Flash
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      const prompt = `You are a construction specification product clipper for KO Builders.
Extract and normalize the product details from the following vendor webpage data into strict JSON:

URL: ${url}
OpenGraph Title: ${parsedHtmlMeta.ogTitle}
OpenGraph Brand: ${parsedHtmlMeta.ogBrand}
OpenGraph Price: ${parsedHtmlMeta.ogPrice}
OpenGraph Image: ${parsedHtmlMeta.ogImage}
JSON-LD Product: ${
        parsedHtmlMeta.jsonLdProduct
          ? JSON.stringify(parsedHtmlMeta.jsonLdProduct).slice(0, 4000)
          : "None"
      }
Page Text: ${parsedHtmlMeta.cleanedText.slice(0, 6000)}

Return ONLY valid JSON with these exact keys:
{
  "manufacturer": "string (e.g. Kohler, Brizo, Moen, Delta, Kährs)",
  "modelNumber": "string (exact manufacturer SKU/model number)",
  "productName": "string (clean fixture/material title)",
  "finish": "string (e.g. Vibrant Brushed Moderne Brass, Matte Black, Champagne Bronze)",
  "colorName": "string (human-readable color/finish name)",
  "colorCode": "string (finish code or suffix e.g. 2MB, BL, CZ, SW 7008)",
  "colorHex": "string (6-digit hex code matching the finish e.g. #C5A059 for brass/gold, #1F2022 for matte black, #D1D5DB for stainless/nickel)",
  "unitCost": 489.00,
  "unit": "each | sq ft | lin ft",
  "imageUrl": "string (primary product photo URL)",
  "tradeCategory": "concrete-nuform-cf8i | framing-drywall | windows-doors-trim | plumbing-fixtures | hydronic-radiant | hvac-iaq | electrical-lighting | cabinetry-millwork | countertops-stone | flooring-tile | paint-finishes | appliances",
  "specNotes": "string (concise rough-in, GPM flow rate, mounting hole count, or dimension notes)"
}`;

      try {
        const llmRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (llmRes.ok) {
          const llmData = await llmRes.json();
          const textOut =
            llmData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const parsedLlm = JSON.parse(textOut);

          const merged: ClippedProductPayload = {
            manufacturer:
              parsedLlm.manufacturer || heuristicClip.manufacturer,
            modelNumber: parsedLlm.modelNumber || heuristicClip.modelNumber,
            productName: parsedLlm.productName || heuristicClip.productName,
            finish: parsedLlm.finish || heuristicClip.finish,
            colorName: parsedLlm.colorName || heuristicClip.colorName,
            colorCode: parsedLlm.colorCode || heuristicClip.colorCode,
            colorHex:
              /^#[0-9A-Fa-f]{6}$/.test(parsedLlm.colorHex || "")
                ? parsedLlm.colorHex
                : heuristicClip.colorHex,
            unitCost:
              Number(parsedLlm.unitCost) > 0
                ? Number(parsedLlm.unitCost)
                : heuristicClip.unitCost,
            unit: parsedLlm.unit || heuristicClip.unit,
            imageUrl: parsedLlm.imageUrl || heuristicClip.imageUrl,
            tradeCategory:
              parsedLlm.tradeCategory || heuristicClip.tradeCategory,
            specNotes: parsedLlm.specNotes || heuristicClip.specNotes,
          };

          if (fromBookmarklet) {
            globalForClipper.latestBookmarkletClip = {
              id: `clip-${Date.now()}`,
              timestamp: Date.now(),
              url: url.trim(),
              product: merged,
            };
          }

          return NextResponse.json(
            {
              ok: true,
              source: "gemini-2.5-flash",
              product: merged,
            },
            { headers: CORS_HEADERS }
          );
        }
      } catch {
        // Fall through to heuristic JSON-LD / regex clip
      }
    }

    if (fromBookmarklet) {
      globalForClipper.latestBookmarkletClip = {
        id: `clip-${Date.now()}`,
        timestamp: Date.now(),
        url: url.trim(),
        product: heuristicClip,
      };
    }

    return NextResponse.json(
      {
        ok: true,
        source: "jsonld-regex-parser",
        product: heuristicClip,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to clip product specifications" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
