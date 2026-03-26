import { API_ENDPOINTS } from "@/shared/config/api";
import { apiClient } from "@/shared/services/api-client";

const normalizeText = (value) => (typeof value === "string" ? value : "");

const normalizePaginationMeta = (rawValue = {}) => {
  const parsedLimit = Number.parseInt(String(rawValue.limit), 10);

  return {
    limit: Number.isNaN(parsedLimit) ? 0 : parsedLimit,
    direction: typeof rawValue.direction === "string" ? rawValue.direction : "next",
    nextCursor: normalizeText(rawValue.next_cursor),
    prevCursor: normalizeText(rawValue.prev_cursor),
    hasNext: Boolean(rawValue.has_next),
    hasPrev: Boolean(rawValue.has_prev),
  };
};

const normalizeBatasBerat = (rawValue) => {
  if (!rawValue || typeof rawValue !== "object") return null;
  const bawah = Number(rawValue.bawah);
  const atas = Number(rawValue.atas);
  if (Number.isNaN(bawah) || Number.isNaN(atas)) return null;
  return { bawah, atas };
};

export const normalizeKelasTanding = (rawValue = {}) => {
  const id = normalizeText(rawValue.uuid || rawValue.id);
  return {
    id,
    uuid: id,
    nama: normalizeText(rawValue.nama),
    jenis: normalizeText(rawValue.jenis),
    kategori: normalizeText(rawValue.kategori),
    batasBerat: normalizeBatasBerat(rawValue.batas_berat),
    jenisKelamin: normalizeText(rawValue.jenis_kelamin),
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
      envelope = { message: fallbackErrorMessage, data: null };
    }
  }

  if (!response.ok) {
    const message =
      typeof envelope?.message === "string" ? envelope.message : fallbackErrorMessage;
    throw new Error(message);
  }

  return envelope;
};

export const listKelasTanding = async (query) => {
  const envelope = await apiClient.get(API_ENDPOINTS.kelasTanding, query);
  const rawItems = Array.isArray(envelope?.data?.items) ? envelope.data.items : [];

  return {
    items: rawItems.map(normalizeKelasTanding),
    meta: normalizePaginationMeta(envelope?.data?.meta),
  };
};

export const getKelasTandingById = async (id) => {
  const envelope = await apiClient.get(API_ENDPOINTS.kelasTandingById(id));
  return normalizeKelasTanding(envelope?.data);
};

export const createKelasTanding = async (payload) => {
  const response = await fetch("/api/kelas-tanding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Gagal membuat kelas tanding");
  return normalizeKelasTanding(envelope?.data);
};

export const updateKelasTanding = async (id, payload) => {
  const response = await fetch(`/api/kelas-tanding/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Gagal mengupdate kelas tanding");
  return normalizeKelasTanding(envelope?.data);
};

export const deleteKelasTanding = async (id) => {
  const response = await fetch(`/api/kelas-tanding/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });

  await parseEnvelopeResponse(response, "Gagal menghapus kelas tanding");
};
