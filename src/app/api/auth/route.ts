import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  encodeSessionCookie,
  getSessionUser,
  SESSION_COOKIE_NAME,
  SessionUser,
  UserRole,
} from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    currentUser: user,
    availableUsers: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      tradeSpecialty: u.tradeSpecialty,
      projectId: u.projectId,
    })),
    demoSwitcherEnabled:
      process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCHER !== "false",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, email, magicToken } = body as {
      role?: UserRole;
      email?: string;
      magicToken?: string;
    };

    let targetUser = null;

    if (magicToken) {
      const project = await prisma.project.findFirst({
        where: { magicAccessToken: magicToken },
      });
      if (project) {
        targetUser = await prisma.user.findFirst({
          where: { role: "HOMEOWNER" },
        });
      }
    } else if (email) {
      targetUser = await prisma.user.findUnique({
        where: { email },
      });
    } else if (role) {
      targetUser = await prisma.user.findFirst({
        where: { role },
      });
    }

    const sessionPayload: SessionUser = targetUser
      ? {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role as UserRole,
          tradeSpecialty: targetUser.tradeSpecialty,
          projectId: targetUser.projectId,
        }
      : {
          id: `demo-${(role || "BUILDER_ADMIN").toLowerCase()}`,
          email:
            role === "HOMEOWNER"
              ? "jr.candy@titkoresidence.com"
              : role === "SUBCONTRACTOR"
              ? "mike@midwestmep.com"
              : "kevin@kobuilders.com",
          name:
            role === "HOMEOWNER"
              ? "JR & Candy Titko (Homeowners)"
              : role === "SUBCONTRACTOR"
              ? "Mike Vance (Subcontractor / Field View)"
              : "Kevin O'Connor (KO Builders Admin)",
          role: role || "BUILDER_ADMIN",
          tradeSpecialty: role === "SUBCONTRACTOR" ? "All Trades Field View" : null,
          projectId: null,
        };

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, encodeSessionCookie(sessionPayload), {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
    });

    return NextResponse.json({
      ok: true,
      currentUser: sessionPayload,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Authentication failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
