import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), "public", "uploads", safeName);
    const fileBuffer = await fs.readFile(filePath);

    const ext = path.extname(safeName).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentTypeMap[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
