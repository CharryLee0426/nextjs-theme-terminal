import heic2any from "heic2any";

function isHeicLike(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t.includes("heic") || t.includes("heif")) return true;
  const n = file.name.toLowerCase();
  return n.endsWith(".heic") || n.endsWith(".heif");
}

/**
 * HEIC/HEIF is not reliably decodable in `<img>` outside Safari.
 * Convert to JPEG in the browser before uploading to storage.
 */
export async function normalizeImageFileForUpload(file: File): Promise<File> {
  if (!isHeicLike(file)) return file;

  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  const base = file.name.replace(/\.(heic|heif)$/i, "") || "image";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
