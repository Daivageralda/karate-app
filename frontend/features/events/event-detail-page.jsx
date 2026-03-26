"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";
import {
  assignEventKelasTanding,
  bulkAssignEventKelasTanding,
  downloadEventRegistrationDojosExcel,
  getEventKelasTandingAssignments,
  getEventRegistrationDojos,
  unassignEventKelasTanding,
} from "@/features/events/service";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

const EVENT_DETAIL_TABS = [
  {
    key: "overview",
    label: "Informasi Event",
  },
  {
    key: "registrations",
    label: "Pendaftaran Dojo",
  },
  {
    key: "kelas-tanding-settings",
    label: "Pengaturan Kelas Tanding",
  },
];

const KATEGORI_LABELS = {
  pra_usia_dini: "Pra Usia Dini",
  usia_dini: "Usia Dini",
  pra_pemula: "Pra Pemula",
  pemula: "Pemula",
  kadet: "Kadet",
  junior: "Junior",
  under_21: "Under 21",
  senior: "Senior",
  veteran: "Veteran",
};

const getBatasBeratLabel = (item) => {
  if (item?.jenis !== "kumite") {
    return "-";
  }

  const batasBerat = item?.batasBerat;
  if (!batasBerat || typeof batasBerat !== "object") {
    return "-";
  }

  const bawah = Number(batasBerat.bawah);
  const atas = Number(batasBerat.atas);

  if (!Number.isFinite(bawah) || !Number.isFinite(atas)) {
    return "-";
  }

  if (bawah <= 0) {
    return `s/d ${atas} kg`;
  }

  return `${bawah} - ${atas} kg`;
};

const toMegabytes = (bytes) => {
  if (typeof bytes !== "number" || bytes <= 0) {
    return "0 MB";
  }

  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${mb.toFixed(2)} MB`;
};

const isImageType = (contentType) => {
  return typeof contentType === "string" && contentType.startsWith("image/");
};

const isPdfType = (contentType) => {
  return typeof contentType === "string" && contentType.includes("pdf");
};

const getDojoInitials = (name) => {
  const trimmedName = formatText(name).trim();
  if (!trimmedName) {
    return "DJ";
  }

  const parts = trimmedName.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) {
    return "DJ";
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
};

const getRecommendationStatusMeta = (status) => {
  if (status === "approved") {
    return {
      label: "Disetujui",
      className: "bg-green-100 text-green-700",
    };
  }

  if (status === "pending") {
    return {
      label: "Menunggu Persetujuan",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Belum Diupload",
    className: "bg-app-surface-muted text-app-text-secondary",
  };
};

const getRegistrationStatusMeta = (dojo) => {
  const totalAthletes = Number(dojo?.totalAthletes || 0);
  const approvedAthletes = Number(dojo?.approvedAthletes || 0);
  const suratKesehatanUploaded = Number(dojo?.suratKesehatanUploaded || 0);
  const aktaKelahiranUploaded = Number(dojo?.aktaKelahiranUploaded || 0);
  const recommendationLetterStatus = dojo?.recommendationLetterStatus;

  const isCompleted =
    totalAthletes > 0 &&
    approvedAthletes >= totalAthletes &&
    suratKesehatanUploaded >= totalAthletes &&
    aktaKelahiranUploaded >= totalAthletes &&
    recommendationLetterStatus === "approved";

  if (isCompleted) {
    return {
      label: "Disetujui",
      className: "bg-green-100 text-green-700",
    };
  }

  if (totalAthletes <= 0) {
    return {
      label: "Belum Mendaftar",
      className: "bg-app-surface-muted text-app-text-secondary",
    };
  }

  return {
    label: "Dalam Proses",
    className: "bg-amber-100 text-amber-700",
  };
};

function AttachmentPreviewCard({ attachment }) {
  const fileName = formatText(attachment.fileName);
  const fileUrl = attachment.fileUrl;
  const contentType = formatText(attachment.contentType);

  return (
    <article className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-app-text-primary">{fileName}</h3>
          <p className="mt-1 text-xs text-app-text-secondary">{contentType} | {toMegabytes(attachment.size)}</p>
        </div>

        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
        >
          Open
        </a>
      </div>

      {isImageType(attachment.contentType) ? (
        <div className="mt-3 h-40 rounded-xl border border-app-border bg-app-surface-muted bg-cover bg-center" style={{ backgroundImage: `url(${fileUrl})` }} />
      ) : null}

      {isPdfType(attachment.contentType) ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-app-border">
          <iframe title={`preview-${fileName}`} src={fileUrl} className="h-48 w-full" />
        </div>
      ) : null}

      {!isImageType(attachment.contentType) && !isPdfType(attachment.contentType) ? (
        <div className="mt-3 rounded-xl border border-dashed border-app-border bg-app-surface-muted px-3 py-6 text-center text-xs text-app-text-secondary">
          Preview tidak tersedia untuk tipe file ini.
        </div>
      ) : null}
    </article>
  );
}

export function EventDetailPage({ navigation, event }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [registrationDojos, setRegistrationDojos] = useState([]);
  const [isRegistrationLoading, setIsRegistrationLoading] = useState(false);
  const [isExportingRegistrations, setIsExportingRegistrations] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [hasLoadedRegistrations, setHasLoadedRegistrations] = useState(false);
  const [assignedKelasTanding, setAssignedKelasTanding] = useState([]);
  const [unassignedKelasTanding, setUnassignedKelasTanding] = useState([]);
  const [selectedBulkKelasTandingIds, setSelectedBulkKelasTandingIds] = useState([]);
  const [isKelasTandingLoading, setIsKelasTandingLoading] = useState(false);
  const [kelasTandingError, setKelasTandingError] = useState("");
  const [hasLoadedKelasTanding, setHasLoadedKelasTanding] = useState(false);
  const [isBulkAssigningKelasTanding, setIsBulkAssigningKelasTanding] = useState(false);
  const [singleKelasTandingActionId, setSingleKelasTandingActionId] = useState("");

  useEffect(() => {
    let isCancelled = false;

    if (activeTab !== "registrations" || !event?.id || hasLoadedRegistrations) {
      return undefined;
    }

    const loadRegistrationDojos = async () => {
      setIsRegistrationLoading(true);
      setRegistrationError("");

      try {
        const items = await getEventRegistrationDojos(event.id);
        if (!isCancelled) {
          setRegistrationDojos(items);
        }
      } catch (error) {
        if (!isCancelled) {
          setRegistrationError(error?.message || "Gagal memuat daftar pendaftaran dojo");
        }
      } finally {
        if (!isCancelled) {
          setIsRegistrationLoading(false);
          setHasLoadedRegistrations(true);
        }
      }
    };

    loadRegistrationDojos();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, event?.id, hasLoadedRegistrations]);

  useEffect(() => {
    let isCancelled = false;

    if (activeTab !== "kelas-tanding-settings" || !event?.id || hasLoadedKelasTanding) {
      return undefined;
    }

    const loadKelasTandingAssignments = async () => {
      setIsKelasTandingLoading(true);
      setKelasTandingError("");

      try {
        const assignmentResult = await getEventKelasTandingAssignments(event.id);
        if (!isCancelled) {
          setAssignedKelasTanding(assignmentResult.assignedItems);
          setUnassignedKelasTanding(assignmentResult.unassignedItems);
          setSelectedBulkKelasTandingIds([]);
        }
      } catch (error) {
        if (!isCancelled) {
          setKelasTandingError(error?.message || "Gagal memuat pengaturan kelas tanding event");
        }
      } finally {
        if (!isCancelled) {
          setIsKelasTandingLoading(false);
          setHasLoadedKelasTanding(true);
        }
      }
    };

    loadKelasTandingAssignments();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, event?.id, hasLoadedKelasTanding]);

  const handleRetryLoadRegistrations = () => {
    setHasLoadedRegistrations(false);
    setRegistrationError("");
  };

  const handleRetryLoadKelasTanding = () => {
    setHasLoadedKelasTanding(false);
    setKelasTandingError("");
  };

  const handleToggleBulkKelasTanding = (kelasTandingId, isChecked) => {
    if (!kelasTandingId) {
      return;
    }

    setSelectedBulkKelasTandingIds((prevValue) => {
      if (isChecked) {
        return prevValue.includes(kelasTandingId) ? prevValue : [...prevValue, kelasTandingId];
      }

      return prevValue.filter((itemId) => itemId !== kelasTandingId);
    });
  };

  const handleAssignSingleKelasTanding = async (kelasTandingId) => {
    if (!event?.id || !kelasTandingId) {
      setKelasTandingError("Event ID atau Kelas Tanding ID tidak ditemukan");
      return;
    }

    setKelasTandingError("");
    setSingleKelasTandingActionId(kelasTandingId);

    try {
      const assignmentResult = await assignEventKelasTanding(event.id, kelasTandingId);
      setAssignedKelasTanding(assignmentResult.assignedItems);
      setUnassignedKelasTanding(assignmentResult.unassignedItems);
      setSelectedBulkKelasTandingIds((prevValue) => prevValue.filter((itemId) => itemId !== kelasTandingId));
    } catch (error) {
      setKelasTandingError(error?.message || "Gagal assign kelas tanding ke event");
    } finally {
      setSingleKelasTandingActionId("");
    }
  };

  const handleUnassignSingleKelasTanding = async (kelasTandingId) => {
    if (!event?.id || !kelasTandingId) {
      setKelasTandingError("Event ID atau Kelas Tanding ID tidak ditemukan");
      return;
    }

    setKelasTandingError("");
    setSingleKelasTandingActionId(kelasTandingId);

    try {
      const assignmentResult = await unassignEventKelasTanding(event.id, kelasTandingId);
      setAssignedKelasTanding(assignmentResult.assignedItems);
      setUnassignedKelasTanding(assignmentResult.unassignedItems);
    } catch (error) {
      setKelasTandingError(error?.message || "Gagal melepas kelas tanding dari event");
    } finally {
      setSingleKelasTandingActionId("");
    }
  };

  const handleBulkAssignKelasTanding = async () => {
    if (!event?.id) {
      setKelasTandingError("Event ID tidak ditemukan");
      return;
    }

    if (selectedBulkKelasTandingIds.length === 0) {
      setKelasTandingError("Pilih minimal satu kelas tanding untuk bulk assign");
      return;
    }

    setKelasTandingError("");
    setIsBulkAssigningKelasTanding(true);

    try {
      const assignmentResult = await bulkAssignEventKelasTanding(event.id, selectedBulkKelasTandingIds);
      setAssignedKelasTanding(assignmentResult.assignedItems);
      setUnassignedKelasTanding(assignmentResult.unassignedItems);
      setSelectedBulkKelasTandingIds([]);
    } catch (error) {
      setKelasTandingError(error?.message || "Gagal bulk assign kelas tanding ke event");
    } finally {
      setIsBulkAssigningKelasTanding(false);
    }
  };

  const handleDownloadDojoRegistrationsExcel = async () => {
    if (!event?.id) {
      setRegistrationError("Event ID tidak ditemukan");
      return;
    }

    if (registrationDojos.length === 0) {
      setRegistrationError("Belum ada dojo yang mendaftar untuk didownload");
      return;
    }

    setRegistrationError("");
    setIsExportingRegistrations(true);

    try {
      const { blob, contentDisposition } = await downloadEventRegistrationDojosExcel(event.id);
      const fallbackEventName = (formatText(event?.name) || "event")
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      const fallbackName = `pendaftaran-dojo-${fallbackEventName || "event"}.xlsx`;

      const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      const fileName = fileNameMatch?.[1] || fallbackName;

      const fileUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(fileUrl);
    } catch (error) {
      setRegistrationError(error?.message || "Gagal menyiapkan file Excel pendaftaran dojo");
    } finally {
      setIsExportingRegistrations(false);
    }
  };

  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface px-5 py-3 shadow-sm sm:px-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={ROUTES.events} className="text-app-text-secondary transition hover:text-app-accent">
            Event
          </Link>
          <span className="text-app-text-secondary">/</span>
          <span className="font-semibold text-app-text-primary">{formatText(event.name)}</span>
        </nav>
      </section>

      <section className="rounded-3xl border border-app-border bg-app-surface p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {EVENT_DETAIL_TABS.map((tab) => {
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

      {activeTab === "overview" ? (
        <>
          <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-app-text-primary">
                  {formatText(event.name)}
                </h1>
                <p className="mt-2 text-sm text-app-text-secondary">Slug: {formatText(event.slug)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={ROUTES.events}
                  className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                >
                  Kembali
                </Link>
                <Link
                  href={ROUTES.eventsEdit(event.id)}
                  className="inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90"
                >
                  Update Event
                </Link>
              </div>
            </header>

            <p className="mt-5 text-sm leading-relaxed text-app-text-secondary">{formatText(event.description)}</p>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
              <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Waktu Event</h2>
              <dl className="mt-4 grid gap-3">
                <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Mulai</dt>
                  <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatDateTime(event.time?.startAt)}</dd>
                </div>
                <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Selesai</dt>
                  <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatDateTime(event.time?.endAt)}</dd>
                </div>
                <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Batas Pendaftaran</dt>
                  <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatDateTime(event.time?.registrationDeadline)}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
              <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Penyelenggara & Lokasi</h2>
              <dl className="mt-4 grid gap-3">
                <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Penyelenggara</dt>
                  <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatText(event.organizer?.name)}</dd>
                  <dd className="mt-0.5 text-xs text-app-text-secondary">{formatText(event.organizer?.email)}</dd>
                </div>
                <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Lokasi</dt>
                  <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatText(event.location?.name)}</dd>
                  <dd className="mt-0.5 text-xs text-app-text-secondary">{formatText(event.location?.address)}</dd>
                  <dd className="mt-0.5 text-xs text-app-text-secondary">{formatText(event.location?.city)}</dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Konfigurasi Event</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
                <span className="text-xs uppercase tracking-wide text-app-text-secondary">Status</span>
                <p className="mt-1 text-sm font-medium text-app-text-primary">{formatText(event.config?.status)}</p>
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
                <span className="text-xs uppercase tracking-wide text-app-text-secondary">Registration</span>
                <p className="mt-1 text-sm font-medium text-app-text-primary">{event.config?.isRegistrationOpen ? "Open" : "Closed"}</p>
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
                <span className="text-xs uppercase tracking-wide text-app-text-secondary">Max Participants</span>
                <p className="mt-1 text-sm font-medium text-app-text-primary">{event.config?.maxParticipants ?? 0}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Banner</h2>
              {event.bannerUrl ? (
                <a
                  href={event.bannerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                >
                  Open Original
                </a>
              ) : null}
            </div>

            {event.bannerUrl ? (
              <div className="mt-4 h-64 rounded-2xl border border-app-border bg-app-surface-muted bg-cover bg-center" style={{ backgroundImage: `url(${event.bannerUrl})` }} />
            ) : (
              <p className="mt-4 text-sm text-app-text-secondary">Banner belum tersedia.</p>
            )}
          </section>

          <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Attachments</h2>

            {Array.isArray(event.attachments) && event.attachments.length > 0 ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {event.attachments.map((attachment, index) => {
                  const key = `${attachment.fileUrl}-${index}`;
                  return <AttachmentPreviewCard key={key} attachment={attachment} />;
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-app-text-secondary">Tidak ada attachment.</p>
            )}
          </section>
        </>
      ) : activeTab === "registrations" ? (
        <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Pendaftaran Dojo</h2>
              <p className="mt-2 text-sm text-app-text-secondary">
                Tinjau dojo yang sudah mendaftar pada event ini sebelum masuk ke detail approval per dojo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary">
                {registrationDojos.length} dojo
              </div>
              <button
                type="button"
                onClick={handleDownloadDojoRegistrationsExcel}
                disabled={isRegistrationLoading || isExportingRegistrations || registrationDojos.length === 0}
                className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExportingRegistrations ? "Menyiapkan Excel..." : "Download Excel"}
              </button>
            </div>
          </div>

          {isRegistrationLoading ? (
            <p className="mt-6 text-sm text-app-text-secondary">Memuat daftar pendaftaran dojo...</p>
          ) : null}

          {!isRegistrationLoading && registrationError ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">{registrationError}</p>
              <button
                type="button"
                onClick={handleRetryLoadRegistrations}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Coba Lagi
              </button>
            </div>
          ) : null}

          {!isRegistrationLoading && !registrationError && registrationDojos.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-app-border bg-app-surface-muted px-4 py-8 text-center text-sm text-app-text-secondary">
              Belum ada dojo yang mendaftar ke event ini.
            </div>
          ) : null}

          {!isRegistrationLoading && !registrationError && registrationDojos.length > 0 ? (
            <div className="mt-6 overflow-auto rounded-2xl border border-app-border">
              <table className="min-w-max w-full text-left text-sm">
                <thead className="bg-app-surface-muted text-app-text-primary">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Dojo</th>
                    <th className="px-4 py-3 font-semibold">Total Atlet</th>
                    <th className="px-4 py-3 font-semibold">Surat Kesehatan</th>
                    <th className="px-4 py-3 font-semibold">Akta Kelahiran</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status Surat Rekomendasi</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status Pendaftaran</th>
                    <th className="px-4 py-3 font-semibold">Terakhir Diperbarui</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationDojos.map((dojo) => {
                    const recommendationStatusMeta = getRecommendationStatusMeta(dojo.recommendationLetterStatus);
                    const statusMeta = getRegistrationStatusMeta(dojo);

                    return (
                      <tr key={dojo.dojoId} className="border-t border-app-border align-top">
                        <td className="px-4 py-3 text-app-text-primary">
                          <div className="flex items-center gap-3">
                            {dojo.dojoLogoUrl ? (
                              <div
                                className="h-10 w-10 rounded-full border border-app-border bg-app-surface-muted bg-cover bg-center"
                                style={{ backgroundImage: `url(${dojo.dojoLogoUrl})` }}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-surface-muted text-xs font-semibold text-app-text-secondary">
                                {getDojoInitials(dojo.dojoName)}
                              </div>
                            )}

                            <div>
                              <p className="font-semibold text-app-text-primary">{formatText(dojo.dojoName)}</p>
                              <p className="mt-1 text-xs text-app-text-secondary">Terdaftar: {formatDateTime(dojo.registeredAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-app-text-secondary">{dojo.totalAthletes}</td>
                        <td className="px-4 py-3 text-app-text-secondary">{`${dojo.suratKesehatanUploaded}/${dojo.totalAthletes}`}</td>
                        <td className="px-4 py-3 text-app-text-secondary">{`${dojo.aktaKelahiranUploaded}/${dojo.totalAthletes}`}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${recommendationStatusMeta.className}`}>
                            {recommendationStatusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-app-text-secondary">{formatDateTime(dojo.updatedAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={ROUTES.eventsRegistrationDojoDetail(event.id, dojo.dojoId)}
                            className="inline-flex whitespace-nowrap rounded-full border border-app-border bg-app-surface-muted px-3 py-1.5 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                          >
                            Lihat Detail
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Pengaturan Kelas Tanding</h2>
              <p className="mt-2 text-sm text-app-text-secondary">
                Assign master kelas tanding ke event ini secara bulk maupun satu per satu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary">
                Assigned: {assignedKelasTanding.length}
              </div>
              <div className="rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary">
                Tersedia: {unassignedKelasTanding.length}
              </div>
            </div>
          </div>

          {isKelasTandingLoading ? (
            <p className="mt-6 text-sm text-app-text-secondary">Memuat pengaturan kelas tanding event...</p>
          ) : null}

          {!isKelasTandingLoading && kelasTandingError ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">{kelasTandingError}</p>
              <button
                type="button"
                onClick={handleRetryLoadKelasTanding}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Coba Lagi
              </button>
            </div>
          ) : null}

          {!isKelasTandingLoading && !kelasTandingError ? (
            <>
              <div className="mt-6 rounded-2xl border border-app-border bg-app-surface-muted p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-app-text-secondary">
                    Pilih kelas tanding yang belum ter-assign, lalu assign sekaligus ke event.
                  </p>

                  <button
                    type="button"
                    onClick={handleBulkAssignKelasTanding}
                    disabled={isBulkAssigningKelasTanding || selectedBulkKelasTandingIds.length === 0}
                    className="inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBulkAssigningKelasTanding ? "Memproses Bulk Assign..." : `Bulk Assign (${selectedBulkKelasTandingIds.length})`}
                  </button>
                </div>
              </div>

              {assignedKelasTanding.length === 0 && unassignedKelasTanding.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-app-border bg-app-surface-muted px-4 py-8 text-center text-sm text-app-text-secondary">
                  Belum ada master kelas tanding yang bisa di-assign.
                </div>
              ) : (
                <div className="mt-6 overflow-auto rounded-2xl border border-app-border">
                  <table className="min-w-max w-full text-left text-sm">
                    <thead className="bg-app-surface-muted text-app-text-primary">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Pilih</th>
                        <th className="px-4 py-3 font-semibold">Nama</th>
                        <th className="px-4 py-3 font-semibold">Jenis</th>
                        <th className="px-4 py-3 font-semibold">Kategori</th>
                        <th className="px-4 py-3 font-semibold">Jenis Kelamin</th>
                        <th className="px-4 py-3 font-semibold">Batas Berat</th>
                        <th className="px-4 py-3 font-semibold">Status Assign</th>
                        <th className="px-4 py-3 font-semibold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...assignedKelasTanding, ...unassignedKelasTanding].map((item) => {
                        const isAssigned = item.isAssigned;
                        const isLoadingAction = singleKelasTandingActionId === item.id;
                        const isSelectable = !isAssigned;
                        const isChecked = selectedBulkKelasTandingIds.includes(item.id);

                        return (
                          <tr key={item.id} className="border-t border-app-border align-top">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!isSelectable || isBulkAssigningKelasTanding || isLoadingAction}
                                onChange={(eventItem) => handleToggleBulkKelasTanding(item.id, eventItem.target.checked)}
                                className="h-4 w-4 rounded border-app-border text-app-accent focus:ring-app-accent"
                              />
                            </td>
                            <td className="px-4 py-3 text-app-text-primary font-semibold">{formatText(item.nama)}</td>
                            <td className="px-4 py-3 text-app-text-secondary">{formatText(item.jenis).toUpperCase()}</td>
                            <td className="px-4 py-3 text-app-text-secondary">{KATEGORI_LABELS[item.kategori] || formatText(item.kategori)}</td>
                            <td className="px-4 py-3 text-app-text-secondary">{formatText(item.jenisKelamin)}</td>
                            <td className="px-4 py-3 text-app-text-secondary">{getBatasBeratLabel(item)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${isAssigned ? "bg-green-100 text-green-700" : "bg-app-surface-muted text-app-text-secondary"}`}>
                                {isAssigned ? "Assigned" : "Belum Assigned"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isAssigned ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnassignSingleKelasTanding(item.id)}
                                  disabled={isLoadingAction || isBulkAssigningKelasTanding}
                                  className="inline-flex whitespace-nowrap rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isLoadingAction ? "Melepas..." : "Unassign"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAssignSingleKelasTanding(item.id)}
                                  disabled={isLoadingAction || isBulkAssigningKelasTanding}
                                  className="inline-flex whitespace-nowrap rounded-full border border-app-accent bg-app-accent px-3 py-1.5 text-xs font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isLoadingAction ? "Assign..." : "Assign"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </section>
      )}
    </SiteShell>
  );
}
