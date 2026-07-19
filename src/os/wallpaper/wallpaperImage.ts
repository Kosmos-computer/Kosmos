/**
 * Turn a local or Files-picked image into a persistable wallpaper data URL.
 * Resizes to a desktop-friendly long edge so localStorage stays under quota.
 */

const MAX_EDGE = 1920;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

export async function fileToWallpaperDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Image must be 12 MB or smaller.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
