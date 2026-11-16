import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "ko_builders_session";

export type UserRole = "BUILDER_ADMIN" | "HOMEOWNER" | "SUBCONTRACTOR";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tradeSpecialty: string | null;
  projectId: string | null;
}

export async function getSessionUser(): Promise<SessionUser> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (raw) {
      const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
      if (parsed?.id && parsed?.role) {
        return parsed as SessionUser;
      }
    }
  } catch {
    // Fallback to default Builder Admin if cookie is absent or invalid
  }

  const adminUser = await prisma.user.findFirst({
    where: { role: "BUILDER_ADMIN" },
  });

  if (adminUser) {
    return {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role as UserRole,
      tradeSpecialty: adminUser.tradeSpecialty,
      projectId: adminUser.projectId,
    };
  }

  return {
    id: "default-admin",
    email: "kevin@kobuilders.com",
    name: "Kevin O'Connor (KO Builders)",
    role: "BUILDER_ADMIN",
    tradeSpecialty: null,
    projectId: null,
  };
}

export function encodeSessionCookie(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user), "utf-8").toString("base64");
}
