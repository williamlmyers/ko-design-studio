import { NextRequest, NextResponse } from "next/server";
import { saveLocalUpload } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const saved = await saveLocalUpload(buffer, file.name);

    return NextResponse.json({
      ok: true,
      fileName: saved.filename,
      publicUrl: saved.publicUrl,
      mimeType: file.type || "application/pdf",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Local file upload failed" },
      { status: 500 }
    );
  }
}
