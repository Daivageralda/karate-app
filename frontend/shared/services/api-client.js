import { ENV } from "@/shared/config/env";

const DEFAULT_HEADERS = Object.freeze({
  Accept: "application/json",
  "Content-Type": "application/json",
});

const buildUrl = ({ path, query }) => {
  const url = new URL(path, ENV.apiBaseUrl);

  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const parsePayload = async (response) => {
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
};

const toApiError = ({ payload, response }) => {
  const message = payload && typeof payload === "object" && typeof payload.message === "string"
    ? payload.message
    : "Request failed";

  const error = new Error(message);
  error.statusCode = response.status;
  error.details = payload;
  return error;
};

const request = async ({ method, path, query, body }) => {
  const response = await fetch(buildUrl({ path, query }), {
    method,
    headers: DEFAULT_HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await parsePayload(response);

  if (!response.ok) {
    throw toApiError({ payload, response });
  }

  return payload;
};

export const apiClient = Object.freeze({
  get: (path, query) => request({ method: "GET", path, query }),
  post: (path, body) => request({ method: "POST", path, body }),
});