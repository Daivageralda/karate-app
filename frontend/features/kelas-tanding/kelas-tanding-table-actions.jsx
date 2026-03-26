"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteKelasTanding } from "@/features/kelas-tanding/service";
import { ROUTES } from "@/shared/config/routes";
import { useToast } from "@/shared/components/toast-provider";

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
    <path d="M12 20h9" strokeLinecap="round" />
    <path d="m15.5 4.5 4 4L8 20l-5 1 1-5L15.5 4.5Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
    <path d="M4 7h16" strokeLinecap="round" />
    <path d="m9 7 .6-2h4.8l.6 2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 7l1 12h8l1-12" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 11v5M14 11v5" strokeLinecap="round" />
  </svg>
);

export function KelasTandingTableActions({ itemId, itemNama }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const openDeleteModal = () => {
    if (!isDeleting) setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (!isDeleting) setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      await deleteKelasTanding(itemId);
      setIsDeleteModalOpen(false);
      showToast({
        tone: "success",
        title: "Kelas Tanding Dihapus",
        message: `Kelas tanding "${itemNama || "terpilih"}" berhasil dihapus.`,
      });
      router.refresh();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Delete Gagal",
        message: error?.message || "Gagal menghapus kelas tanding.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
        <Link
          href={ROUTES.kelasTandingDetail(itemId)}
          title="Lihat detail"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-surface-muted text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
        >
          <span className="sr-only">Lihat detail</span>
          <EyeIcon />
        </Link>

        <Link
          href={ROUTES.kelasTandingEdit(itemId)}
          title="Edit kelas tanding"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-border bg-app-surface-muted text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
        >
          <span className="sr-only">Edit kelas tanding</span>
          <EditIcon />
        </Link>

        <button
          type="button"
          disabled={isDeleting}
          onClick={openDeleteModal}
          title="Hapus kelas tanding"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-app-danger bg-app-danger text-app-danger-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="sr-only">Hapus kelas tanding</span>
          {isDeleting ? "..." : <TrashIcon />}
        </button>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--app-color-text-primary)_28%,transparent)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-5 shadow-xl sm:p-6">
            <h3 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">
              Konfirmasi Hapus Kelas Tanding
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-app-text-secondary">
              Kelas tanding{" "}
              <span className="font-semibold text-app-text-primary">{itemNama || "ini"}</span>{" "}
              akan dihapus permanen. Lanjutkan?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-primary transition hover:bg-app-surface-muted disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl bg-app-danger px-4 py-2 text-sm font-medium text-app-danger-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
