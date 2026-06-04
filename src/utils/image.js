/**
 * Utility helper to resolve image paths after the GCS migration.
 * Handles:
 * 1. Absolute GCS URLs: starting with "http" or "https".
 * 2. Relative GCS paths: starting with "/store", "/category", or "/banner".
 * 3. Legacy relative paths: starting with "/upload".
 *
 * @param {string|object} dbPath The image path or file object.
 * @returns {string} The formatted absolute image URL.
 */
export const getImageUrl = (dbPath) => {
  if (!dbPath) return "";

  if (typeof dbPath !== "string") {
    // If it's a File object or something else, return it as-is (e.g. local blob preview)
    return dbPath;
  }

  // Clean any quotes (database entries can sometimes have extra outer quotes)
  const cleanedPath = dbPath.replace(/^"+|"+$/g, "").trim();
  if (!cleanedPath) return "";

  // 1. Absolute GCS URLs: starting with "http" or "https"
  if (cleanedPath.startsWith("http://") || cleanedPath.startsWith("https://")) {
    return cleanedPath;
  }

  // 2. Relative GCS paths: starting with "/store", "/category", or "/banner"
  if (
    cleanedPath.startsWith("/store") ||
    cleanedPath.startsWith("/category") ||
    cleanedPath.startsWith("/banner")
  ) {
    return `https://storage.googleapis.com/gloup-images${cleanedPath}`;
  }

  // 2b. Relative GCS paths without leading slash
  if (
    cleanedPath.startsWith("store/") ||
    cleanedPath.startsWith("category/") ||
    cleanedPath.startsWith("banner/")
  ) {
    return `https://storage.googleapis.com/gloup-images/${cleanedPath}`;
  }

  // 3. Legacy relative paths: starting with "/upload" or any other local routes
  if (cleanedPath.startsWith("/")) {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "https://api.v1.gloup.in";
    const base = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
    return `${base}${cleanedPath}`;
  }

  // 3b. Local path without leading slash (e.g. "upload/...")
  const apiBase = import.meta.env.VITE_API_BASE_URL || "https://api.v1.gloup.in";
  const base = apiBase.endsWith("/") ? apiBase : `${apiBase}/`;
  return `${base}${cleanedPath}`;
};
