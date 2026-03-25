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

const normalizeNumber = (value, fallbackValue = 0) => {
  const parsedValue = Number.parseInt(String(value), 10);
  return Number.isNaN(parsedValue) ? fallbackValue : parsedValue;
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

const normalizeTimeWindow = (rawValue = {}) => {
  return {
    startAt: normalizeText(rawValue.start_at),
    endAt: normalizeText(rawValue.end_at),
    registrationDeadline: normalizeText(rawValue.registration_deadline),
  };
};

const normalizeOrganizer = (rawValue = {}) => {
  return {
    name: normalizeText(rawValue.name),
    email: normalizeText(rawValue.email),
  };
};

const normalizeLocation = (rawValue = {}) => {
  return {
    name: normalizeText(rawValue.name),
    address: normalizeText(rawValue.address),
    city: normalizeText(rawValue.city),
  };
};

const normalizeAttachments = (rawValue) => {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue.map((item) => {
    return {
      fileName: normalizeText(item?.file_name),
      fileUrl: resolveAssetUrl(item?.file_url),
      contentType: normalizeText(item?.content_type),
      size: normalizeNumber(item?.size),
    };
  });
};

const normalizeConfig = (rawValue = {}) => {
  return {
    status: normalizeText(rawValue.status),
    isRegistrationOpen: Boolean(rawValue.is_registration_open),
    maxParticipants: normalizeNumber(rawValue.max_participants),
  };
};

const normalizeEvent = (rawValue = {}) => {
  const normalizedUuid = normalizeText(rawValue.uuid || rawValue.id);

  return {
    id: normalizedUuid,
    uuid: normalizedUuid,
    name: normalizeText(rawValue.name || rawValue.title),
    slug: normalizeText(rawValue.slug),
    description: normalizeText(rawValue.description),
    time: normalizeTimeWindow(rawValue.time),
    organizer: normalizeOrganizer(rawValue.organizer),
    location: normalizeLocation(rawValue.location),
    bannerUrl: resolveAssetUrl(rawValue.banner_url),
    attachments: normalizeAttachments(rawValue.attachments),
    config: normalizeConfig(rawValue.config),
    createdAt: normalizeText(rawValue.created_at),
    updatedAt: normalizeText(rawValue.updated_at),
  };
};

const buildEventFormData = (payload) => {
  const formData = new FormData();

  formData.set("name", normalizeText(payload?.name));
  formData.set("slug", normalizeText(payload?.slug));
  formData.set("description", normalizeText(payload?.description));
  formData.set("time", JSON.stringify(payload?.time || {}));
  formData.set("organizer", JSON.stringify(payload?.organizer || {}));
  formData.set("location", JSON.stringify(payload?.location || {}));
  formData.set("config", JSON.stringify(payload?.config || {}));

  if (payload?.banner instanceof File) {
    formData.set("banner", payload.banner, payload.banner.name);
  }

  if (Array.isArray(payload?.attachments)) {
    payload.attachments.forEach((attachment) => {
      if (attachment instanceof File) {
        formData.append("attachments", attachment, attachment.name);
      }
    });
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

export const listEvents = async (query) => {
  const envelope = await apiClient.get(API_ENDPOINTS.events, query);
  const rawItems = Array.isArray(envelope?.data?.items) ? envelope.data.items : [];

  return {
    items: rawItems.map((item) => normalizeEvent(item)),
    meta: normalizePaginationMeta(envelope?.data?.meta),
  };
};

export const createEvent = async (payload) => {
  const formData = buildEventFormData(payload);

  const response = await fetch("/api/events", {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to create event");

  return normalizeEvent(envelope?.data);
};

export const updateEvent = async (id, payload) => {
  const formData = buildEventFormData(payload);

  const response = await fetch(`/api/events/${id}`, {
    method: "PUT",
    body: formData,
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to update event");

  return normalizeEvent(envelope?.data);
};

export const deleteEvent = async (id) => {
  const response = await fetch(`/api/events/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });

  await parseEnvelopeResponse(response, "Failed to delete event");
};

export const getEventById = async (id) => {
  const envelope = await apiClient.get(API_ENDPOINTS.eventById(id));
  return normalizeEvent(envelope?.data);
};