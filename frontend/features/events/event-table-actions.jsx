"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteEvent } from "@/features/events/service";
import { ROUTES } from "@/shared/config/routes";
import { useToast } from "@/shared/components/toast-provider";

const EyeIcon = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
};

const EditIcon = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="m15.5 4.5 4 4L8 20l-5 1 1-5L15.5 4.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const TrashIcon = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="m9 7 .6-2h4.8l.6 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7l1 12h8l1-12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v5M14 11v5" strokeLinecap="round" />
    </svg>
  );
};

export function EventTableActions({ eventId, eventName }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const openDeleteModal = () => {
    if (isDeleting) {
      return;
    }

    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) {
      return;
    }

    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteEvent(eventId);
      setIsDeleteModalOpen(false);
      showToast({
        tone: "success",
        title: "Event Dihapus",
        message: `Event ${eventName || "terpilih"} berhasil dihapus.`,
      });
      router.refresh();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Delete Gagal",
        message: error?.message || "Gagal menghapus event.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
        <Link
          href={ROUTES.eventsDetail(eventId)}
          title="Lihat detail"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-surface-muted text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
        >
          <span className="sr-only">Lihat detail</span>
          <EyeIcon />
        </Link>

        <Link
          href={ROUTES.eventsEdit(eventId)}
          title="Update event"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-surface-muted text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
        >
          <span className="sr-only">Update event</span>
          <EditIcon />
        </Link>

        <button
          type="button"
          disabled={isDeleting}
          onClick={openDeleteModal}
          title="Delete event"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-danger bg-app-danger text-app-danger-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="sr-only">Delete event</span>
          {isDeleting ? "..." : <TrashIcon />}
        </button>
      </div>

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--app-color-text-primary)_28%,transparent)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-5 shadow-xl sm:p-6">
            <h3 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">
              Konfirmasi Hapus Event
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-app-text-secondary">
              Event <span className="font-semibold text-app-text-primary">{eventName || "ini"}</span> akan dihapus permanen.
              Lanjutkan?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-70"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-full border border-app-danger bg-app-danger px-4 py-2 text-xs font-semibold text-app-danger-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
