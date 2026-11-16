"use client";

export interface PdfPagePreview {
  pageNumber: number;
  thumbnailDataUrl: string;
  extractedTextSnippet: string;
  isFloorPlanMatch: boolean;
  matchLabel: string | null;
}

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  }
  return pdfjsLib;
}

/**
 * Uploads any File or Blob via the dual-mode storage adapter (`src/lib/storage.ts`):
 * - Uses `POST /api/upload/signed-url` + direct PUT when Supabase Storage is configured
 * - Falls back to `POST /api/upload` locally (`./public/uploads/`)
 */
export async function uploadBlobViaStorageAdapter(
  blob: Blob,
  fileName: string
): Promise<string> {
  const file =
    blob instanceof File
      ? blob
      : new File([blob], fileName, { type: blob.type || "image/png" });

  const signedRes = await fetch("/api/upload/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name }),
  });
  const signedData = await signedRes.json();

  if (signedData.mode === "supabase" && signedData.signedUrl) {
    await fetch(signedData.signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });
    return signedData.publicUrl;
  }

  const formData = new FormData();
  formData.append("file", file);
  const localRes = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const localData = await localRes.json();
  if (!localData.publicUrl) {
    throw new Error(localData.error || "File upload failed");
  }
  return localData.publicUrl;
}

/**
 * Extracts thumbnails for all pages in an architectural PDF packet and auto-selects
 * the page whose text contains "Floor Plan" or "Main Level".
 */
export async function extractPdfPageThumbnails(file: File): Promise<{
  pages: PdfPagePreview[];
  autoSelectedPage: number;
}> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;

  const numPages = pdfDoc.numPages;
  const pages: PdfPagePreview[] = [];
  let autoSelectedPage = 1;
  let foundMatch = false;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.45 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    if (ctx) {
      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;
    }

    const thumbnailDataUrl = canvas.toDataURL("image/png");

    // Inspect page text for "Floor Plan" or "Main Level"
    let pageText = "";
    try {
      const textContent = await page.getTextContent();
      pageText = (textContent.items || [])
        .map((item: any) => item.str || "")
        .join(" ");
    } catch {
      pageText = "";
    }

    const lower = pageText.toLowerCase();
    const hasMainLevel = lower.includes("main level") || lower.includes("first floor");
    const hasFloorPlan = lower.includes("floor plan");
    const isFloorPlanMatch = hasMainLevel || hasFloorPlan;

    let matchLabel: string | null = null;
    if (hasMainLevel && hasFloorPlan) {
      matchLabel = "Main Level Floor Plan";
    } else if (hasMainLevel) {
      matchLabel = "Main Level Sheet";
    } else if (hasFloorPlan) {
      matchLabel = "Floor Plan Sheet";
    } else if (lower.includes("upper level") || lower.includes("second floor")) {
      matchLabel = "Upper Level Sheet";
    } else if (lower.includes("foundation") || lower.includes("basement")) {
      matchLabel = "Foundation / Slab Plan";
    } else if (lower.includes("elevation")) {
      matchLabel = "Exterior Elevations";
    }

    if (isFloorPlanMatch && !foundMatch) {
      autoSelectedPage = i;
      foundMatch = true;
    }

    pages.push({
      pageNumber: i,
      thumbnailDataUrl,
      extractedTextSnippet: pageText.slice(0, 140),
      isFloorPlanMatch,
      matchLabel,
    });
  }

  return {
    pages,
    autoSelectedPage,
  };
}

/**
 * Renders the chosen PDF page at 2x high-resolution scale onto an offscreen <canvas>
 * and exports it as a crisp `.png` Blob for the 2D Floor Plan & Pin Mapper background.
 */
export async function renderPdfPageAt2xToPngBlob(
  file: File,
  pageNumber: number
): Promise<Blob> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;

  const targetPageNum = Math.max(1, Math.min(pdfDoc.numPages, pageNumber));
  const page = await pdfDoc.getPage(targetPageNum);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  if (ctx) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to export 2x PDF floor-plan page to PNG Blob"));
        }
      },
      "image/png",
      1.0
    );
  });
}
