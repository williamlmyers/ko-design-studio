import { NextRequest, NextResponse } from "next/server";
import { readUploadedFileBytes } from "@/lib/storage";
import {
  buildSmartDemoPlanDecomposition,
  ParsedPlanDecomposition,
} from "@/lib/plan-parser";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileUrl = "",
      fileName = "Sunbury-Custom-ICF-Residence.pdf",
      mimeType = "application/pdf",
    } = body as {
      fileUrl?: string;
      fileName?: string;
      mimeType?: string;
    };

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_PLAN_MODEL || "gemini-3.5-flash-lite";

    if (geminiApiKey && fileUrl) {
      const fileBytes = await readUploadedFileBytes(fileUrl);
      if (fileBytes) {
        const base64Data = fileBytes.toString("base64");
        const prompt = `You are an architectural plan takeoff assistant for KO Builders (specializing in Nuform ConForm CF8i insulated concrete walls, 2x4 light-gauge metal interior framing, and hydronic radiant concrete slabs).
Decompose this architectural plan into JSON matching this exact structure:
{
  "suggestedProjectName": "string",
  "suggestedClientName": "string",
  "suggestedSiteAddress": "string",
  "rooms": [
    {
      "name": "string",
      "roomType": "EXTERIOR | GARAGE | KITCHEN | GREAT_ROOM | PRIMARY_BED | PRIMARY_BATH | GUEST | LAUNDRY | MECHANICAL",
      "floorLevel": "Main Level",
      "lengthFt": 20,
      "widthFt": 16,
      "ceilingHeightFt": 10,
      "gridX": 0,
      "gridZ": 0,
      "pinX": 50,
      "pinY": 50,
      "hasRadiantSlab": true,
      "hasExteriorCF8iWall": true,
      "hasGarageFireWall": false,
      "cf8iInteriorFinish": "Furred Drywall + Paint"
    }
  ],
  "openings": [
    {
      "openingTag": "W-01",
      "roomName": "string",
      "openingType": "Window | Exterior Door | Garage Fire-Separation Door | Interior Door",
      "widthInches": 72,
      "heightInches": 60,
      "sillHeightInches": 30,
      "manufacturer": "Pella Reserve",
      "modelSku": "PR-3P-7260",
      "exteriorColor": "Matte Black",
      "interiorColor": "Warm White",
      "glassSpec": "Triple-Pane Low-E",
      "jambDepthInches": 8.375,
      "fireRating": "Standard",
      "notes": "CF8i deep buck required"
    }
  ]
}
Return ONLY valid JSON.`;

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      {
                        inlineData: {
                          mimeType: mimeType || "application/pdf",
                          data: base64Data,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  responseMimeType: "application/json",
                },
              }),
            }
          );

          if (response.ok) {
            const llmData = await response.json();
            const textOut =
              llmData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const parsedJson = JSON.parse(textOut);
            if (Array.isArray(parsedJson?.rooms) && parsedJson.rooms.length > 0) {
              const result: ParsedPlanDecomposition = {
                parserSource: "gemini-multimodal",
                modelUsed: geminiModel,
                suggestedProjectName:
                  parsedJson.suggestedProjectName || `${fileName} — ICF Build`,
                suggestedClientName:
                  parsedJson.suggestedClientName || "Custom Home Client",
                suggestedSiteAddress:
                  parsedJson.suggestedSiteAddress || "Sunbury, OH",
                envelopeWallSystem:
                  "Nuform ConForm 8-inch Insulated Form (CF8i)",
                interiorFramingType: "2x4 Light-Gauge Metal Framing",
                hvacPrimaryHeat: "Hydronic Radiant Concrete Slab",
                rooms: parsedJson.rooms,
                openings: parsedJson.openings || [],
              };
              return NextResponse.json(result);
            }
          }
        } catch {
          // Fall through cleanly to Smart Demo Plan Parser
        }
      }
    }

    const demoDecomposition = buildSmartDemoPlanDecomposition(fileName);
    return NextResponse.json(demoDecomposition);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to parse architectural plan" },
      { status: 500 }
    );
  }
}
