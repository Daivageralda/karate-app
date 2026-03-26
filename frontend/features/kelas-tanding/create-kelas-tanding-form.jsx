"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createKelasTanding, updateKelasTanding } from "@/features/kelas-tanding/service";
import { useToast } from "@/shared/components/toast-provider";
import { ROUTES } from "@/shared/config/routes";

const JENIS_OPTIONS = [
  { value: "kata", label: "Kata" },
  { value: "kumite", label: "Kumite" },
];

const KATEGORI_OPTIONS = [
  { value: "pra_usia_dini", label: "Pra Usia Dini" },
  { value: "usia_dini", label: "Usia Dini" },
  { value: "pra_pemula", label: "Pra Pemula" },
  { value: "pemula", label: "Pemula" },
  { value: "kadet", label: "Kadet" },
  { value: "junior", label: "Junior" },
  { value: "under_21", label: "Under 21" },
  { value: "senior", label: "Senior" },
  { value: "veteran", label: "Veteran" },
];

const JENIS_KELAMIN_OPTIONS = [
  { value: "laki-laki", label: "Laki-laki" },
  { value: "perempuan", label: "Perempuan" },
];

const initialFormValues = Object.freeze({
  nama: "",
  jenis: "kumite",
  kategori: "senior",
  jenisKelamin: "laki-laki",
  beratBawah: "",
  beratAtas: "",
});

const createInitialValues = (item) => {
  if (!item || typeof item !== "object") return initialFormValues;

  return {
    nama: typeof item.nama === "string" ? item.nama : "",
    jenis: typeof item.jenis === "string" && item.jenis.length > 0 ? item.jenis : "kumite",
    kategori: typeof item.kategori === "string" && item.kategori.length > 0 ? item.kategori : "senior",
    jenisKelamin:
      typeof item.jenisKelamin === "string" && item.jenisKelamin.length > 0
        ? item.jenisKelamin
        : "laki-laki",
    beratBawah: item.batasBerat?.bawah != null ? String(item.batasBerat.bawah) : "",
    beratAtas: item.batasBerat?.atas != null ? String(item.batasBerat.atas) : "",
  };
};

export function CreateKelasTandingForm({ mode = "create", itemId = "", initialItem = null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formValues, setFormValues] = useState(() => createInitialValues(initialItem));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isUpdateMode = mode === "update";
  const isKumite = formValues.jenis === "kumite";

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const payload = {
      nama: formValues.nama.trim(),
      jenis: formValues.jenis,
      kategori: formValues.kategori,
      jenis_kelamin: formValues.jenisKelamin,
      batas_berat: isKumite
        ? {
            bawah: Number(formValues.beratBawah),
            atas: Number(formValues.beratAtas),
          }
        : null,
    };

    setIsSubmitting(true);

    try {
      const saved = isUpdateMode
        ? await updateKelasTanding(itemId, payload)
        : await createKelasTanding(payload);

      showToast({
        tone: "success",
        title: isUpdateMode ? "Kelas Tanding Diperbarui" : "Kelas Tanding Dibuat",
        message: `Kelas tanding "${saved.nama}" berhasil ${isUpdateMode ? "diperbarui" : "dibuat"}.`,
      });

      router.push(ROUTES.kelasTanding);
    } catch (error) {
      const fallbackMessage = isUpdateMode
        ? "Gagal memperbarui kelas tanding."
        : "Gagal membuat kelas tanding.";
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

  const inputClass =
    "rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent";

  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
      <header>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-app-text-primary">
          {isUpdateMode ? "Edit Kelas Tanding" : "Tambah Kelas Tanding"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-app-text-secondary">
          {isUpdateMode
            ? "Perbarui data kelas tanding."
            : "Isi detail kelas tanding. Batas berat hanya berlaku untuk jenis Kumite."}
        </p>
      </header>

      <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
        {/* Nama */}
        <label className="grid gap-2 text-sm text-app-text-secondary">
          Nama Kelas Tanding
          <input
            type="text"
            name="nama"
            value={formValues.nama}
            onChange={handleFieldChange}
            required
            placeholder="Contoh: Kumite Putra Senior +84 kg"
            className={inputClass}
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Jenis */}
          <label className="grid gap-2 text-sm text-app-text-secondary">
            Jenis
            <select
              name="jenis"
              value={formValues.jenis}
              onChange={handleFieldChange}
              required
              className={inputClass}
            >
              {JENIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Kategori */}
          <label className="grid gap-2 text-sm text-app-text-secondary">
            Kategori
            <select
              name="kategori"
              value={formValues.kategori}
              onChange={handleFieldChange}
              required
              className={inputClass}
            >
              {KATEGORI_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Jenis Kelamin */}
        <label className="grid gap-2 text-sm text-app-text-secondary">
          Jenis Kelamin
          <select
            name="jenisKelamin"
            value={formValues.jenisKelamin}
            onChange={handleFieldChange}
            required
            className={inputClass}
          >
            {JENIS_KELAMIN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Batas Berat — only for kumite */}
        {isKumite && (
          <fieldset className="rounded-2xl border border-app-border p-4">
            <legend className="mb-3 text-sm font-medium text-app-text-primary px-1">
              Batas Berat (kg)
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-app-text-secondary">
                Berat Bawah (kg)
                <input
                  type="number"
                  name="beratBawah"
                  value={formValues.beratBawah}
                  onChange={handleFieldChange}
                  required={isKumite}
                  min="0"
                  step="0.5"
                  placeholder="Contoh: 0 atau 60"
                  className={inputClass}
                />
                <span className="text-xs text-app-text-secondary">
                  Gunakan 0 untuk kelas terbawah (open weight bawah)
                </span>
              </label>

              <label className="grid gap-2 text-sm text-app-text-secondary">
                Berat Atas (kg)
                <input
                  type="number"
                  name="beratAtas"
                  value={formValues.beratAtas}
                  onChange={handleFieldChange}
                  required={isKumite}
                  min="1"
                  step="0.5"
                  placeholder="Contoh: 55 atau 84"
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>
        )}

        {errorMessage && (
          <p className="rounded-xl border border-app-danger bg-app-danger px-3 py-2 text-sm text-app-danger-contrast">
            {errorMessage}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(ROUTES.kelasTanding)}
            disabled={isSubmitting}
            className="rounded-xl border border-app-border bg-app-surface px-5 py-2.5 text-sm font-semibold text-app-text-primary transition hover:bg-app-surface-muted disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-app-accent px-5 py-2.5 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? isUpdateMode
                ? "Menyimpan..."
                : "Membuat..."
              : isUpdateMode
                ? "Simpan Perubahan"
                : "Tambah Kelas Tanding"}
          </button>
        </div>
      </form>
    </section>
  );
}
