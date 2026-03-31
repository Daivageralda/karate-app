import { ENV } from "@/shared/config/env";

const API_PREFIX = "/api/v1";

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value;
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

  return rawValue.map((item) => ({
    fileName: normalizeText(item?.file_name),
    fileUrl: resolveAssetUrl(item?.file_url),
    contentType: normalizeText(item?.content_type),
    size: normalizeNumber(item?.size),
  }));
};

const normalizeConfig = (rawValue = {}) => {
  return {
    status: normalizeText(rawValue.status),
    isRegistrationOpen: Boolean(rawValue.is_registration_open),
    maxParticipants: normalizeNumber(rawValue.max_participants),
  };
};

const normalizeBankTransfer = (rawValue = {}) => {
  return {
    bankName: normalizeText(rawValue.bank_name),
    accountName: normalizeText(rawValue.account_name),
    accountNumber: normalizeText(rawValue.account_number),
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

const normalizeEvent = (rawValue = {}) => {
  const normalizedUuid = normalizeText(rawValue.uuid || rawValue.id);

  return {
    id: normalizedUuid,
    uuid: normalizedUuid,
    name: normalizeText(rawValue.name),
    slug: normalizeText(rawValue.slug),
    description: normalizeText(rawValue.description),
    location: normalizeLocation(rawValue.location),
    time: normalizeTimeWindow(rawValue.time),
    organizer: normalizeOrganizer(rawValue.organizer),
    bannerUrl: resolveAssetUrl(rawValue.banner_url),
    attachments: normalizeAttachments(rawValue.attachments),
    config: normalizeConfig(rawValue.config),
    bankTransfer: normalizeBankTransfer(rawValue.bank_transfer),
    createdAt: normalizeText(rawValue.created_at),
    updatedAt: normalizeText(rawValue.updated_at),
  };
};

export const listDojoEvents = async (query = {}) => {
  const params = new URLSearchParams();

  if (query.direction && (query.direction === "next" || query.direction === "prev")) {
    params.set("direction", query.direction);
  }

  if (query.limit && Number.isInteger(query.limit) && query.limit > 0) {
    params.set("limit", String(query.limit));
  }

  if (query.cursor) {
    params.set("cursor", query.cursor);
  }

  const queryString = params.toString();
  const url = queryString
    ? `${ENV.apiBaseUrl}${API_PREFIX}/events?${queryString}`
    : `${ENV.apiBaseUrl}${API_PREFIX}/events`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to fetch events");

  const items = Array.isArray(envelope?.data?.items)
    ? envelope.data.items.map(normalizeEvent)
    : [];

  const meta = envelope?.data?.meta || envelope?.meta || {
    cursor: "",
    direction: "next",
    has_next: false,
    has_prev: false,
    next_cursor: "",
    prev_cursor: "",
  };

  return {
    items,
    meta: {
      cursor: meta.cursor || "",
      direction: meta.direction || "next",
      hasNext: Boolean(meta.has_next),
      hasPrev: Boolean(meta.has_prev),
      nextCursor: meta.next_cursor || "",
      prevCursor: meta.prev_cursor || "",
    },
  };
};

export const getDojoEventDetail = async (eventId) => {
  if (!eventId) {
    throw new Error("Event ID is required");
  }

  const url = `${ENV.apiBaseUrl}${API_PREFIX}/events/${eventId}`;
  const response = await fetch(
    url,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to fetch event details");
  return normalizeEvent(envelope?.data);
};

export const getParticipantStatusSummary = async (eventId, dojoId) => {
  if (!eventId || !dojoId) {
    throw new Error("Event ID and Dojo ID are required");
  }

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/participants/status`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to fetch status summary");
  return envelope?.data || {};
};

export const getParticipants = async (eventId, dojoId) => {
  if (!eventId || !dojoId) {
    throw new Error("Event ID and Dojo ID are required");
  }

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/participants`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to fetch participants");

  if (Array.isArray(envelope?.data?.data)) {
    return envelope.data.data;
  }

  if (Array.isArray(envelope?.data)) {
    return envelope.data;
  }

  return [];
};

export const getUploadedParticipantsExcelPreview = async (eventId, dojoId) => {
  if (!eventId || !dojoId) {
    throw new Error("Event ID and Dojo ID are required");
  }

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/participants/uploaded-excel-preview`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to fetch uploaded excel preview");
  return envelope?.data || null;
};

export const downloadParticipantTemplate = async (eventId) => {
  if (!eventId) {
    throw new Error("Event ID is required");
  }

  const response = await fetch(
    `/api/events/${eventId}/participants/template`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to download template");
  }

  return response.blob();
};

export const uploadParticipants = async (eventId, dojoId, file) => {
  if (!eventId || !dojoId || !file) {
    throw new Error("Event ID, Dojo ID, and file are required");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/participants/upload`,
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to upload participants");
  return envelope?.data || {};
};

export const uploadParticipantDocument = async (participantId, documentType, file) => {
  if (!participantId || !documentType || !file) {
    throw new Error("Participant ID, document type, and file are required");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_type", documentType);

  const response = await fetch(
    `/api/participants/${participantId}/documents`,
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to upload document");
  return envelope?.data || {};
};

export const uploadRecommendationLetter = async (eventId, dojoId, file) => {
  if (!eventId || !dojoId || !file) {
    throw new Error("Event ID, Dojo ID, and file are required");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/recommendation-letter`,
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to upload recommendation letter");
  return envelope?.data || {};
};

export const uploadRegistrationPayment = async (eventId, dojoId, file) => {
  if (!eventId || !dojoId || !file) {
    throw new Error("Event ID, Dojo ID, and file are required");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/registration-payment`,
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to upload registration payment");
  return envelope?.data || {};
};

export const createRegistrationPaymentInvoice = async (eventId, dojoId, options = {}) => {
  if (!eventId || !dojoId) {
    throw new Error("Event ID and Dojo ID are required");
  }

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/registration-payment/invoice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success_url: options.successUrl || "",
        failure_url: options.failureUrl || "",
      }),
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to create Xendit payment invoice");
  return envelope?.data || null;
};

export const getRecommendationLetter = async (eventId, dojoId) => {
  if (!eventId || !dojoId) {
    throw new Error("Event ID and Dojo ID are required");
  }

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/recommendation-letter`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to fetch recommendation letter");
  return envelope?.data || null;
};

export const getRegistrationPayment = async (eventId, dojoId) => {
  if (!eventId || !dojoId) {
    throw new Error("Event ID and Dojo ID are required");
  }

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/registration-payment`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const envelope = await parseEnvelopeResponse(response, "Failed to fetch registration payment");
  return envelope?.data || null;
};

export const deleteParticipantFromDojoRegistration = async (eventId, dojoId, participantId) => {
  if (!eventId || !dojoId || !participantId) {
    throw new Error("Event ID, Dojo ID, and participant ID are required");
  }

  const response = await fetch(
    `/api/events/${eventId}/dojos/${dojoId}/participants/${participantId}`,
    {
      method: "DELETE",
      cache: "no-store",
    }
  );

  await parseEnvelopeResponse(response, "Failed to delete participant");
};
