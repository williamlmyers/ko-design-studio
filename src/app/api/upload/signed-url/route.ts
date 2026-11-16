import { NextRequest, NextResponse } from "next/server";
import { createSignedUploadUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fileName = body?.fileName || "architectural-plan.pdf";
    const result = await createSignedUploadUrl(fileName);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create signed upload URL" },
      { status: 500 }
    );
  }
}
