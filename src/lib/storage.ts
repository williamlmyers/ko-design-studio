import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";

const BUCKET_NAME = "ko-builders-assets";

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_URL.startsWith("http")
  );
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function createSignedUploadUrl(originalFileName: string): Promise<{
  mode: "supabase" | "local";
  signedUrl?: string;
  publicUrl: string;
  objectPath: string;
}> {
  const safeName = sanitizeFileName(originalFileName || "architectural-plan.pdf");
  const objectPath = `plans/${Date.now()}-${safeName}`;

  if (isSupabaseStorageConfigured()) {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(objectPath);

    if (error || !data?.signedUrl) {
      throw new Error(
        `Supabase signed upload URL failed: ${error?.message || "Unknown error"}`
      );
    }

    const { data: pubData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(objectPath);

    return {
      mode: "supabase",
      signedUrl: data.signedUrl,
      publicUrl: pubData.publicUrl,
      objectPath,
    };
  }

  const localFilename = `${Date.now()}-${safeName}`;
  return {
    mode: "local",
    publicUrl: `/api/uploads/${localFilename}`,
    objectPath: localFilename,
  };
}

export async function saveLocalUpload(
  fileBuffer: Buffer,
  originalFileName: string
): Promise<{
  filename: string;
  publicUrl: string;
  diskPath: string;
}> {
  const safeName = sanitizeFileName(originalFileName || "upload.bin");
  const filename = `${Date.now()}-${safeName}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const diskPath = path.join(uploadsDir, filename);
  await fs.writeFile(diskPath, fileBuffer);

  return {
    filename,
    publicUrl: `/api/uploads/${filename}`,
    diskPath,
  };
}

export async function readUploadedFileBytes(fileUrl: string): Promise<Buffer | null> {
  try {
    if (fileUrl.startsWith("/api/uploads/") || fileUrl.startsWith("/uploads/")) {
      const filename = path.basename(fileUrl);
      const localPath = path.join(process.cwd(), "public", "uploads", filename);
      return await fs.readFile(localPath);
    }
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      const res = await fetch(fileUrl);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }
    return null;
  } catch {
    return null;
  }
}
