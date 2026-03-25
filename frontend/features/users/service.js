import { API_ENDPOINTS } from "@/shared/config/api";
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

const normalizeBoolean = (value, fallbackValue = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }

    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  return fallbackValue;
};

const normalizeUser = (rawValue = {}) => {
  const normalizedUuid = normalizeText(rawValue.uuid || rawValue.id);

  return {
    id: normalizedUuid,
    uuid: normalizedUuid,
    name: normalizeText(rawValue.name),
    email: normalizeText(rawValue.email),
    role: normalizeText(rawValue.role),
    dojoId: normalizeText(rawValue.dojo_id),
    dojoName: normalizeText(rawValue.dojo_name),
    isActive: normalizeBoolean(rawValue.is_active, false),
    lastLogin: normalizeText(rawValue.last_login),
    isVerified: normalizeBoolean(rawValue.is_verified, false),
    verifiedAt: normalizeText(rawValue.verified_at),
    resetToken: normalizeText(rawValue.reset_token),
    resetTokenExpiry: normalizeText(rawValue.reset_token_expiry),
    createdBy: normalizeText(rawValue.created_by),
    updatedBy: normalizeText(rawValue.updated_by),
    createdAt: normalizeText(rawValue.created_at),
    updatedAt: normalizeText(rawValue.updated_at),
  };
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

export const listUsers = async (query) => {
  const envelope = await apiClient.get(API_ENDPOINTS.users, query);
  const rawItems = Array.isArray(envelope?.data?.items) ? envelope.data.items : [];

  return {
    items: rawItems.map((item) => normalizeUser(item)),
    meta: normalizePaginationMeta(envelope?.data?.meta),
  };
};

export const createUser = async (payload) => {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to create user");

  return normalizeUser(envelope?.data);
};

export const updateUser = async (id, payload) => {
  const response = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to update user");

  return normalizeUser(envelope?.data);
};

export const deleteUser = async (id) => {
  const response = await fetch(`/api/users/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });

  await parseEnvelopeResponse(response, "Failed to delete user");
};

export const getUserById = async (id) => {
  const envelope = await apiClient.get(API_ENDPOINTS.userById(id));
  return normalizeUser(envelope?.data);
};