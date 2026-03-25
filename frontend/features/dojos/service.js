import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";
import { apiClient } from "@/shared/services/api-client";

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value;
};

const normalizePaginationMeta = (rawValue = {}) => {
  const parsedLimit = Number.parseInt(String(rawValue.limit), 10);

  return {
    limit: Number.isNaN(parsedLimit) ? 0 : parsedLimit,
    direction:
      typeof rawValue.direction === "string" ? rawValue.direction : "next",
    nextCursor: normalizeText(rawValue.next_cursor),
    prevCursor: normalizeText(rawValue.prev_cursor),
    hasNext: Boolean(rawValue.has_next),
    hasPrev: Boolean(rawValue.has_prev),
  };
};

const resolveAssetUrl = (value) => {
  const normalizedValue = normalizeText(value);
  if (normalizedValue.length === 0) {
    return "";
  }

  if (normalizedValue.startsWith("http://") || normalizedValue.startsWith("https://")) {
    return normalizedValue;
  }

  try {
    return new URL(normalizedValue, ENV.apiBaseUrl).toString();
  } catch {
    return normalizedValue;
  }
};

const normalizeDojo = (rawValue = {}) => {
  const normalizedUuid = normalizeText(rawValue.uuid || rawValue.id);

  return {
    id: normalizedUuid,
    uuid: normalizedUuid,
    name: normalizeText(rawValue.name),
    logoUrl: resolveAssetUrl(rawValue.logo_url),
    createdAt: normalizeText(rawValue.created_at),
    updatedAt: normalizeText(rawValue.updated_at),
  };
};

const buildDojoFormData = (payload) => {
  const formData = new FormData();

  formData.set("name", normalizeText(payload?.name));

  if (payload?.logo instanceof File) {
    formData.set("logo", payload.logo, payload.logo.name);
  }

  return formData;
};

const parseEnvelopeResponse = async (response, fallbackErrorMessage) => {
  const responseText = await response.text();
  let envelope = null;

  if (responseText) {
    try {
      envelope = JSON.parse(responseText);
    } catch {
      envelope = {
        message: fallbackErrorMessage,
        data: null,
      };
    }
  }

  if (!response.ok) {
    const message = typeof envelope?.message === "string"
      ? envelope.message
      : fallbackErrorMessage;

    throw new Error(message);
  }

  return envelope;
};

export const listDojos = async (query) => {
  const envelope = await apiClient.get(API_ENDPOINTS.dojos, query);
  const rawItems = Array.isArray(envelope?.data?.items) ? envelope.data.items : [];

  return {
    items: rawItems.map((item) => normalizeDojo(item)),
    meta: normalizePaginationMeta(envelope?.data?.meta),
  };
};

export const getDojoById = async (id) => {
  const envelope = await apiClient.get(API_ENDPOINTS.dojoById(id));
  return normalizeDojo(envelope?.data);
};

export const createDojo = async (payload) => {
  const formData = buildDojoFormData(payload);

  const response = await fetch("/api/dojos", {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to create dojo");

  return normalizeDojo(envelope?.data);
};

export const updateDojo = async (id, payload) => {
  const formData = buildDojoFormData(payload);

  const response = await fetch(`/api/dojos/${id}`, {
    method: "PUT",
    body: formData,
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to update dojo");

  return normalizeDojo(envelope?.data);
};

export const deleteDojo = async (id) => {
  const response = await fetch(`/api/dojos/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });

  await parseEnvelopeResponse(response, "Failed to delete dojo");
};
