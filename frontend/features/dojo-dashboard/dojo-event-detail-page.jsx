"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";
import { ENV } from "@/shared/config/env";
import { getCurrentUser } from "@/shared/services/current-user";
import {
  downloadParticipantTemplate,
  uploadParticipants,
  uploadParticipantDocument,
  uploadRecommendationLetter,
  uploadRegistrationPayment,
  createRegistrationPaymentInvoice,
  getRecommendationLetter,
  getRegistrationPayment,
  deleteParticipantFromDojoRegistration,
  getParticipantStatusSummary,
  getParticipants,
  getUploadedParticipantsExcelPreview,
} from "@/features/dojo-dashboard/service";
import { useToast } from "@/shared/components/toast-provider";

const ChecklistItem = ({ label, value, status }) => {
  const isComplete = status === "complete";

  return (
    <div className="rounded-2xl border border-app-border bg-app-surface-muted p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-app-text-secondary">{label}</span>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${isComplete ? "bg-green-100 text-green-700" : "bg-app-surface text-app-text-secondary"}`}>
          {isComplete ? "Selesai" : "Proses"}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-snug text-app-text-primary">{value}</p>
    </div>
  );
};

const ActionBlock = ({ title, description, isActive, isCompleted, children }) => {
  const opacity = !isActive && !isCompleted ? "opacity-60" : "";

  return (
    <div className={`py-2 ${opacity}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-app-text-primary">{title}</h3>
          <p className="mt-1 text-sm text-app-text-secondary">{description}</p>
        </div>
        {isCompleted && <span className="text-xs font-semibold text-green-600">Done</span>}
      </div>

      {isActive && <div className="mt-4">{children}</div>}
      {!isActive && !isCompleted && <p className="mt-4 text-xs text-app-text-secondary">Selesaikan step sebelumnya terlebih dahulu</p>}
      <div className="mt-4 border-b border-app-border" />
    </div>
  );
};

const getParticipantDocumentStatus = (participant = {}) => {
  const docs = Array.isArray(participant.documents) ? participant.documents : [];
  const hasSurkes = docs.some((doc) => doc?.document_type === "surat_kesehatan");
  const hasAkta = docs.some((doc) => doc?.document_type === "akta_kelahiran");

  return {
    hasSurkes,
    hasAkta,
    isComplete: hasSurkes && hasAkta,
  };
};

const formatFileSize = (bytes) => {
  if (typeof bytes !== "number" || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Rp0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDateCellToIso = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  const asNumber = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (Number.isFinite(asNumber) && asNumber > 0) {
    const excelEpochUtcMs = Date.UTC(1899, 11, 30);
    const dateUtcMs = excelEpochUtcMs + Math.floor(asNumber) * 24 * 60 * 60 * 1000;
    const date = new Date(dateUtcMs);
    if (!Number.isNaN(date.getTime())) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  const raw = String(value).trim();
  if (!raw) {
    return "";
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = String(Number.parseInt(slashMatch[1], 10)).padStart(2, "0");
    const month = String(Number.parseInt(slashMatch[2], 10)).padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  return raw;
};

const getUploadedParticipantDocument = (participant, documentType) => {
  const docs = Array.isArray(participant?.documents) ? participant.documents : [];
  return docs.find((doc) => doc?.document_type === documentType) || null;
};

const resolveUploadedDocumentUrl = (filePath) => {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    return "";
  }

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  try {
    return new URL(filePath, ENV.apiBaseUrl).toString();
  } catch {
    return filePath;
  }
};

const extractFileName = (filePath) => {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    return "Berkas tersimpan";
  }

  const normalizedPath = filePath.split("?")[0].split("#")[0];
  const parts = normalizedPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || "Berkas tersimpan";
};

const isPdfDocumentPath = (filePath) => {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    return false;
  }

  return /\.pdf($|\?)/i.test(filePath);
};

const parseParticipantFieldArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (item && typeof item === "object") {
          const label = typeof item.label === "string" ? item.label.trim() : "";
          const id = typeof item.id === "string" ? item.id.trim() : "";
          return label || id;
        }

        return String(item ?? "").trim();
      })
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parseParticipantFieldArray(parsed);
      }
    } catch {
      // Keep original text when value is plain string.
    }

    return [trimmed];
  }

  return [];
};

const formatParticipantFieldList = (value) => {
  const items = parseParticipantFieldArray(value);
  return items.length > 0 ? items.join(", ") : "-";
};

const getKategoriUmurLabel = (tanggalLahirValue, eventStartValue) => {
  if (!tanggalLahirValue) {
    return "-";
  }

  const birthDate = new Date(tanggalLahirValue);
  const referenceDate = eventStartValue ? new Date(eventStartValue) : new Date();

  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(referenceDate.getTime())) {
    return "-";
  }

  let age = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = referenceDate.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && referenceDate.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }

  if (age >= 4 && age <= 5) return "Pra Usia Dini";
  if (age >= 6 && age <= 7) return "Usia Dini";
  if (age >= 8 && age <= 9) return "Pra-Pemula";
  if (age >= 10 && age <= 11) return "Pemula";
  if (age >= 12 && age <= 13) return "Kadet";
  if (age >= 14 && age <= 15) return "Junior";
  if (age >= 16 && age <= 20) return "U-21";
  if (age >= 21) return "Senior";

  return "Tidak Masuk Kategori";
};

const formatGender = (value) => {
  if (typeof value !== "string") {
    return "-";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "l" || normalized === "laki-laki" || normalized === "laki laki") {
    return "Laki-laki";
  }

  if (normalized === "p" || normalized === "perempuan") {
    return "Perempuan";
  }

  return value;
};

export function DojoEventDetailPage({ navigation, event }) {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("status");
  const [lastNonPaymentTab, setLastNonPaymentTab] = useState("status");
  const [isLoading, setIsLoading] = useState(false);
  const [statusSummary, setStatusSummary] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreviewHeaders, setExcelPreviewHeaders] = useState([]);
  const [excelPreviewRows, setExcelPreviewRows] = useState([]);
  const [excelPreviewError, setExcelPreviewError] = useState("");
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [lastUploadedExcelPreview, setLastUploadedExcelPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [participantDocumentFiles, setParticipantDocumentFiles] = useState({});
  const [documentUploadMap, setDocumentUploadMap] = useState({});
  const [recommendationLetterFile, setRecommendationLetterFile] = useState(null);
  const [recommendationLetterData, setRecommendationLetterData] = useState(null);
  const [isRecommendationUploading, setIsRecommendationUploading] = useState(false);
  const [registrationPaymentData, setRegistrationPaymentData] = useState(null);
  const [registrationPaymentFile, setRegistrationPaymentFile] = useState(null);
  const [selectedRegistrationPaymentMethod, setSelectedRegistrationPaymentMethod] = useState("xendit");
  const [isRegistrationPaymentUploading, setIsRegistrationPaymentUploading] = useState(false);
  const [isRegistrationPaymentInvoiceLoading, setIsRegistrationPaymentInvoiceLoading] = useState(false);
  const [participantDeleteMap, setParticipantDeleteMap] = useState({});
  const participantDocumentInputRefs = useRef({});
  const recommendationLetterInputRef = useRef(null);
  const registrationPaymentInputRef = useRef(null);

  const eventId = event?.id;
  const dojoId = currentUser?.dojoId;

  const buildPaymentRedirectUrl = useCallback((result) => {
    if (typeof window === "undefined" || !eventId) {
      return "";
    }

    const redirectUrl = new URL(ROUTES.dashboardDojoEventRegister(eventId), window.location.origin);
    redirectUrl.searchParams.set("payment_result", result);
    redirectUrl.searchParams.set("active_tab", "status");
    return redirectUrl.toString();
  }, [eventId]);

  const loadEventRegistrationData = useCallback(async () => {
    if (!eventId || !dojoId) {
      return;
    }

    setIsLoading(true);
    try {
      const [summary, participantList, uploadedExcelPreview, recommendationLetter, registrationPayment] = await Promise.all([
        getParticipantStatusSummary(eventId, dojoId),
        getParticipants(eventId, dojoId),
        getUploadedParticipantsExcelPreview(eventId, dojoId),
        getRecommendationLetter(eventId, dojoId),
        getRegistrationPayment(eventId, dojoId),
      ]);

      setStatusSummary(summary);
      setParticipants(participantList || []);
      setLastUploadedExcelPreview(uploadedExcelPreview);
      setRecommendationLetterData(recommendationLetter);
      setRegistrationPaymentData(registrationPayment);
    } catch (error) {
      console.error("Error loading event data:", error);
      showToast({
        tone: "error",
        title: "Failed to Load Data",
        message: error?.message || "Could not load event data",
      });
    } finally {
      setIsLoading(false);
    }
  }, [dojoId, eventId, showToast]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      showToast({
        tone: "error",
        title: "Authentication Required",
        message: "Please log in first",
      });
      return;
    }
    setCurrentUser(user);
  }, [showToast]);

  // Load status summary and participants
  useEffect(() => {
    if (!eventId || !dojoId) return;

    loadEventRegistrationData();
  }, [eventId, dojoId, loadEventRegistrationData]);

  useEffect(() => {
    if (activeTab !== "pembayaran") {
      setLastNonPaymentTab(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    const paymentResult = searchParams.get("payment_result");
    const activeTabParam = searchParams.get("active_tab");

    if (!paymentResult && !activeTabParam) {
      return;
    }

    if (paymentResult) {
      setActiveTab("status");
    } else if (["status", "peserta", "dokumen", "rekomendasi", "pembayaran"].includes(activeTabParam)) {
      setActiveTab(activeTabParam);
    }

    if (paymentResult === "success") {
      showToast({
        tone: "success",
        title: "Pembayaran Selesai",
        message: "Kamu sudah kembali dari Xendit. Status pembayaran sedang diperbarui.",
      });
    } else if (paymentResult === "failure") {
      showToast({
        tone: "error",
        title: "Pembayaran Belum Selesai",
        message: "Pembayaran dibatalkan atau gagal. Kamu bisa coba lagi dari tab pembayaran.",
      });
    }

    if (dojoId && eventId) {
      void loadEventRegistrationData();
    }

    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("payment_result");
      nextUrl.searchParams.delete("active_tab");
      window.history.replaceState({}, "", nextUrl.toString());
    }
  }, [dojoId, eventId, loadEventRegistrationData, searchParams, showToast]);

  useEffect(() => {
    const provider = typeof registrationPaymentData?.payment_provider === "string"
      ? registrationPaymentData.payment_provider.trim().toLowerCase()
      : "";

    if (provider === "manual" || provider === "xendit") {
      setSelectedRegistrationPaymentMethod(provider);
    }
  }, [registrationPaymentData]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const blob = await downloadParticipantTemplate(eventId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "atlet-template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast({
        tone: "success",
        title: "Template Downloaded",
        message: "Excel template berhasil diunduh",
      });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Download Failed",
        message: error?.message || "Gagal mengunduh template",
      });
    }
  }, [eventId, showToast]);

  const handleUploadParticipants = useCallback(async () => {
    if (!eventId) {
      showToast({
        tone: "error",
        title: "Event Not Ready",
        message: "Event ID tidak ditemukan. Silakan refresh halaman.",
      });
      return;
    }

    if (!dojoId) {
      showToast({
        tone: "error",
        title: "Dojo Admin Not Linked",
        message: "Dojo ID tidak ditemukan pada akun. Silakan login ulang.",
      });
      return;
    }

    if (!excelFile) {
      showToast({
        tone: "error",
        title: "File Required",
        message: "Pilih file Excel terlebih dahulu",
      });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(50);
      const result = await uploadParticipants(eventId, dojoId, excelFile);
      setUploadProgress(100);

      setLastUploadedExcelPreview({
        fileName: excelFile?.name || "file-atlet.xlsx",
        headers: excelPreviewHeaders,
        rows: excelPreviewRows,
        uploaded_at: new Date().toISOString(),
      });

      setExcelFile(null);
      setExcelPreviewHeaders([]);
      setExcelPreviewRows([]);
      setExcelPreviewError("");
      showToast({
        tone: "success",
        title: "Upload Successful",
        message: `${result.count || 0} atlet berhasil diunggah`,
      });

      await loadEventRegistrationData();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Upload Failed",
        message: error?.message || "Gagal mengunggah data atlet",
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  }, [dojoId, eventId, excelFile, excelPreviewHeaders, excelPreviewRows, loadEventRegistrationData, showToast]);

  const handleExcelFileChange = useCallback(async (eventTargetFile) => {
    setExcelFile(eventTargetFile || null);
    setExcelPreviewHeaders([]);
    setExcelPreviewRows([]);
    setExcelPreviewError("");

    if (!eventTargetFile) {
      return;
    }

    setIsParsingExcel(true);
    try {
      const buffer = await eventTargetFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames?.[0];

      if (!firstSheetName) {
        setExcelPreviewError("Sheet tidak ditemukan pada file Excel.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const sheetRows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      });

      if (!Array.isArray(sheetRows) || sheetRows.length === 0) {
        setExcelPreviewError("File Excel kosong.");
        return;
      }

      const firstRow = Array.isArray(sheetRows[0]) ? sheetRows[0] : [];
      const headers = firstRow.map((value, index) => {
        const label = String(value || "").trim();
        return label.length > 0 ? label : `Kolom ${index + 1}`;
      });

      const visibleColumnIndexes = headers
        .map((header, index) => ({ header, index }))
        .filter((item) => !String(item.header || "").startsWith("__"))
        .map((item) => item.index);

      const visibleHeaders = visibleColumnIndexes.map((index) => headers[index]);

      const tanggalLahirColumnIndexes = visibleHeaders
        .map((header, index) => ({ header, index }))
        .filter((item) => /tanggal/i.test(item.header))
        .map((item) => item.index);

      const rows = sheetRows
        .slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? "").trim().length > 0))
        .slice(0, 8)
        .map((row) => visibleColumnIndexes.map((sourceIndex, visibleIndex) => {
          const cellValue = row[sourceIndex] ?? "";
          if (tanggalLahirColumnIndexes.includes(visibleIndex)) {
            return formatDateCellToIso(cellValue);
          }

          return String(cellValue);
        }));

      setExcelPreviewHeaders(visibleHeaders);
      setExcelPreviewRows(rows);
    } catch {
      setExcelPreviewError("Gagal membaca file Excel. Pastikan format file .xlsx/.xls valid.");
    } finally {
      setIsParsingExcel(false);
    }
  }, []);

  const handleParticipantDocumentFileChange = useCallback((participantId, documentType, file) => {
    setParticipantDocumentFiles((previousValue) => {
      const currentParticipantFiles = previousValue[participantId] || {};

      return {
        ...previousValue,
        [participantId]: {
          ...currentParticipantFiles,
          [documentType]: file,
        },
      };
    });
  }, []);

  const setParticipantDocumentInputRef = useCallback((inputKey, elementNode) => {
    if (elementNode) {
      participantDocumentInputRefs.current[inputKey] = elementNode;
      return;
    }

    delete participantDocumentInputRefs.current[inputKey];
  }, []);

  const openParticipantDocumentPicker = useCallback((participantId, documentType) => {
    const inputKey = `${participantId}:${documentType}`;
    participantDocumentInputRefs.current[inputKey]?.click();
  }, []);

  const openExistingParticipantDocument = useCallback((filePath) => {
    const fileUrl = resolveUploadedDocumentUrl(filePath);

    if (!fileUrl) {
      showToast({
        tone: "error",
        title: "Berkas Tidak Ditemukan",
        message: "File dokumen belum tersedia untuk dipreview.",
      });
      return;
    }

    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }, [showToast]);

  const handlePreviewParticipantDocument = useCallback((participantId, documentType) => {
    const file = participantDocumentFiles?.[participantId]?.[documentType] || null;

    if (!file) {
      showToast({
        tone: "error",
        title: "File Required",
        message: "Pilih file dokumen terlebih dahulu untuk preview.",
      });
      return;
    }

    const previewUrl = window.URL.createObjectURL(file);
    window.open(previewUrl, "_blank", "noopener,noreferrer");

    window.setTimeout(() => {
      window.URL.revokeObjectURL(previewUrl);
    }, 60 * 1000);
  }, [participantDocumentFiles, showToast]);

  const handleUploadParticipantDocument = useCallback(async (participantId, documentType) => {
    if (!participantId) {
      showToast({
        tone: "error",
        title: "Participant Not Found",
        message: "Participant ID tidak ditemukan.",
      });
      return;
    }

    const file = participantDocumentFiles?.[participantId]?.[documentType] || null;
    if (!file) {
      showToast({
        tone: "error",
        title: "File Required",
        message: "Pilih file dokumen terlebih dahulu.",
      });
      return;
    }

    const uploadKey = `${participantId}:${documentType}`;
    setDocumentUploadMap((previousValue) => ({
      ...previousValue,
      [uploadKey]: true,
    }));

    try {
      await uploadParticipantDocument(participantId, documentType, file);
      showToast({
        tone: "success",
        title: "Upload Successful",
        message: `${documentType === "surat_kesehatan" ? "Surat kesehatan" : "Akta kelahiran"} berhasil diunggah.`,
      });

      setParticipantDocumentFiles((previousValue) => {
        const currentParticipantFiles = previousValue[participantId] || {};

        return {
          ...previousValue,
          [participantId]: {
            ...currentParticipantFiles,
            [documentType]: null,
          },
        };
      });

      await loadEventRegistrationData();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Upload Failed",
        message: error?.message || "Gagal mengunggah dokumen atlet",
      });
    } finally {
      setDocumentUploadMap((previousValue) => ({
        ...previousValue,
        [uploadKey]: false,
      }));
    }
  }, [loadEventRegistrationData, participantDocumentFiles, showToast]);

  const handleUploadRecommendationLetter = useCallback(async () => {
    if (!eventId || !dojoId) {
      showToast({
        tone: "error",
        title: "Event Not Ready",
        message: "Event ID atau Dojo ID tidak ditemukan.",
      });
      return;
    }

    if (!recommendationLetterFile) {
      showToast({
        tone: "error",
        title: "File Required",
        message: "Pilih file surat rekomendasi terlebih dahulu.",
      });
      return;
    }

    setIsRecommendationUploading(true);
    try {
      await uploadRecommendationLetter(eventId, dojoId, recommendationLetterFile);
      setRecommendationLetterFile(null);
      setRecommendationLetterData(null);
      showToast({
        tone: "success",
        title: "Upload Successful",
        message: "Surat rekomendasi berhasil diunggah.",
      });

      await loadEventRegistrationData();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Upload Failed",
        message: error?.message || "Gagal mengunggah surat rekomendasi",
      });
    } finally {
      setIsRecommendationUploading(false);
    }
  }, [dojoId, eventId, loadEventRegistrationData, recommendationLetterFile, showToast]);

  const handleRecommendationLetterFileChange = useCallback((file) => {
    setRecommendationLetterFile(file || null);
  }, []);

  const openRecommendationLetterPicker = useCallback(() => {
    recommendationLetterInputRef.current?.click();
  }, []);

  const handlePreviewRecommendationLetter = useCallback(() => {
    if (!recommendationLetterFile) {
      showToast({
        tone: "error",
        title: "File Required",
        message: "Pilih file surat rekomendasi terlebih dahulu untuk preview.",
      });
      return;
    }

    const previewUrl = window.URL.createObjectURL(recommendationLetterFile);
    window.open(previewUrl, "_blank", "noopener,noreferrer");

    window.setTimeout(() => {
      window.URL.revokeObjectURL(previewUrl);
    }, 60 * 1000);
  }, [recommendationLetterFile, showToast]);

  const handleCreateRegistrationPaymentInvoice = useCallback(async () => {
    if (!eventId || !dojoId) {
      showToast({
        tone: "error",
        title: "Event Not Ready",
        message: "Event ID atau Dojo ID tidak ditemukan.",
      });
      return;
    }

    if (selectedRegistrationPaymentMethod !== "xendit") {
      showToast({
        tone: "error",
        title: "Metode Tidak Sesuai",
        message: "Pilih metode pembayaran online (Xendit) untuk membuat invoice.",
      });
      return;
    }

    if (!recommendationLetterData?.file_path) {
      showToast({
        tone: "error",
        title: "Step Belum Aktif",
        message: "Pembayaran aktif setelah surat rekomendasi berhasil diupload.",
      });
      return;
    }

    setIsRegistrationPaymentInvoiceLoading(true);
    try {
      const paymentInvoice = await createRegistrationPaymentInvoice(eventId, dojoId, {
        successUrl: buildPaymentRedirectUrl("success"),
        failureUrl: buildPaymentRedirectUrl("failure"),
      });
      const invoiceURL = paymentInvoice?.xendit_invoice_url;

      if (!invoiceURL) {
        throw new Error("Invoice URL belum tersedia dari Xendit");
      }

      window.location.assign(invoiceURL);

      showToast({
        tone: "success",
        title: "Invoice Created",
        message: "Halaman pembayaran Xendit berhasil dibuat dan dibuka.",
      });

      await loadEventRegistrationData();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Invoice Failed",
        message: error?.message || "Gagal membuat invoice pembayaran Xendit",
      });
    } finally {
      setIsRegistrationPaymentInvoiceLoading(false);
    }
  }, [buildPaymentRedirectUrl, dojoId, eventId, loadEventRegistrationData, recommendationLetterData, selectedRegistrationPaymentMethod, showToast]);

  const handleRegistrationPaymentFileChange = useCallback((file) => {
    setRegistrationPaymentFile(file || null);
  }, []);

  const openRegistrationPaymentPicker = useCallback(() => {
    registrationPaymentInputRef.current?.click();
  }, []);

  const handlePreviewRegistrationPaymentFile = useCallback(() => {
    if (!registrationPaymentFile) {
      showToast({
        tone: "error",
        title: "File Required",
        message: "Pilih file bukti transfer terlebih dahulu untuk preview.",
      });
      return;
    }

    const previewUrl = window.URL.createObjectURL(registrationPaymentFile);
    window.open(previewUrl, "_blank", "noopener,noreferrer");

    window.setTimeout(() => {
      window.URL.revokeObjectURL(previewUrl);
    }, 60 * 1000);
  }, [registrationPaymentFile, showToast]);

  const handleUploadRegistrationPayment = useCallback(async () => {
    if (!eventId || !dojoId) {
      showToast({
        tone: "error",
        title: "Event Not Ready",
        message: "Event ID atau Dojo ID tidak ditemukan.",
      });
      return;
    }

    if (selectedRegistrationPaymentMethod !== "manual") {
      showToast({
        tone: "error",
        title: "Metode Tidak Sesuai",
        message: "Pilih metode transfer manual untuk upload bukti pembayaran.",
      });
      return;
    }

    if (!registrationPaymentFile) {
      showToast({
        tone: "error",
        title: "File Required",
        message: "Pilih file bukti transfer terlebih dahulu.",
      });
      return;
    }

    if (!recommendationLetterData?.file_path) {
      showToast({
        tone: "error",
        title: "Step Belum Aktif",
        message: "Pembayaran aktif setelah surat rekomendasi berhasil diupload.",
      });
      return;
    }

    setIsRegistrationPaymentUploading(true);
    try {
      await uploadRegistrationPayment(eventId, dojoId, registrationPaymentFile);
      setRegistrationPaymentFile(null);
      showToast({
        tone: "success",
        title: "Upload Successful",
        message: "Bukti transfer berhasil diunggah dan menunggu verifikasi admin.",
      });
      await loadEventRegistrationData();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Upload Failed",
        message: error?.message || "Gagal mengunggah bukti transfer",
      });
    } finally {
      setIsRegistrationPaymentUploading(false);
    }
  }, [dojoId, eventId, loadEventRegistrationData, recommendationLetterData, registrationPaymentFile, selectedRegistrationPaymentMethod, showToast]);

  const handleDeleteParticipant = useCallback(async (participantId, participantName) => {
    if (!eventId || !dojoId) {
      showToast({
        tone: "error",
        title: "Event Not Ready",
        message: "Event ID atau Dojo ID tidak ditemukan.",
      });
      return;
    }

    if (!participantId) {
      showToast({
        tone: "error",
        title: "Participant Not Found",
        message: "Participant ID tidak ditemukan.",
      });
      return;
    }

    const isConfirmed = window.confirm(`Hapus atlet ${participantName || "ini"}? Data atlet dan dokumen terkait akan terhapus.`);
    if (!isConfirmed) {
      return;
    }

    setParticipantDeleteMap((previousValue) => ({
      ...previousValue,
      [participantId]: true,
    }));

    try {
      await deleteParticipantFromDojoRegistration(eventId, dojoId, participantId);
      showToast({
        tone: "success",
        title: "Atlet Dihapus",
        message: `${participantName || "Atlet"} berhasil dihapus dari pendaftaran dojo.`,
      });

      await loadEventRegistrationData();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Hapus Gagal",
        message: error?.message || "Gagal menghapus atlet",
      });
    } finally {
      setParticipantDeleteMap((previousValue) => ({
        ...previousValue,
        [participantId]: false,
      }));
    }
  }, [dojoId, eventId, loadEventRegistrationData, showToast]);

  const hasParticipants = participants && participants.length > 0;
  const totalParticipants = statusSummary?.total_participants || 0;
  const approvedParticipants = statusSummary?.approved_participants || 0;
  const uploadedSurkes = statusSummary?.surat_kesehatan_uploaded || 0;
  const uploadedAkta = statusSummary?.akta_kelahiran_uploaded || 0;
  const allDocumentsUploaded =
    totalParticipants > 0 &&
    uploadedSurkes >= totalParticipants &&
    uploadedAkta >= totalParticipants;
  const allAthletsApproved = totalParticipants > 0 && approvedParticipants >= totalParticipants;
  const totalNominal = Number(statusSummary?.total_nominal || 0);
  const recommendationStatus = statusSummary?.recommendation_letter_status || "not_uploaded";
  const registrationPaymentStatus = registrationPaymentData?.xendit_status
    ? String(registrationPaymentData.xendit_status).trim().toLowerCase() === "settled"
      ? "approved"
      : String(registrationPaymentData.xendit_status).trim().toLowerCase() === "paid"
        ? "approved"
        : String(registrationPaymentData.xendit_status).trim().toLowerCase()
    : statusSummary?.registration_payment_status || "not_uploaded";
  const recommendationLabel = recommendationStatus === "approved"
    ? "Disetujui"
    : recommendationStatus === "pending"
      ? "Menunggu Persetujuan"
      : "Belum Diupload";
  const registrationPaymentLabel = registrationPaymentStatus === "approved"
    ? "Terverifikasi"
    : registrationPaymentStatus === "pending"
      ? "Menunggu Pembayaran"
      : registrationPaymentStatus === "failed"
        ? "Gagal"
        : registrationPaymentStatus === "expired"
          ? "Kadaluarsa"
          : "Belum Dibuat";
  const registrationPaymentApproved = registrationPaymentStatus === "approved";
  const recommendationLetterApproved = recommendationStatus === "approved";
  const recommendationUploadAllowed = allDocumentsUploaded && recommendationStatus !== "approved";
  const isDojoRegistrationApproved = recommendationStatus === "approved";
  const recommendationFilePath = recommendationLetterData?.file_path || "";
  const recommendationFileUrl = resolveUploadedDocumentUrl(recommendationFilePath);
  const hasUploadedRecommendation = recommendationFilePath.length > 0;
  const uploadedRecommendationIsPdf = isPdfDocumentPath(recommendationFilePath);
  const registrationPaymentFilePath = registrationPaymentData?.file_path || "";
  const registrationPaymentInvoiceURL = registrationPaymentData?.xendit_invoice_url || "";
  const paymentProviderFromData = typeof registrationPaymentData?.payment_provider === "string"
    ? registrationPaymentData.payment_provider.trim().toLowerCase()
    : "";
  const inferredRegistrationPaymentMethod = paymentProviderFromData === "manual" || paymentProviderFromData === "xendit"
    ? paymentProviderFromData
    : registrationPaymentData?.xendit_invoice_id || registrationPaymentInvoiceURL.length > 0
      ? "xendit"
      : registrationPaymentFilePath.length > 0
        ? "manual"
        : "";
  const effectiveRegistrationPaymentMethod = inferredRegistrationPaymentMethod || selectedRegistrationPaymentMethod;
  const registrationPaymentMethodLocked = inferredRegistrationPaymentMethod.length > 0;
  const isManualPaymentMethod = effectiveRegistrationPaymentMethod === "manual";
  const isXenditPaymentMethod = effectiveRegistrationPaymentMethod === "xendit";
  const hasUploadedRegistrationPayment = Boolean(
    registrationPaymentFilePath.length > 0 ||
    registrationPaymentData?.xendit_invoice_id ||
    registrationPaymentInvoiceURL.length > 0
  );
  const registrationPaymentUploadAllowed = hasUploadedRecommendation;
  const isRegistrationCompleted =
    totalParticipants > 0 &&
    allDocumentsUploaded &&
    allAthletsApproved &&
    recommendationLetterApproved &&
    registrationPaymentApproved;
  const registrationStatusLabel = !hasParticipants
    ? "Belum Mendaftar"
    : isRegistrationCompleted
      ? "Disetujui"
      : "Dalam Proses";
  const registrationTabs = [
    {
      key: "status",
      step: "Ringkasan",
      shortLabel: "Pendaftaran",
      fullLabel: "Ringkasan Pendaftaran",
      disabled: false,
    },
    {
      key: "peserta",
      step: "Tahap 1",
      shortLabel: "Data Atlet",
      fullLabel: "Upload Data Atlet (Excel)",
      disabled: false,
    },
    {
      key: "dokumen",
      step: "Tahap 2",
      shortLabel: "Berkas Atlet",
      fullLabel: "Upload Berkas Tiap Atlet",
      disabled: !hasParticipants,
    },
    {
      key: "rekomendasi",
      step: "Tahap 3",
      shortLabel: "Rekomendasi",
      fullLabel: "Upload Surat Rekomendasi Dojo",
      disabled: !hasParticipants,
    },
    {
      key: "pembayaran",
      step: "Tahap 4",
      shortLabel: "Pembayaran",
      fullLabel: "Pembayaran via Xendit",
      disabled: !hasUploadedRecommendation,
    },
  ];
  const activeTabMeta = registrationTabs.find((tab) => tab.key === activeTab) || registrationTabs[0];

  useEffect(() => {
    if (!hasParticipants && ["dokumen", "rekomendasi", "pembayaran"].includes(activeTab)) {
      setActiveTab("peserta");
    }
    if (activeTab === "pembayaran" && !hasUploadedRecommendation) {
      setActiveTab(hasParticipants ? "rekomendasi" : "peserta");
    }
  }, [activeTab, hasParticipants, hasUploadedRecommendation]);

  if (isLoading && !statusSummary) {
    return (
      <SiteShell navigation={navigation}>
        <div className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
          <p className="text-center text-app-text-secondary">Loading...</p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-semibold text-app-text-primary">{event?.name || "Event"}</h1>
              <p className="mt-2 text-app-text-secondary">
                {event?.location?.city && `📍 ${event.location.city}`}
              </p>
            </div>
            <Link
              href={ROUTES.dashboardDojoEvent(eventId)}
              className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
            >
              Kembali ke Detail Event
            </Link>
          </div>
        </header>

        <section className="mb-6">
          <h2 className="font-display text-xl font-semibold text-app-text-primary">Pendaftaran Dojo</h2>
          <p className="mt-2 text-sm text-app-text-secondary">
            Pantau progres pendaftaran dojo dan kelengkapan data atlet dalam satu tempat.
          </p>

          <div className="mt-4 md:hidden">
            <label className="grid gap-2 text-sm text-app-text-secondary">
              Pilih Menu
              <select
                value={activeTab}
                onChange={(event) => setActiveTab(event.target.value)}
                className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
              >
                {registrationTabs.map((tab) => (
                  <option key={tab.key} value={tab.key} disabled={tab.disabled}>
                    {`${tab.fullLabel}${tab.disabled ? " (Belum aktif)" : ""}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 hidden gap-2 overflow-x-auto pb-1 md:flex">
            {registrationTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const isDisabled = Boolean(tab.disabled);

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    if (!isDisabled) {
                      setActiveTab(tab.key);
                    }
                  }}
                  disabled={isDisabled}
                  className={`min-w-48 rounded-2xl px-4 py-3 text-left transition ${isActive
                    ? "bg-app-accent text-app-accent-contrast"
                    : "border border-app-border bg-app-surface-muted text-app-text-primary hover:border-app-accent hover:text-app-accent"
                  } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isActive ? "text-app-accent-contrast/85" : "text-app-text-secondary"}`}>
                    {tab.step}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-tight">{tab.shortLabel}</p>
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-secondary">
            {activeTabMeta.key === "status" ? activeTabMeta.fullLabel : `${activeTabMeta.step} • ${activeTabMeta.fullLabel}`}
          </p>

          <div className="mt-1 h-px w-full bg-app-border" />

          <div className="mt-3 md:hidden">
            {registrationTabs
              .filter((tab) => tab.disabled)
              .map((tab) => (
                <p key={`mobile-disabled-${tab.key}`} className="text-xs text-app-text-secondary">
                  {`${tab.fullLabel} belum aktif sampai tahap sebelumnya selesai.`}
                </p>
              ))}
          </div>

          {!hasParticipants && (
            <p className="mt-3 text-xs text-app-text-secondary">
              Tab Dokumen, Rekomendasi, dan Bukti Bayar aktif bertahap setelah data atlet berhasil diupload.
            </p>
          )}
        </section>

        {activeTab === "status" && (
          <section className="mb-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ChecklistItem
                label="Status Pendaftaran"
                value={registrationStatusLabel}
                status={isRegistrationCompleted ? "complete" : ""}
              />
              <ChecklistItem
                label="Total Nominal"
                value={formatCurrency(totalNominal)}
                status={totalNominal > 0 ? "complete" : ""}
              />
              <ChecklistItem
                label="Total Atlet"
                value={totalParticipants > 0 ? `${approvedParticipants} dari ${totalParticipants} atlet disetujui` : "0"}
                status={allAthletsApproved ? "complete" : ""}
              />
              <ChecklistItem
                label="Surat Rekomendasi"
                value={recommendationLabel}
                status={recommendationLetterApproved ? "complete" : ""}
              />
              <ChecklistItem
                label="Surat Kesehatan"
                value={totalParticipants > 0 ? `${uploadedSurkes} dari ${totalParticipants} telah diupload` : "0"}
                status={allDocumentsUploaded ? "complete" : ""}
              />
              <ChecklistItem
                label="Akta Kelahiran"
                value={totalParticipants > 0 ? `${uploadedAkta} dari ${totalParticipants} telah diupload` : "0"}
                status={allDocumentsUploaded ? "complete" : ""}
              />
              <ChecklistItem
                label="Bukti Pendaftaran"
                value={registrationPaymentLabel}
                status={registrationPaymentApproved ? "complete" : ""}
              />
            </div>

            {hasParticipants ? (
              <div className="mt-6 max-h-[70vh] overflow-auto rounded-2xl border border-app-border">
                <table className="min-w-295 w-full text-left text-xs">
                  <thead className="sticky top-0 bg-app-surface-muted text-app-text-primary">
                    <tr>
                      <th className="px-3 py-2 font-semibold">No</th>
                      <th className="px-3 py-2 font-semibold">Nama Atlet</th>
                      <th className="px-3 py-2 font-semibold">Tempat, Tgl Lahir</th>
                      <th className="px-3 py-2 font-semibold">JK</th>
                      <th className="px-3 py-2 font-semibold">Berat (kg)</th>
                      <th className="px-3 py-2 font-semibold">Kategori Tanding</th>
                      <th className="px-3 py-2 font-semibold">Kelas Tanding</th>
                      <th className="px-3 py-2 font-semibold">Status Berkas</th>
                      <th className="px-3 py-2 font-semibold">Status Atlet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, index) => {
                      const participantId = p.uuid || p.id;
                      const documentStatus = getParticipantDocumentStatus(p);
                      const kategoriTandingItems = parseParticipantFieldArray(p.kategori_tanding);
                      const kelasTandingItems = parseParticipantFieldArray(p.kelas_tanding);
                      const tanggalLahir = typeof p.tanggal_lahir === "string" && p.tanggal_lahir.trim().length > 0 ? p.tanggal_lahir : "-";
                      const tempatLahir = typeof p.tempat_lahir === "string" && p.tempat_lahir.trim().length > 0 ? p.tempat_lahir : "-";
                      const beratBadan = Number.isFinite(Number(p.berat_badan)) ? Number(p.berat_badan) : null;

                      return (
                        <tr key={participantId} className="border-t border-app-border align-middle">
                          <td className="whitespace-nowrap px-3 py-2 text-app-text-primary">{index + 1}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-app-text-primary">
                            <p className="font-semibold">{p.nama_lengkap || "-"}</p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-app-text-secondary">{`${tempatLahir}, ${tanggalLahir}`}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-app-text-secondary">{formatGender(p.jenis_kelamin)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-app-text-secondary">{beratBadan === null ? "-" : beratBadan}</td>
                          <td className="px-3 py-2 text-app-text-secondary">
                            {kategoriTandingItems.length > 1 ? (
                              <ol className="list-decimal space-y-1 pl-4">
                                {kategoriTandingItems.map((item, katIndex) => (
                                  <li key={`${participantId}-kat-${katIndex}`} className="whitespace-nowrap leading-tight">{item}</li>
                                ))}
                              </ol>
                            ) : kategoriTandingItems[0] ? <span className="whitespace-nowrap">{kategoriTandingItems[0]}</span> : "-"}
                          </td>
                          <td className="px-3 py-2 text-app-text-secondary">
                            {kelasTandingItems.length > 0 ? (
                              <ol className="list-decimal space-y-1 pl-4">
                                {kelasTandingItems.map((item, kelasIndex) => (
                                  <li key={`${participantId}-kelas-${kelasIndex}`} className="leading-tight">{item}</li>
                                ))}
                              </ol>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${documentStatus.isComplete ? "bg-green-500 text-white" : "bg-red-100 text-red-700"}`}>
                              {documentStatus.isComplete ? "Berkas Lengkap" : "Berkas Belum Lengkap"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {p.status === "approved" ? (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">
                                Disetujui
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                Menunggu Persetujuan
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-text-secondary">
                Belum ada data atlet untuk event ini.
              </div>
            )}

          </section>
        )}

        {activeTab === "peserta" && (
          <section className="space-y-4">
            <ActionBlock
              title="Upload Data Atlet"
              description="Download template lalu upload file Excel atlet pada area yang sama"
              isActive={true}
              isCompleted={hasParticipants}
            >
              <div className="space-y-3">
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                >
                  Download Template Atlet
                </button>

                <label className="grid gap-2 text-sm text-app-text-secondary">
                  File Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleExcelFileChange(e.target.files?.[0] || null)}
                    disabled={isLoading}
                    className="rounded-lg border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent disabled:opacity-50"
                  />
                </label>

                {excelFile && (
                  <div className="text-xs text-app-text-secondary">
                    <p className="font-semibold text-app-text-primary">Preview File Excel</p>
                    <p className="mt-1">Nama file: {excelFile.name}</p>
                    <p>Ukuran: {formatFileSize(excelFile.size)}</p>

                    {isParsingExcel && <p className="mt-2">Membaca isi file...</p>}

                    {excelPreviewError && (
                      <p className="mt-2 text-red-500">{excelPreviewError}</p>
                    )}

                    {!isParsingExcel && !excelPreviewError && excelPreviewHeaders.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="bg-app-surface-muted text-app-text-primary">
                            <tr>
                              {excelPreviewHeaders.map((header, index) => (
                                <th key={`${header}-${index}`} className="whitespace-nowrap px-2 py-2 font-semibold">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {excelPreviewRows.length > 0 ? (
                              excelPreviewRows.map((row, rowIndex) => (
                                <tr key={`row-${rowIndex}`} className="border-t border-app-border text-app-text-secondary">
                                  {row.map((cell, cellIndex) => (
                                    <td key={`cell-${rowIndex}-${cellIndex}`} className="whitespace-nowrap px-2 py-2">
                                      {cell || "-"}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr className="border-t border-app-border text-app-text-secondary">
                                <td className="px-2 py-2" colSpan={excelPreviewHeaders.length}>
                                  Tidak ada baris data untuk dipreview.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {!excelFile && lastUploadedExcelPreview && (
                  <div className="text-xs text-app-text-secondary">
                    <p className="font-semibold text-app-text-primary">File Excel Atlet Terakhir Yang Sudah Diupload</p>
                    <p className="mt-1 truncate whitespace-nowrap">{lastUploadedExcelPreview.fileName}</p>

                    {Array.isArray(lastUploadedExcelPreview.headers) && lastUploadedExcelPreview.headers.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="bg-app-surface-muted text-app-text-primary">
                            <tr>
                              {lastUploadedExcelPreview.headers.map((header, index) => (
                                <th key={`uploaded-${header}-${index}`} className="whitespace-nowrap px-2 py-2 font-semibold">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(lastUploadedExcelPreview.rows) && lastUploadedExcelPreview.rows.length > 0 ? (
                              lastUploadedExcelPreview.rows.map((row, rowIndex) => (
                                <tr key={`uploaded-row-${rowIndex}`} className="border-t border-app-border text-app-text-secondary">
                                  {row.map((cell, cellIndex) => (
                                    <td key={`uploaded-cell-${rowIndex}-${cellIndex}`} className="whitespace-nowrap px-2 py-2">
                                      {cell || "-"}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr className="border-t border-app-border text-app-text-secondary">
                                <td className="px-2 py-2" colSpan={lastUploadedExcelPreview.headers.length}>
                                  Tidak ada baris data untuk dipreview.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleUploadParticipants}
                  disabled={!excelFile || isLoading || !dojoId || !eventId}
                  className="inline-flex items-center justify-center rounded-full bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? `Uploading... ${uploadProgress}%` : "Upload Atlet"}
                </button>
                {!dojoId && (
                  <p className="text-xs text-red-500">
                    Dojo ID tidak ditemukan. Login ulang sebagai dojo admin untuk upload data atlet.
                  </p>
                )}
              </div>
            </ActionBlock>
          </section>
        )}

        {activeTab === "dokumen" && hasParticipants && (
          <section>
            <ActionBlock
              title="Upload Dokumen Atlet"
              description="Upload surat kesehatan dan akta kelahiran untuk setiap atlet"
              isActive={hasParticipants}
              isCompleted={allDocumentsUploaded}
            >
              <div className="max-h-[70vh] overflow-x-auto rounded-lg border border-app-border">
                <table className="min-w-225 w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-app-surface-muted text-app-text-primary">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Atlet</th>
                      <th className="px-3 py-2 font-semibold">Surat Kesehatan</th>
                      <th className="px-3 py-2 font-semibold">Akta Kelahiran</th>
                      <th className="px-3 py-2 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => {
                      const participantId = p.uuid || p.id;
                      const surkesKey = `${participantId}:surat_kesehatan`;
                      const aktaKey = `${participantId}:akta_kelahiran`;
                      const selectedSurkesFile = participantDocumentFiles?.[participantId]?.surat_kesehatan || null;
                      const selectedAktaFile = participantDocumentFiles?.[participantId]?.akta_kelahiran || null;
                      const uploadedSurkesDocument = getUploadedParticipantDocument(p, "surat_kesehatan");
                      const uploadedAktaDocument = getUploadedParticipantDocument(p, "akta_kelahiran");
                      const hasUploadedSurkes = Boolean(uploadedSurkesDocument?.file_path);
                      const hasUploadedAkta = Boolean(uploadedAktaDocument?.file_path);
                      const isUploadingSurkes = Boolean(documentUploadMap[surkesKey]);
                      const isUploadingAkta = Boolean(documentUploadMap[aktaKey]);
                      const isDeletingParticipant = Boolean(participantDeleteMap[participantId]);
                      const isParticipantActionLocked = isDojoRegistrationApproved || isDeletingParticipant;

                      const tanggalLahirFormatted = (() => {
                            if (!p.tanggal_lahir || typeof p.tanggal_lahir !== "string") return "-";
                            const d = new Date(p.tanggal_lahir);
                            if (isNaN(d.getTime())) return p.tanggal_lahir;
                            return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(d);
                          })();

                      return (
                        <tr key={participantId} className="border-t border-app-border align-middle">
                          <td className="whitespace-nowrap px-3 py-3 text-app-text-primary">
                            <p className="font-semibold">{p.nama_lengkap}</p>
                            <p className="mt-1 text-app-text-secondary">{tanggalLahirFormatted} | {p.jenis_kelamin}</p>
                            <p className="mt-1 text-app-text-secondary">
                              Kategori Umur: {getKategoriUmurLabel(p.tanggal_lahir, event?.time?.startAt || event?.time?.start_at)}
                            </p>
                          </td>

                          <td className="px-3 py-3">
                            <div className="min-w-72.5 space-y-1.5">
                              <input
                                ref={(node) => setParticipantDocumentInputRef(surkesKey, node)}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleParticipantDocumentFileChange(participantId, "surat_kesehatan", e.target.files?.[0] || null)}
                                disabled={isUploadingSurkes || isParticipantActionLocked}
                                className="hidden"
                              />

                              <div className="flex items-center gap-2">
                                {selectedSurkesFile ? (
                                  <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-xs text-app-text-primary">
                                    <p className="truncate whitespace-nowrap font-medium">{selectedSurkesFile.name}</p>
                                  </div>
                                ) : hasUploadedSurkes ? (
                                  <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-xs text-app-text-primary">
                                    <p className="truncate whitespace-nowrap font-medium">{extractFileName(uploadedSurkesDocument.file_path)}</p>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openParticipantDocumentPicker(participantId, "surat_kesehatan")}
                                    disabled={isUploadingSurkes || isParticipantActionLocked}
                                    className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-left text-xs font-medium text-app-text-primary transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Pilih File
                                  </button>
                                )}

                                {selectedSurkesFile && (
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewParticipantDocument(participantId, "surat_kesehatan")}
                                    className="shrink-0 rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                                  >
                                    Lihat File
                                  </button>
                                )}

                                {!selectedSurkesFile && hasUploadedSurkes && (
                                  <button
                                    type="button"
                                    onClick={() => openExistingParticipantDocument(uploadedSurkesDocument.file_path)}
                                    className="shrink-0 rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                                  >
                                    Lihat Berkas
                                  </button>
                                )}

                                <button
                                  onClick={() => handleUploadParticipantDocument(participantId, "surat_kesehatan")}
                                  disabled={!selectedSurkesFile || isUploadingSurkes || isParticipantActionLocked}
                                  className="shrink-0 rounded-full bg-app-accent px-3 py-1.5 text-xs font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUploadingSurkes ? "..." : "Upload"}
                                </button>
                              </div>

                              {(selectedSurkesFile || hasUploadedSurkes) && (
                                <button
                                  type="button"
                                  onClick={() => openParticipantDocumentPicker(participantId, "surat_kesehatan")}
                                  className="text-[11px] font-semibold text-app-accent hover:underline"
                                >
                                  Ganti File
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="min-w-72.5 space-y-1.5">
                              <input
                                ref={(node) => setParticipantDocumentInputRef(aktaKey, node)}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleParticipantDocumentFileChange(participantId, "akta_kelahiran", e.target.files?.[0] || null)}
                                disabled={isUploadingAkta || isParticipantActionLocked}
                                className="hidden"
                              />

                              <div className="flex items-center gap-2">
                                {selectedAktaFile ? (
                                  <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-xs text-app-text-primary">
                                    <p className="truncate whitespace-nowrap font-medium">{selectedAktaFile.name}</p>
                                  </div>
                                ) : hasUploadedAkta ? (
                                  <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-xs text-app-text-primary">
                                    <p className="truncate whitespace-nowrap font-medium">{extractFileName(uploadedAktaDocument.file_path)}</p>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openParticipantDocumentPicker(participantId, "akta_kelahiran")}
                                    disabled={isUploadingAkta || isParticipantActionLocked}
                                    className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-left text-xs font-medium text-app-text-primary transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Pilih File
                                  </button>
                                )}

                                {selectedAktaFile && (
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewParticipantDocument(participantId, "akta_kelahiran")}
                                    className="shrink-0 rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                                  >
                                    Lihat File
                                  </button>
                                )}

                                {!selectedAktaFile && hasUploadedAkta && (
                                  <button
                                    type="button"
                                    onClick={() => openExistingParticipantDocument(uploadedAktaDocument.file_path)}
                                    className="shrink-0 rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                                  >
                                    Lihat Berkas
                                  </button>
                                )}

                                <button
                                  onClick={() => handleUploadParticipantDocument(participantId, "akta_kelahiran")}
                                  disabled={!selectedAktaFile || isUploadingAkta || isParticipantActionLocked}
                                  className="shrink-0 rounded-full bg-app-accent px-3 py-1.5 text-xs font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUploadingAkta ? "..." : "Upload"}
                                </button>
                              </div>

                              {(selectedAktaFile || hasUploadedAkta) && (
                                <button
                                  type="button"
                                  onClick={() => openParticipantDocumentPicker(participantId, "akta_kelahiran")}
                                  className="text-[11px] font-semibold text-app-accent hover:underline"
                                >
                                  Ganti File
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <button
                              onClick={() => handleDeleteParticipant(participantId, p.nama_lengkap)}
                              disabled={isParticipantActionLocked}
                              className="inline-flex items-center justify-center rounded-full border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeletingParticipant ? "Menghapus..." : "Hapus Atlet"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isDojoRegistrationApproved && (
                <p className="mt-3 text-xs text-app-text-secondary">
                  Pendaftaran dojo sudah approved, data atlet tidak dapat diubah atau dihapus.
                </p>
              )}
            </ActionBlock>
          </section>
        )}

        {activeTab === "rekomendasi" && hasParticipants && (
          <section>
            <ActionBlock
              title="Upload Surat Rekomendasi"
              description="Upload surat rekomendasi dojo setelah dokumen atlet lengkap"
              isActive={allDocumentsUploaded}
              isCompleted={recommendationLetterApproved}
            >
              <div className="space-y-3">
                <input
                  ref={recommendationLetterInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleRecommendationLetterFileChange(e.target.files?.[0] || null)}
                  disabled={isRecommendationUploading || !recommendationUploadAllowed}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {recommendationLetterFile ? (
                    <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-primary">
                      <p className="truncate whitespace-nowrap font-medium">{recommendationLetterFile.name}</p>
                    </div>
                  ) : recommendationLetterData?.file_path ? (
                    <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-primary">
                      <p className="truncate whitespace-nowrap font-medium">{extractFileName(recommendationLetterData.file_path)}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={openRecommendationLetterPicker}
                      disabled={isRecommendationUploading || !recommendationUploadAllowed}
                      className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-left text-sm font-medium text-app-text-primary transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Pilih File Surat Rekomendasi
                    </button>
                  )}

                  {recommendationLetterFile && (
                    <button
                      type="button"
                      onClick={handlePreviewRecommendationLetter}
                      className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                    >
                      Lihat File
                    </button>
                  )}

                  <button
                    onClick={handleUploadRecommendationLetter}
                    disabled={!recommendationLetterFile || isRecommendationUploading || !recommendationUploadAllowed}
                    className="inline-flex items-center justify-center rounded-full bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRecommendationUploading ? "Uploading..." : "Upload Surat Rekomendasi"}
                  </button>
                </div>

                {(recommendationLetterFile || hasUploadedRecommendation) && (
                  <button
                    type="button"
                    onClick={openRecommendationLetterPicker}
                    className="text-xs font-semibold text-app-accent hover:underline"
                  >
                    Ganti File
                  </button>
                )}

                <div className="max-h-40 overflow-auto rounded-lg border border-app-border">
                  <table className="min-w-full text-left text-xs">
                    <thead className="sticky top-0 bg-app-surface-muted text-app-text-primary">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Berkas Tersimpan</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Diunggah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasUploadedRecommendation ? (
                        <tr className="border-t border-app-border">
                          <td className="px-3 py-2 text-app-text-primary">
                            <p className="truncate whitespace-nowrap">{extractFileName(recommendationFilePath)}</p>
                          </td>
                          <td className="px-3 py-2 text-app-text-secondary">{recommendationLabel}</td>
                          <td className="px-3 py-2 text-app-text-secondary">
                            {recommendationLetterData?.uploaded_at
                              ? new Date(recommendationLetterData.uploaded_at).toLocaleString("id-ID")
                              : "-"}
                          </td>
                        </tr>
                      ) : (
                        <tr className="border-t border-app-border">
                          <td colSpan={3} className="px-3 py-3 text-app-text-secondary">
                            Belum ada surat rekomendasi yang tersimpan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {hasUploadedRecommendation && uploadedRecommendationIsPdf && recommendationFileUrl && (
                  <div className="overflow-hidden rounded-lg border border-app-border">
                    <iframe
                      title="preview-surat-rekomendasi"
                      src={recommendationFileUrl}
                      className="h-112 w-full"
                    />
                  </div>
                )}

                {hasUploadedRecommendation && !uploadedRecommendationIsPdf && (
                  <p className="text-xs text-app-text-secondary">
                    Preview inline hanya tersedia untuk file PDF. Untuk file ini, gunakan tombol Buka.
                  </p>
                )}

                {recommendationStatus === "pending" && (
                  <p className="text-xs text-app-text-secondary">
                    Surat rekomendasi sudah diupload dan sedang menunggu approval.
                  </p>
                )}
                {recommendationLetterApproved && (
                  <p className="text-xs text-green-600">
                    Surat rekomendasi sudah approved.
                  </p>
                )}
              </div>
            </ActionBlock>
          </section>
        )}

        {activeTab === "pembayaran" && hasParticipants && (
          <section>
            <ActionBlock
              title="Pembayaran Pendaftaran"
              description={`Pilih satu metode pembayaran untuk dojo ini. Setelah dipakai, metode akan dikunci. Total nominal saat ini ${formatCurrency(totalNominal)}.`}
              isActive={registrationPaymentUploadAllowed}
              isCompleted={registrationPaymentApproved}
            >
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-text-secondary">Metode Pembayaran</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRegistrationPaymentMethod("manual")}
                      disabled={registrationPaymentMethodLocked || registrationPaymentApproved || !registrationPaymentUploadAllowed}
                      className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${isManualPaymentMethod ? "border-app-accent bg-app-accent/10 text-app-accent" : "border-app-border bg-app-surface text-app-text-primary hover:border-app-accent hover:text-app-accent"}`}
                    >
                      Transfer Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRegistrationPaymentMethod("xendit")}
                      disabled={registrationPaymentMethodLocked || registrationPaymentApproved || !registrationPaymentUploadAllowed}
                      className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${isXenditPaymentMethod ? "border-app-accent bg-app-accent/10 text-app-accent" : "border-app-border bg-app-surface text-app-text-primary hover:border-app-accent hover:text-app-accent"}`}
                    >
                      Online (Xendit)
                    </button>
                  </div>
                  {registrationPaymentMethodLocked && (
                    <p className="text-xs text-app-text-secondary">
                      Metode terkunci: {isManualPaymentMethod ? "Transfer Manual" : "Online (Xendit)"}.
                    </p>
                  )}
                </div>

                {isManualPaymentMethod ? (
                  <>
                    <input
                      ref={registrationPaymentInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleRegistrationPaymentFileChange(e.target.files?.[0] || null)}
                      disabled={isRegistrationPaymentUploading || !registrationPaymentUploadAllowed || registrationPaymentApproved}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      {registrationPaymentFile ? (
                        <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-primary">
                          <p className="truncate whitespace-nowrap font-medium">{registrationPaymentFile.name}</p>
                        </div>
                      ) : registrationPaymentFilePath ? (
                        <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-primary">
                          <p className="truncate whitespace-nowrap font-medium">{extractFileName(registrationPaymentFilePath)}</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={openRegistrationPaymentPicker}
                          disabled={isRegistrationPaymentUploading || !registrationPaymentUploadAllowed || registrationPaymentApproved}
                          className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-left text-sm font-medium text-app-text-primary transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Pilih File Bukti Transfer
                        </button>
                      )}

                      {registrationPaymentFile && (
                        <button
                          type="button"
                          onClick={handlePreviewRegistrationPaymentFile}
                          className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                        >
                          Lihat File
                        </button>
                      )}

                      <button
                        onClick={handleUploadRegistrationPayment}
                        disabled={!registrationPaymentFile || isRegistrationPaymentUploading || !registrationPaymentUploadAllowed || registrationPaymentApproved}
                        className="inline-flex items-center justify-center rounded-full bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isRegistrationPaymentUploading ? "Uploading..." : registrationPaymentApproved ? "Pembayaran Lunas" : "Upload Bukti Transfer"}
                      </button>
                    </div>

                    {(registrationPaymentFile || registrationPaymentFilePath) && !registrationPaymentApproved && (
                      <button
                        type="button"
                        onClick={openRegistrationPaymentPicker}
                        disabled={isRegistrationPaymentUploading || !registrationPaymentUploadAllowed}
                        className="text-xs font-semibold text-app-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Ganti File
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {registrationPaymentData?.xendit_invoice_id ? (
                      <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-primary">
                        <p className="truncate whitespace-nowrap font-medium">Invoice: {registrationPaymentData.xendit_invoice_id}</p>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text-secondary">
                        Belum ada invoice pembayaran.
                      </div>
                    )}

                    <button
                      onClick={handleCreateRegistrationPaymentInvoice}
                      disabled={isRegistrationPaymentInvoiceLoading || !registrationPaymentUploadAllowed || registrationPaymentApproved}
                      className="inline-flex items-center justify-center rounded-full bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRegistrationPaymentInvoiceLoading ? "Creating Invoice..." : registrationPaymentApproved ? "Pembayaran Lunas" : "Buat / Perbarui Invoice"}
                    </button>
                  </div>
                )}

                <div className="max-h-40 overflow-auto rounded-lg border border-app-border">
                  <table className="min-w-full text-left text-xs">
                    <thead className="sticky top-0 bg-app-surface-muted text-app-text-primary">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Bukti / Invoice</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Dibuat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasUploadedRegistrationPayment ? (
                        <tr className="border-t border-app-border">
                          <td className="px-3 py-2 text-app-text-primary">
                            <p className="truncate whitespace-nowrap">{registrationPaymentData?.xendit_invoice_id || extractFileName(registrationPaymentFilePath)}</p>
                          </td>
                          <td className="px-3 py-2 text-app-text-secondary">{registrationPaymentLabel}</td>
                          <td className="px-3 py-2 text-app-text-secondary">
                            {registrationPaymentData?.uploaded_at
                              ? new Date(registrationPaymentData.uploaded_at).toLocaleString("id-ID")
                              : "-"}
                          </td>
                        </tr>
                      ) : (
                        <tr className="border-t border-app-border">
                          <td colSpan={3} className="px-3 py-3 text-app-text-secondary">
                            Belum ada data pembayaran yang tersimpan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {registrationPaymentData?.xendit_status && isXenditPaymentMethod ? (
                  <p className="text-xs text-app-text-secondary">
                    Status gateway: {registrationPaymentData.xendit_status}
                  </p>
                ) : null}

                {!registrationPaymentUploadAllowed && (
                  <p className="text-xs text-app-text-secondary">
                    Pembayaran aktif setelah surat rekomendasi berhasil diupload.
                  </p>
                )}
              </div>
            </ActionBlock>
          </section>
        )}

      </section>
    </SiteShell>
  );
}
