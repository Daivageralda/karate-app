const FALLBACK_API_BASE_URL = "http://localhost:8080";

const normalizeBaseUrl = (value) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return FALLBACK_API_BASE_URL;
  }

  return value.trim().replace(/\/+$/, "");
};

export const ENV = Object.freeze({
  apiBaseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
});