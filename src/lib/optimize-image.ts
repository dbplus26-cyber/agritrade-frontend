// Client-side photo downscaling, shared by every upload control.
//
// Phone cameras produce 4-12MB images the system renders at ~1200px at most;
// shrinking them in the browser before staging turns a minutes-long upload on
// a rural mobile connection into seconds and keeps the backend's Cloudinary
// call well inside its timeout. Any decode failure (e.g. HEIC on a browser
// that can't read it) or a result that isn't actually smaller falls back to
// the original file, so this can never make an upload worse.

// Photos below this size are staged untouched - fast to upload anyway, and it
// keeps small transparent PNGs (logos) intact rather than flattening to JPEG.
const OPTIMIZE_THRESHOLD_BYTES = 1024 * 1024;
const DEFAULT_MAX_EDGE_PX = 2048;
const OPTIMIZE_QUALITY = 0.85;
const OPTIMIZABLE_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function optimizeImage(
  file: File,
  maxEdgePx: number = DEFAULT_MAX_EDGE_PX,
): Promise<File> {
  if (
    file.size < OPTIMIZE_THRESHOLD_BYTES ||
    !OPTIMIZABLE_TYPES.has(file.type)
  ) {
    return file;
  }
  try {
    // "from-image" bakes the EXIF rotation in so phone photos stay upright.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(
      1,
      maxEdgePx / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", OPTIMIZE_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}
