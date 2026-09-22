/**
 * Resolves a stored image URL/value to a usable browser URL.
 *
 * Handles:
 * - Correct /uploads/questions/... paths  → returned as-is
 * - Correct /uploads/...          paths  → returned as-is (legacy upload-image dir)
 * - https://... or http://...            → returned as-is
 * - data:image/... base64 blobs          → returns null (too large; image won't show)
 * - null / undefined / empty string      → returns null
 *
 * This is purely a read-time safety net.  It does NOT mutate the DB.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Correct relative paths served by Next.js from /public
  if (trimmed.startsWith("/uploads/")) return trimmed;

  // Absolute external URLs
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  // Base64 blobs — refuse to embed; they are remnants of the old storage system.
  // They cause broken-image icons when the data is corrupted/truncated and are
  // extremely expensive to transmit. Return null so the image simply does not render
  // rather than crashing the page.
  if (trimmed.startsWith("data:image")) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[imageUtils] Encountered a base64 explanationImageUrl. " +
          "Run the migration script (scripts/migrate-explanation-images.js) to convert " +
          "these records to file storage. The image will not display until migrated."
      );
    }
    return null;
  }

  // Unknown format — log and skip
  if (process.env.NODE_ENV !== "production") {
    console.warn("[imageUtils] Unknown image URL format:", trimmed.substring(0, 80));
  }
  return null;
}
