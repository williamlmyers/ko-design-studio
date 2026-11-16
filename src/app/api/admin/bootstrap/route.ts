import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed-data";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-bootstrap-secret");
    const body = await req.json().catch(() => ({}));
    const providedSecret = authHeader || body?.secret;
    const expectedSecret =
      process.env.ADMIN_BOOTSTRAP_SECRET || "ko-builders-bootstrap-2026";

    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid ADMIN_BOOTSTRAP_SECRET" },
        { status: 401 }
      );
    }

    const result = await seedDatabase();
    return NextResponse.json({
      ok: true,
      message: "Database bootstrapped and seeded successfully.",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Bootstrap failed" },
      { status: 500 }
    );
  }
}
