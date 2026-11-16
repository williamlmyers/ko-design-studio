import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "ko-builders-assets";

let bucketVerifiedInProcess = false;

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function isSupabaseStorageConfigured(): boolean {
  const url = getSupabaseUrl();
  return Boolean(
    url &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      url.startsWith("http")
  );
}

export async function ensureSupabaseBucket(): Promise<void> {
  if (!isSupabaseStorageConfigured() || bucketVerifiedInProcess) return;
  try {
    const supabase = createClient(
      getSupabaseUrl(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: existing } = await supabase.storage.getBucket(BUCKET_NAME);
    if (!existing) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
      });
    } else if (!existing.public) {
      await supabase.storage.updateBucket(BUCKET_NAME, {
        public: true,
      });
    }
    bucketVerifiedInProcess = true;
  } catch {
    // Ignore if bucket already exists
  }
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
    await ensureSupabaseBucket();
    const supabase = createClient(
      getSupabaseUrl(),
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

export async function uploadAsset(
  fileBuffer: Buffer,
  originalFileName: string,
  contentType = "image/svg+xml"
): Promise<{
  publicUrl: string;
  mode: "supabase" | "local";
}> {
  const safeName = sanitizeFileName(originalFileName || "room-render.svg");

  if (isSupabaseStorageConfigured()) {
    try {
      await ensureSupabaseBucket();
      const supabase = createClient(
        getSupabaseUrl(),
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const objectPath = `renders/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(objectPath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (!error) {
        const { data: pubData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(objectPath);
        return {
          publicUrl: pubData.publicUrl,
          mode: "supabase",
        };
      }
    } catch {
      // Fall back to local storage
    }
  }

  const saved = await saveLocalUpload(fileBuffer, safeName);
  return {
    publicUrl: saved.publicUrl,
    mode: "local",
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
