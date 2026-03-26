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

const normalizeBatasBerat = (rawValue) => {
  if (!rawValue || typeof rawValue !== "object") {
    return null;
  }

  const bawah = Number(rawValue.bawah);
  const atas = Number(rawValue.atas);

  if (!Number.isFinite(bawah) || !Number.isFinite(atas)) {
    return null;
  }

  return { bawah, atas };
};

const normalizeEventKelasTanding = (rawValue = {}) => {
  const normalizedUuid = normalizeText(rawValue.uuid || rawValue.id);

  return {
    id: normalizedUuid,
    uuid: normalizedUuid,
    nama: normalizeText(rawValue.nama),
    jenis: normalizeText(rawValue.jenis),
    kategori: normalizeText(rawValue.kategori),
    jenisKelamin: normalizeText(rawValue.jenis_kelamin),
    batasBerat: normalizeBatasBerat(rawValue.batas_berat),
    isAssigned: Boolean(rawValue.is_assigned),
    createdAt: normalizeText(rawValue.created_at),
    updatedAt: normalizeText(rawValue.updated_at),
  };
};

const normalizeEventRegistrationDojo = (rawValue = {}) => {
  return {
    dojoId: normalizeText(rawValue.dojo_id),
    dojoName: normalizeText(rawValue.dojo_name),
    dojoLogoUrl: resolveAssetUrl(rawValue.dojo_logo_url),
    totalAthletes: normalizeNumber(rawValue.total_athletes),
    approvedAthletes: normalizeNumber(rawValue.approved_athletes),
    suratKesehatanUploaded: normalizeNumber(rawValue.surat_kesehatan_uploaded),
    aktaKelahiranUploaded: normalizeNumber(rawValue.akta_kelahiran_uploaded),
    recommendationLetterStatus: normalizeText(rawValue.recommendation_letter_status),
    registeredAt: normalizeText(rawValue.registered_at),
    updatedAt: normalizeText(rawValue.updated_at),
  };
};

const normalizeParticipantDocument = (rawValue = {}) => {
  return {
    id: normalizeText(rawValue.uuid || rawValue.id),
    participantId: normalizeText(rawValue.participant_id),
    documentType: normalizeText(rawValue.document_type),
    filePath: normalizeText(rawValue.file_path),
    fileUrl: resolveAssetUrl(rawValue.file_path),
    uploadedAt: normalizeText(rawValue.uploaded_at),
    status: normalizeText(rawValue.status),
  };
};

const normalizeEventDojoParticipant = (rawValue = {}) => {
  const docs = Array.isArray(rawValue.documents) ? rawValue.documents : [];

  return {
    id: normalizeText(rawValue.uuid || rawValue.id),
    dojoId: normalizeText(rawValue.dojo_id),
    eventId: normalizeText(rawValue.event_id),
    namaLengkap: normalizeText(rawValue.nama_lengkap),
    tempatLahir: normalizeText(rawValue.tempat_lahir),
    tanggalLahir: normalizeText(rawValue.tanggal_lahir),
    jenisKelamin: normalizeText(rawValue.jenis_kelamin),
    beratBadan: Number.isFinite(Number(rawValue.berat_badan)) ? Number(rawValue.berat_badan) : null,
    kategoriTanding: rawValue.kategori_tanding,
    kelasTanding: rawValue.kelas_tanding,
    status: normalizeText(rawValue.status),
    documents: docs.map((doc) => normalizeParticipantDocument(doc)),
  };
};

const normalizeStatusSummary = (rawValue = {}) => {
  return {
    totalParticipants: normalizeNumber(rawValue.total_participants),
    approvedParticipants: normalizeNumber(rawValue.approved_participants),
    suratKesehatanUploaded: normalizeNumber(rawValue.surat_kesehatan_uploaded),
    aktaKelahiranUploaded: normalizeNumber(rawValue.akta_kelahiran_uploaded),
    recommendationLetterStatus: normalizeText(rawValue.recommendation_letter_status || "not_uploaded"),
  };
};

const normalizeRecommendationLetter = (rawValue) => {
  if (!rawValue || typeof rawValue !== "object") {
    return null;
  }

  return {
    id: normalizeText(rawValue.uuid || rawValue.id),
    dojoId: normalizeText(rawValue.dojo_id),
    eventId: normalizeText(rawValue.event_id),
    filePath: normalizeText(rawValue.file_path),
    fileUrl: resolveAssetUrl(rawValue.file_path),
    uploadedAt: normalizeText(rawValue.uploaded_at),
    status: normalizeText(rawValue.status),
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

export const getEventRegistrationDojos = async (id) => {
  const response = await fetch(`/api/events/${id}/registrations/dojos`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to fetch dojo registrations");
  const rawItems = Array.isArray(envelope?.data?.items) ? envelope.data.items : [];

  return rawItems.map((item) => normalizeEventRegistrationDojo(item));
};

export const downloadEventRegistrationDojosExcel = async (id) => {
  if (!id) {
    throw new Error("Event ID wajib diisi");
  }

  const response = await fetch(`/api/events/${id}/registrations/dojos/export`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();
    let message = "Failed to download dojo registrations excel";

    if (responseText) {
      try {
        const envelope = JSON.parse(responseText);
        if (typeof envelope?.message === "string" && envelope.message.trim().length > 0) {
          message = envelope.message;
        }
      } catch {
        // Keep fallback message when body is not JSON.
      }
    }

    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get("content-disposition") || "",
  };
};

export const getEventDojoRegistrationDetail = async (eventId, dojoId) => {
  const [statusResponse, participantsResponse, recommendationResponse] = await Promise.all([
    fetch(`/api/events/${eventId}/dojos/${dojoId}/participants/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }),
    fetch(`/api/events/${eventId}/dojos/${dojoId}/participants`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }),
    fetch(`/api/events/${eventId}/dojos/${dojoId}/recommendation-letter`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }),
  ]);

  const [statusEnvelope, participantsEnvelope, recommendationEnvelope] = await Promise.all([
    parseEnvelopeResponse(statusResponse, "Failed to fetch status summary"),
    parseEnvelopeResponse(participantsResponse, "Failed to fetch participants"),
    parseEnvelopeResponse(recommendationResponse, "Failed to fetch recommendation letter"),
  ]);

  const rawParticipants = Array.isArray(participantsEnvelope?.data?.data)
    ? participantsEnvelope.data.data
    : Array.isArray(participantsEnvelope?.data)
      ? participantsEnvelope.data
      : [];

  return {
    statusSummary: normalizeStatusSummary(statusEnvelope?.data || {}),
    participants: rawParticipants.map((item) => normalizeEventDojoParticipant(item)),
    recommendationLetter: normalizeRecommendationLetter(recommendationEnvelope?.data),
  };
};

export const updateEventDojoRecommendationLetterStatus = async (eventId, dojoId, status) => {
  if (!eventId || !dojoId) {
    throw new Error("Event ID dan Dojo ID wajib diisi");
  }

  const normalizedStatus = normalizeText(status).trim().toLowerCase();
  if (!["pending", "approved"].includes(normalizedStatus)) {
    throw new Error("Status surat rekomendasi harus pending atau approved");
  }

  const response = await fetch(`/api/events/${eventId}/dojos/${dojoId}/recommendation-letter/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: normalizedStatus }),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to update recommendation letter status");
  return normalizeRecommendationLetter(envelope?.data || {});
};

export const updateEventDojoParticipantStatus = async (eventId, dojoId, participantId, status) => {
  if (!eventId || !dojoId || !participantId) {
    throw new Error("Event ID, Dojo ID, dan Participant ID wajib diisi");
  }

  const normalizedStatus = normalizeText(status).trim().toLowerCase();
  if (!["pending", "approved"].includes(normalizedStatus)) {
    throw new Error("Status atlet harus pending atau approved");
  }

  const response = await fetch(`/api/events/${eventId}/dojos/${dojoId}/participants/${participantId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: normalizedStatus }),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to update participant status");
  return normalizeEventDojoParticipant(envelope?.data || {});
};

export const deleteEventDojoParticipant = async (eventId, dojoId, participantId) => {
  if (!eventId || !dojoId || !participantId) {
    throw new Error("Event ID, Dojo ID, dan Participant ID wajib diisi");
  }

  const response = await fetch(`/api/events/${eventId}/dojos/${dojoId}/participants/${participantId}`, {
    method: "DELETE",
    cache: "no-store",
  });

  await parseEnvelopeResponse(response, "Failed to delete participant");
};

export const getEventKelasTandingAssignments = async (eventId) => {
  if (!eventId) {
    throw new Error("Event ID wajib diisi");
  }

  const response = await fetch(`/api/events/${eventId}/kelas-tanding`, {
    method: "GET",
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to fetch event kelas tanding assignments");
  const assignedItems = Array.isArray(envelope?.data?.assigned_items) ? envelope.data.assigned_items : [];
  const unassignedItems = Array.isArray(envelope?.data?.unassigned_items) ? envelope.data.unassigned_items : [];

  return {
    assignedItems: assignedItems.map((item) => normalizeEventKelasTanding(item)),
    unassignedItems: unassignedItems.map((item) => normalizeEventKelasTanding(item)),
  };
};

export const assignEventKelasTanding = async (eventId, kelasTandingId) => {
  if (!eventId || !kelasTandingId) {
    throw new Error("Event ID dan Kelas Tanding ID wajib diisi");
  }

  const response = await fetch(`/api/events/${eventId}/kelas-tanding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ kelas_tanding_id: kelasTandingId }),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to assign kelas tanding to event");
  const assignedItems = Array.isArray(envelope?.data?.assigned_items) ? envelope.data.assigned_items : [];
  const unassignedItems = Array.isArray(envelope?.data?.unassigned_items) ? envelope.data.unassigned_items : [];

  return {
    assignedItems: assignedItems.map((item) => normalizeEventKelasTanding(item)),
    unassignedItems: unassignedItems.map((item) => normalizeEventKelasTanding(item)),
  };
};

export const bulkAssignEventKelasTanding = async (eventId, kelasTandingIds) => {
  if (!eventId) {
    throw new Error("Event ID wajib diisi");
  }

  if (!Array.isArray(kelasTandingIds) || kelasTandingIds.length === 0) {
    throw new Error("Pilih minimal satu kelas tanding");
  }

  const response = await fetch(`/api/events/${eventId}/kelas-tanding/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ kelas_tanding_ids: kelasTandingIds }),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to bulk assign kelas tanding to event");
  const assignedItems = Array.isArray(envelope?.data?.assigned_items) ? envelope.data.assigned_items : [];
  const unassignedItems = Array.isArray(envelope?.data?.unassigned_items) ? envelope.data.unassigned_items : [];

  return {
    assignedItems: assignedItems.map((item) => normalizeEventKelasTanding(item)),
    unassignedItems: unassignedItems.map((item) => normalizeEventKelasTanding(item)),
  };
};

export const unassignEventKelasTanding = async (eventId, kelasTandingId) => {
  if (!eventId || !kelasTandingId) {
    throw new Error("Event ID dan Kelas Tanding ID wajib diisi");
  }

  const response = await fetch(`/api/events/${eventId}/kelas-tanding/${kelasTandingId}`, {
    method: "DELETE",
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to unassign kelas tanding from event");
  const assignedItems = Array.isArray(envelope?.data?.assigned_items) ? envelope.data.assigned_items : [];
  const unassignedItems = Array.isArray(envelope?.data?.unassigned_items) ? envelope.data.unassigned_items : [];

  return {
    assignedItems: assignedItems.map((item) => normalizeEventKelasTanding(item)),
    unassignedItems: unassignedItems.map((item) => normalizeEventKelasTanding(item)),
  };
};