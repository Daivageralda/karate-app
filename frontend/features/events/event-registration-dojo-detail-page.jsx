"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";
import {
  deleteEventDojoParticipant,
  getEventDojoRegistrationDetail,
  updateEventDojoParticipantStatus,
  updateEventDojoRecommendationLetterStatus,
} from "@/features/events/service";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

const DETAIL_TABS = [
  { key: "athletes", label: "Atlet & Berkas" },
  { key: "recommendation", label: "Surat Rekomendasi" },
];

const getParticipantDocument = (participant, documentType) => {
  const docs = Array.isArray(participant?.documents) ? participant.documents : [];
  return docs.find((doc) => doc?.documentType === documentType) || null;
};

const getDocumentStatus = (participant) => {
  const hasSurkes = Boolean(getParticipantDocument(participant, "surat_kesehatan")?.filePath);
  const hasAkta = Boolean(getParticipantDocument(participant, "akta_kelahiran")?.filePath);

  return {
    isComplete: hasSurkes && hasAkta,
  };
};

const formatGender = (value) => {
  const normalized = formatText(value).trim().toLowerCase();
  if (normalized === "l" || normalized === "laki-laki" || normalized === "laki laki") {
    return "Laki-laki";
  }

  if (normalized === "p" || normalized === "perempuan") {
    return "Perempuan";
  }

  return formatText(value) || "-";
};

const getRecommendationStatusMeta = (status) => {
  if (status === "approved") {
    return { label: "Disetujui", className: "bg-green-100 text-green-700" };
  }

  if (status === "pending") {
    return { label: "Menunggu Persetujuan", className: "bg-amber-100 text-amber-700" };
  }

  return { label: "Belum Diupload", className: "bg-app-surface-muted text-app-text-secondary" };
};

const getRegistrationStatusMeta = (summary) => {
  const totalParticipants = Number(summary?.totalParticipants || 0);
  const approvedParticipants = Number(summary?.approvedParticipants || 0);
  const suratKesehatanUploaded = Number(summary?.suratKesehatanUploaded || 0);
  const aktaKelahiranUploaded = Number(summary?.aktaKelahiranUploaded || 0);
  const recommendationLetterStatus = summary?.recommendationLetterStatus || "not_uploaded";

  const isCompleted =
    totalParticipants > 0 &&
    approvedParticipants >= totalParticipants &&
    suratKesehatanUploaded >= totalParticipants &&
    aktaKelahiranUploaded >= totalParticipants &&
    recommendationLetterStatus === "approved";

  if (isCompleted) {
    return { label: "Disetujui", className: "bg-green-100 text-green-700" };
  }

  if (totalParticipants <= 0) {
    return { label: "Belum Mendaftar", className: "bg-app-surface-muted text-app-text-secondary" };
  }

  return { label: "Dalam Proses", className: "bg-amber-100 text-amber-700" };
};

const getParticipantStatusMeta = (status) => {
  if (status === "approved") {
    return { label: "Disetujui", className: "bg-green-100 text-green-700" };
  }

  return { label: "Menunggu Persetujuan", className: "bg-amber-100 text-amber-700" };
};

const isPdfPath = (filePath) => {
  return typeof filePath === "string" && /\.pdf($|\?)/i.test(filePath);
};

const formatParticipantFieldList = (value) => {
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
      .filter((item) => item.length > 0)
      .join(", ");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return "-";
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return formatParticipantFieldList(parsed) || "-";
      }
    } catch {
      // Keep raw text if not JSON.
    }

    return trimmed;
  }

  return "-";
};

export function EventRegistrationDojoDetailPage({ navigation, event, dojoId }) {
  const [activeTab, setActiveTab] = useState("athletes");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [actionError, setActionError] = useState("");
  const [approvalLoadingMap, setApprovalLoadingMap] = useState({});
  const [deleteLoadingMap, setDeleteLoadingMap] = useState({});
  const [letterApprovalLoading, setLetterApprovalLoading] = useState(false);
  const [documentPreview, setDocumentPreview] = useState(null);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const payload = await getEventDojoRegistrationDetail(event.id, dojoId);
      setDetail(payload);
    } catch (loadError) {
      setError(loadError?.message || "Gagal memuat detail pendaftaran dojo");
    } finally {
      setIsLoading(false);
    }
  }, [dojoId, event.id]);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        const payload = await getEventDojoRegistrationDetail(event.id, dojoId);
        if (!isCancelled) {
          setDetail(payload);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError?.message || "Gagal memuat detail pendaftaran dojo");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [dojoId, event.id]);

  const handleUpdateParticipantApproval = async (participantId, nextStatus) => {
    if (!participantId) {
      return;
    }

    setActionError("");
    setApprovalLoadingMap((previousValue) => ({
      ...previousValue,
      [participantId]: true,
    }));

    try {
      await updateEventDojoParticipantStatus(event.id, dojoId, participantId, nextStatus);
      await loadDetail();
    } catch (updateError) {
      setActionError(updateError?.message || "Gagal memperbarui persetujuan atlet");
    } finally {
      setApprovalLoadingMap((previousValue) => ({
        ...previousValue,
        [participantId]: false,
      }));
    }
  };

  const handleUpdateRecommendationLetterStatus = async (nextStatus) => {
    setActionError("");
    setLetterApprovalLoading(true);

    try {
      await updateEventDojoRecommendationLetterStatus(event.id, dojoId, nextStatus);
      await loadDetail();
    } catch (updateError) {
      setActionError(updateError?.message || "Gagal memperbarui status surat rekomendasi");
    } finally {
      setLetterApprovalLoading(false);
    }
  };

  const handleDeleteParticipant = async (participantId, participantName) => {
    if (!participantId) {
      return;
    }

    const isConfirmed = window.confirm(`Hapus atlet ${participantName || "ini"}? Data atlet dan berkas terkait akan terhapus.`);
    if (!isConfirmed) {
      return;
    }

    setActionError("");
    setDeleteLoadingMap((previousValue) => ({
      ...previousValue,
      [participantId]: true,
    }));

    try {
      await deleteEventDojoParticipant(event.id, dojoId, participantId);
      await loadDetail();
    } catch (deleteError) {
      setActionError(deleteError?.message || "Gagal menghapus atlet");
    } finally {
      setDeleteLoadingMap((previousValue) => ({
        ...previousValue,
        [participantId]: false,
      }));
    }
  };

  const openDocumentPreview = (fileUrl, filePath, title) => {
    if (!fileUrl) {
      return;
    }

    setDocumentPreview({
      title,
      fileUrl,
      filePath,
    });
  };

  const closeDocumentPreview = () => {
    setDocumentPreview(null);
  };

  const handleDownloadParticipantsExcel = () => {
    const participants = Array.isArray(detail?.participants) ? detail.participants : [];
    if (participants.length === 0) {
      setActionError("Belum ada data atlet untuk didownload");
      return;
    }

    const rows = participants.map((participant, index) => {
      const surkes = getParticipantDocument(participant, "surat_kesehatan");
      const akta = getParticipantDocument(participant, "akta_kelahiran");
      const documentStatus = getDocumentStatus(participant);

      return {
        No: index + 1,
        "Nama Atlet": participant.namaLengkap || "-",
        "Tempat Lahir": participant.tempatLahir || "-",
        "Tanggal Lahir": participant.tanggalLahir || "-",
        "Jenis Kelamin": formatGender(participant.jenisKelamin),
        "Kategori Tanding": formatParticipantFieldList(participant.kategoriTanding),
        "Kelas Tanding": formatParticipantFieldList(participant.kelasTanding),
        "Surat Kesehatan": surkes?.filePath ? "Sudah Upload" : "Belum Upload",
        "Akta Kelahiran": akta?.filePath ? "Sudah Upload" : "Belum Upload",
        "Status Berkas": documentStatus.isComplete ? "Lengkap" : "Belum Lengkap",
        "Status Atlet": participant.status === "approved" ? "Disetujui" : "Menunggu Persetujuan",
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Atlet");

    const safeEventName = (formatText(event?.name) || "event")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    const fileName = `data-atlet-${safeEventName || "event"}-${dojoId}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const recommendationStatusMeta = getRecommendationStatusMeta(detail?.statusSummary?.recommendationLetterStatus);
  const registrationStatusMeta = getRegistrationStatusMeta(detail?.statusSummary);

  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface px-5 py-3 shadow-sm sm:px-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={ROUTES.events} className="text-app-text-secondary transition hover:text-app-accent">Event</Link>
          <span className="text-app-text-secondary">/</span>
          <Link href={ROUTES.eventsDetail(event.id)} className="text-app-text-secondary transition hover:text-app-accent">
            {formatText(event.name)}
          </Link>
          <span className="text-app-text-secondary">/</span>
          <span className="font-semibold text-app-text-primary">Detail Dojo</span>
        </nav>
      </section>

      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-app-text-primary">Detail Pendaftaran Dojo</h1>
            <p className="mt-1 text-xs text-app-text-secondary">Dojo ID: {dojoId}</p>
          </div>
          <Link
            href={ROUTES.eventsDetail(event.id)}
            className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
          >
            Kembali ke Pendaftaran Dojo
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-app-text-secondary">Total Atlet</p>
            <p className="mt-1 text-lg font-semibold text-app-text-primary">{detail?.statusSummary?.totalParticipants || 0}</p>
          </div>
          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-app-text-secondary">Surat Kesehatan</p>
            <p className="mt-1 text-lg font-semibold text-app-text-primary">
              {detail?.statusSummary?.suratKesehatanUploaded || 0}/{detail?.statusSummary?.totalParticipants || 0}
            </p>
          </div>
          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-app-text-secondary">Akta Kelahiran</p>
            <p className="mt-1 text-lg font-semibold text-app-text-primary">
              {detail?.statusSummary?.aktaKelahiranUploaded || 0}/{detail?.statusSummary?.totalParticipants || 0}
            </p>
          </div>
          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-app-text-secondary">Status Pendaftaran</p>
            <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${registrationStatusMeta.className}`}>
              {registrationStatusMeta.label}
            </span>
          </div>
          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-app-text-secondary">Atlet Disetujui</p>
            <p className="mt-1 text-lg font-semibold text-app-text-primary">
              {detail?.statusSummary?.approvedParticipants || 0}/{detail?.statusSummary?.totalParticipants || 0}
            </p>
          </div>
          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-app-text-secondary">Status Surat Rekomendasi</p>
            <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${recommendationStatusMeta.className}`}>
              {recommendationStatusMeta.label}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-app-border bg-app-surface p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {DETAIL_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition ${isActive
                  ? "bg-app-accent text-app-accent-contrast"
                  : "text-app-text-primary hover:bg-app-surface-muted"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {isLoading ? <p className="text-sm text-app-text-secondary">Memuat detail dojo...</p> : null}

      {!isLoading && error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && detail && activeTab === "athletes" ? (
        <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-app-text-primary">Daftar Atlet & Berkas</h2>
            <button
              type="button"
              onClick={handleDownloadParticipantsExcel}
              className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
            >
              Download Excel Data Atlet
            </button>
          </div>
          {actionError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">{actionError}</p>
            </div>
          ) : null}
          {detail.participants.length > 0 ? (
            <div className="mt-4 overflow-auto rounded-lg border border-app-border">
              <table className="min-w-max w-full text-left text-xs">
                <thead className="bg-app-surface-muted text-app-text-primary">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Aksi</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Nama Atlet</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Tempat, Tgl Lahir</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Jenis Kelamin</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Kategori Tanding</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Kelas Tanding</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Surat Kesehatan</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Akta Kelahiran</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Status Berkas</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Status Atlet</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.participants.map((participant) => {
                    const surkes = getParticipantDocument(participant, "surat_kesehatan");
                    const akta = getParticipantDocument(participant, "akta_kelahiran");
                    const documentStatus = getDocumentStatus(participant);
                    const participantStatusMeta = getParticipantStatusMeta(participant.status);
                    const isApproving = Boolean(approvalLoadingMap[participant.id]);
                    const isDeleting = Boolean(deleteLoadingMap[participant.id]);
                    const kategoriTanding = formatParticipantFieldList(participant.kategoriTanding);
                    const kelasTanding = formatParticipantFieldList(participant.kelasTanding);

                    return (
                      <tr key={participant.id} className="border-t border-app-border align-middle">
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isApproving || isDeleting || participant.status === "approved"}
                              onClick={() => handleUpdateParticipantApproval(participant.id, "approved")}
                              title="Setujui"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-green-300 bg-green-50 text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isApproving && !isDeleting ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isApproving || isDeleting}
                              onClick={() => handleUpdateParticipantApproval(participant.id, "pending")}
                              title="Tolak / Ubah ke Pending"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isApproving && !isDeleting ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                </svg>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isApproving || isDeleting}
                              onClick={() => handleDeleteParticipant(participant.id, participant.namaLengkap)}
                              title="Hapus Atlet"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isDeleting ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M8.75 3a1.75 1.75 0 0 0-1.75 1.75V5H4.5a.75.75 0 0 0 0 1.5h.368l.597 8.363A2 2 0 0 0 7.46 16.75h5.08a2 2 0 0 0 1.995-1.887l.597-8.363h.368a.75.75 0 0 0 0-1.5H13V4.75A1.75 1.75 0 0 0 11.25 3h-2.5Zm3.75 2V4.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25V5h3Zm-4.25 3.25a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm3.5.75a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0V9Z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-app-text-primary">
                          <p className="font-semibold">{participant.namaLengkap || "-"}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-app-text-secondary">
                          {`${participant.tempatLahir || "-"}, ${participant.tanggalLahir || "-"}`}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-app-text-secondary">{formatGender(participant.jenisKelamin)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-app-text-secondary">{kategoriTanding || "-"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-app-text-secondary">{kelasTanding || "-"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-app-text-secondary">
                          {surkes?.fileUrl ? (
                            <button
                              type="button"
                              onClick={() => openDocumentPreview(surkes.fileUrl, surkes.filePath, "Surat Kesehatan")}
                              className="font-semibold text-app-accent hover:underline"
                            >
                              Lihat Berkas
                            </button>
                          ) : "Belum Upload"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-app-text-secondary">
                          {akta?.fileUrl ? (
                            <button
                              type="button"
                              onClick={() => openDocumentPreview(akta.fileUrl, akta.filePath, "Akta Kelahiran")}
                              className="font-semibold text-app-accent hover:underline"
                            >
                              Lihat Berkas
                            </button>
                          ) : "Belum Upload"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${documentStatus.isComplete ? "bg-green-500 text-white" : "bg-red-100 text-red-700"}`}>
                            {documentStatus.isComplete ? "Lengkap" : "Belum Lengkap"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${participantStatusMeta.className}`}>
                            {participantStatusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-app-text-secondary">Belum ada atlet pada dojo ini.</p>
          )}
        </section>
      ) : null}

      {!isLoading && !error && detail && activeTab === "recommendation" ? (
        <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-app-text-primary">Surat Rekomendasi</h2>

          {actionError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">{actionError}</p>
            </div>
          ) : null}
          {detail.recommendationLetter?.fileUrl ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${recommendationStatusMeta.className}`}>
                  {recommendationStatusMeta.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={letterApprovalLoading || detail.recommendationLetter.status === "approved"}
                    onClick={() => handleUpdateRecommendationLetterStatus("approved")}
                    title="Setujui Surat Rekomendasi"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-green-300 bg-green-50 text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {letterApprovalLoading && detail.recommendationLetter.status !== "approved" ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={letterApprovalLoading || detail.recommendationLetter.status === "pending"}
                    onClick={() => handleUpdateRecommendationLetterStatus("pending")}
                    title="Batalkan Persetujuan"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {letterApprovalLoading && detail.recommendationLetter.status === "approved" ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    )}
                  </button>
                </div>
                <span className="text-xs text-app-text-secondary">
                  Diunggah: {formatDateTime(detail.recommendationLetter.uploadedAt)}
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface-muted">
                {isPdfPath(detail.recommendationLetter.filePath) ? (
                  <iframe
                    title={`preview-rekomendasi-${dojoId}`}
                    src={detail.recommendationLetter.fileUrl}
                    className="h-[82vh] w-full bg-white"
                  />
                ) : (
                  <div className="flex h-[82vh] items-center justify-center p-4">
                    <img
                      src={detail.recommendationLetter.fileUrl}
                      alt="Surat rekomendasi"
                      className="max-h-full w-auto rounded-lg border border-app-border bg-white object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-app-text-secondary">Belum ada surat rekomendasi yang diupload.</p>
          )}
        </section>
      ) : null}

      {documentPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <h3 className="font-semibold text-app-text-primary">Preview Berkas: {documentPreview.title}</h3>
              <button
                type="button"
                onClick={closeDocumentPreview}
                className="rounded-full border border-app-border px-3 py-1 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
              >
                Tutup
              </button>
            </div>

            <div className="max-h-[calc(90vh-64px)] overflow-auto bg-app-surface-muted p-3">
              {isPdfPath(documentPreview.filePath) ? (
                <iframe title={`preview-dokumen-${dojoId}`} src={documentPreview.fileUrl} className="h-[75vh] w-full rounded-lg border border-app-border bg-white" />
              ) : (
                <img src={documentPreview.fileUrl} alt={documentPreview.title} className="mx-auto max-h-[75vh] w-auto rounded-lg border border-app-border bg-white object-contain" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
