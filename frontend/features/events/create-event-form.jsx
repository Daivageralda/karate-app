"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createEvent, updateEvent } from "@/features/events/service";
import { useToast } from "@/shared/components/toast-provider";

const ATTACHMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.jpg,.jpeg,.png,.webp";

const allowedAttachmentExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".zip",
  ".rar",
  ".7z",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

const initialFormValues = Object.freeze({
  name: "",
  slug: "",
  description: "",
  startAt: "",
  endAt: "",
  registrationDeadline: "",
  organizerName: "",
  organizerEmail: "",
  locationName: "",
  locationAddress: "",
  locationCity: "",
  status: "draft",
  isRegistrationOpen: false,
  maxParticipants: "0",
});

const toLocalDateTimeValue = (isoValue) => {
  if (typeof isoValue !== "string" || isoValue.trim().length === 0) {
    return "";
  }

  const dateObject = new Date(isoValue);
  if (Number.isNaN(dateObject.getTime())) {
    return "";
  }

  const timezoneOffset = dateObject.getTimezoneOffset() * 60000;
  const localDate = new Date(dateObject.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 16);
};

const createInitialValuesFromEvent = (event) => {
  if (!event || typeof event !== "object") {
    return initialFormValues;
  }

  return {
    name: typeof event.name === "string" ? event.name : "",
    slug: typeof event.slug === "string" ? event.slug : "",
    description: typeof event.description === "string" ? event.description : "",
    startAt: toLocalDateTimeValue(event.time?.startAt),
    endAt: toLocalDateTimeValue(event.time?.endAt),
    registrationDeadline: toLocalDateTimeValue(event.time?.registrationDeadline),
    organizerName: typeof event.organizer?.name === "string" ? event.organizer.name : "",
    organizerEmail: typeof event.organizer?.email === "string" ? event.organizer.email : "",
    locationName: typeof event.location?.name === "string" ? event.location.name : "",
    locationAddress: typeof event.location?.address === "string" ? event.location.address : "",
    locationCity: typeof event.location?.city === "string" ? event.location.city : "",
    status: typeof event.config?.status === "string" ? event.config.status : "draft",
    isRegistrationOpen: Boolean(event.config?.isRegistrationOpen),
    maxParticipants: String(event.config?.maxParticipants ?? 0),
  };
};

const normalizeSlug = (value) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
};

const getExtension = (fileName) => {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0) {
    return "";
  }

  return fileName.slice(dotIndex).toLowerCase();
};

const toIsoString = (localDateTimeValue) => {
  if (!localDateTimeValue) {
    return "";
  }

  const dateObject = new Date(localDateTimeValue);
  if (Number.isNaN(dateObject.getTime())) {
    return "";
  }

  return dateObject.toISOString();
};

export function CreateEventForm({ mode = "create", eventId = "", initialEvent = null, redirectTo = "" }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formValues, setFormValues] = useState(() => createInitialValuesFromEvent(initialEvent));
  const [bannerFile, setBannerFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fileInputNonce, setFileInputNonce] = useState(0);

  const attachmentSummary = useMemo(() => {
    if (attachments.length === 0) {
      return "Belum ada attachment dipilih.";
    }

    return `${attachments.length} file dipilih`;
  }, [attachments]);

  const isUpdateMode = mode === "update";

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormValues((previousValue) => {
      return {
        ...previousValue,
        [name]: type === "checkbox" ? checked : value,
      };
    });
  };

  const handleNameBlur = () => {
    if (formValues.slug.trim().length > 0) {
      return;
    }

    setFormValues((previousValue) => {
      return {
        ...previousValue,
        slug: normalizeSlug(previousValue.name),
      };
    });
  };

  const handleSlugBlur = () => {
    setFormValues((previousValue) => {
      return {
        ...previousValue,
        slug: normalizeSlug(previousValue.slug),
      };
    });
  };

  const handleBannerChange = (event) => {
    setErrorMessage("");
    const selectedFile = event.target.files?.[0] || null;

    if (!selectedFile) {
      setBannerFile(null);
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setBannerFile(null);
      setErrorMessage("Banner harus berupa gambar.");
      showToast({
        tone: "error",
        title: "Upload Gagal",
        message: "Banner harus berupa gambar.",
      });
      return;
    }

    setBannerFile(selectedFile);
  };

  const handleAttachmentChange = (event) => {
    setErrorMessage("");
    const selectedFiles = Array.from(event.target.files || []);

    const invalidFile = selectedFiles.find((file) => {
      return !allowedAttachmentExtensions.has(getExtension(file.name));
    });

    if (invalidFile) {
      setAttachments([]);
      setErrorMessage(`Format attachment tidak diizinkan: ${invalidFile.name}`);
      showToast({
        tone: "error",
        title: "Upload Gagal",
        message: `Format attachment tidak diizinkan: ${invalidFile.name}`,
      });
      return;
    }

    if (selectedFiles.length > 10) {
      setAttachments([]);
      setErrorMessage("Maksimal 10 attachment per event.");
      showToast({
        tone: "error",
        title: "Upload Gagal",
        message: "Maksimal 10 attachment per event.",
      });
      return;
    }

    setAttachments(selectedFiles);
  };

  const resetForm = () => {
    setFormValues(initialFormValues);
    setBannerFile(null);
    setAttachments([]);
    setFileInputNonce((previousValue) => previousValue + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!bannerFile) {
      if (!isUpdateMode) {
        setErrorMessage("Banner wajib diisi.");
        showToast({
          tone: "error",
          title: "Validasi Gagal",
          message: "Banner wajib diisi.",
        });
        return;
      }
    }

    const payload = {
      name: formValues.name,
      slug: normalizeSlug(formValues.slug || formValues.name),
      description: formValues.description,
      time: {
        start_at: toIsoString(formValues.startAt),
        end_at: toIsoString(formValues.endAt),
        registration_deadline: toIsoString(formValues.registrationDeadline),
      },
      organizer: {
        name: formValues.organizerName,
        email: formValues.organizerEmail,
      },
      location: {
        name: formValues.locationName,
        address: formValues.locationAddress,
        city: formValues.locationCity,
      },
      config: {
        status: formValues.status,
        is_registration_open: formValues.isRegistrationOpen,
        max_participants: Number.parseInt(formValues.maxParticipants || "0", 10),
      },
      banner: bannerFile || undefined,
      attachments,
    };

    setIsSubmitting(true);

    try {
      const savedEvent = isUpdateMode
        ? await updateEvent(eventId, payload)
        : await createEvent(payload);

      const successToast = {
        tone: "success",
        title: isUpdateMode ? "Event Diperbarui" : "Event Dibuat",
        message: isUpdateMode
          ? `Event ${savedEvent.name} berhasil diperbarui.`
          : `Event ${savedEvent.name} berhasil dibuat.`,
      };

      resetForm();

      if (redirectTo) {
        showToast(successToast);
        router.push(redirectTo);
        return;
      }

      showToast(successToast);
      router.refresh();
    } catch (error) {
      const fallbackMessage = isUpdateMode ? "Gagal memperbarui event." : "Gagal membuat event.";
      const resolvedMessage = error?.message || fallbackMessage;
      setErrorMessage(resolvedMessage);
      showToast({
        tone: "error",
        title: isUpdateMode ? "Update Gagal" : "Create Gagal",
        message: resolvedMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
      <header>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-app-text-primary">
          {isUpdateMode ? "Update Event" : "Create Event"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-app-text-secondary">
          {isUpdateMode
            ? "Perbarui data event. Upload banner/attachment hanya jika ingin mengganti file yang sudah ada."
            : "Lengkapi data event, upload banner (hanya gambar), lalu tambah attachment dokumen bila diperlukan."}
        </p>
      </header>

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm text-app-text-secondary">
          Nama Event
          <input
            type="text"
            name="name"
            value={formValues.name}
            onChange={handleFieldChange}
            onBlur={handleNameBlur}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Slug
          <input
            type="text"
            name="slug"
            value={formValues.slug}
            onChange={handleFieldChange}
            onBlur={handleSlugBlur}
            placeholder="otomatis dari nama jika kosong"
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary sm:col-span-2">
          Deskripsi
          <textarea
            name="description"
            rows={3}
            value={formValues.description}
            onChange={handleFieldChange}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Waktu Mulai
          <input
            type="datetime-local"
            name="startAt"
            value={formValues.startAt}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Waktu Selesai
          <input
            type="datetime-local"
            name="endAt"
            value={formValues.endAt}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Batas Pendaftaran
          <input
            type="datetime-local"
            name="registrationDeadline"
            value={formValues.registrationDeadline}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Status
          <select
            name="status"
            value={formValues.status}
            onChange={handleFieldChange}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Nama Penyelenggara
          <input
            type="text"
            name="organizerName"
            value={formValues.organizerName}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Email Penyelenggara
          <input
            type="email"
            name="organizerEmail"
            value={formValues.organizerEmail}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Nama Lokasi
          <input
            type="text"
            name="locationName"
            value={formValues.locationName}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary sm:col-span-2">
          Alamat Lokasi
          <input
            type="text"
            name="locationAddress"
            value={formValues.locationAddress}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Kota
          <input
            type="text"
            name="locationCity"
            value={formValues.locationCity}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Max Peserta
          <input
            type="number"
            min="0"
            name="maxParticipants"
            value={formValues.maxParticipants}
            onChange={handleFieldChange}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-secondary sm:col-span-2">
          <input
            type="checkbox"
            name="isRegistrationOpen"
            checked={formValues.isRegistrationOpen}
            onChange={handleFieldChange}
            className="h-4 w-4"
          />
          Pendaftaran dibuka
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary sm:col-span-2">
          Banner atau Poster
          <input
            key={`banner-${fileInputNonce}`}
            type="file"
            accept="image/*"
            onChange={handleBannerChange}
            required={!isUpdateMode}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary file:mr-3 file:rounded-full file:border-0 file:bg-app-accent file:px-3 file:py-1 file:text-app-accent-contrast"
          />
          <span className="text-xs text-app-text-secondary">
            {isUpdateMode
              ? "Kosongkan jika tidak ingin mengganti banner. Format: jpg, jpeg, png, gif, webp."
              : "Format gambar yang diizinkan: jpg, jpeg, png, gif, webp."}
          </span>
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary sm:col-span-2">
          Attachment (opsional)
          <input
            key={`attachment-${fileInputNonce}`}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            onChange={handleAttachmentChange}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary file:mr-3 file:rounded-full file:border-0 file:bg-app-surface file:px-3 file:py-1"
          />
          <span className="text-xs text-app-text-secondary">{attachmentSummary}</span>
        </label>

        {errorMessage ? (
          <p className="rounded-xl border border-app-danger bg-app-danger px-3 py-2 text-sm text-app-danger-contrast sm:col-span-2">
            {errorMessage}
          </p>
        ) : null}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-5 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Menyimpan..." : isUpdateMode ? "Update Event" : "Simpan Event"}
          </button>
        </div>
      </form>
    </section>
  );
}
