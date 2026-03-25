"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createDojo, updateDojo } from "@/features/dojos/service";
import { useToast } from "@/shared/components/toast-provider";

const initialFormValues = Object.freeze({
  name: "",
});

const createInitialValuesFromDojo = (dojo) => {
  if (!dojo || typeof dojo !== "object") {
    return initialFormValues;
  }

  return {
    name: typeof dojo.name === "string" ? dojo.name : "",
  };
};

export function CreateDojoForm({ mode = "create", dojoId = "", initialDojo = null, redirectTo = "" }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formValues, setFormValues] = useState(() => createInitialValuesFromDojo(initialDojo));
  const [logoFile, setLogoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fileInputNonce, setFileInputNonce] = useState(0);

  const isUpdateMode = mode === "update";

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormValues((previousValue) => {
      return {
        ...previousValue,
        [name]: value,
      };
    });
  };

  const handleLogoChange = (event) => {
    setErrorMessage("");
    const selectedFile = event.target.files?.[0] || null;

    if (!selectedFile) {
      setLogoFile(null);
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setLogoFile(null);
      setErrorMessage("Logo harus berupa gambar.");
      showToast({
        tone: "error",
        title: "Upload Gagal",
        message: "Logo harus berupa gambar.",
      });
      return;
    }

    setLogoFile(selectedFile);
  };

  const resetForm = () => {
    setFormValues(initialFormValues);
    setLogoFile(null);
    setFileInputNonce((previousValue) => previousValue + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!logoFile && !isUpdateMode) {
      setErrorMessage("Logo wajib diisi.");
      showToast({
        tone: "error",
        title: "Validasi Gagal",
        message: "Logo wajib diisi.",
      });
      return;
    }

    const payload = {
      name: formValues.name,
      logo: logoFile || undefined,
    };

    setIsSubmitting(true);

    try {
      const savedDojo = isUpdateMode
        ? await updateDojo(dojoId, payload)
        : await createDojo(payload);

      const successToast = {
        tone: "success",
        title: isUpdateMode ? "Dojo Diperbarui" : "Dojo Dibuat",
        message: isUpdateMode
          ? `Dojo ${savedDojo.name} berhasil diperbarui.`
          : `Dojo ${savedDojo.name} berhasil dibuat.`,
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
      const fallbackMessage = isUpdateMode ? "Gagal memperbarui dojo." : "Gagal membuat dojo.";
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
          {isUpdateMode ? "Update Dojo" : "Create Dojo"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-app-text-secondary">
          {isUpdateMode
            ? "Perbarui data dojo. Jika logo tidak diunggah ulang, logo lama tetap digunakan."
            : "Masukkan nama dojo dan upload logo gambar. File logo akan dikonversi ke WebP otomatis oleh backend."}
        </p>
      </header>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm text-app-text-secondary">
          Nama Dojo
          <input
            type="text"
            name="name"
            value={formValues.name}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Logo Dojo
          <input
            key={`dojo-logo-${fileInputNonce}`}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            required={!isUpdateMode}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary file:mr-3 file:rounded-full file:border-0 file:bg-app-accent file:px-3 file:py-1 file:text-app-accent-contrast"
          />
          <span className="text-xs text-app-text-secondary">
            {isUpdateMode
              ? "Kosongkan jika tidak ingin mengganti logo. Format: jpg, jpeg, png, gif, webp."
              : "Format gambar yang diizinkan: jpg, jpeg, png, gif, webp."}
          </span>
        </label>

        {initialDojo?.logoUrl ? (
          <div className="grid gap-2 text-sm text-app-text-secondary">
            <span>Logo Saat Ini</span>
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-app-border bg-app-surface-muted">
              <Image
                src={initialDojo.logoUrl}
                alt={initialDojo.name || "Logo dojo"}
                fill
                unoptimized
                sizes="96px"
                className="object-cover"
              />
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="rounded-xl border border-app-danger bg-app-danger px-3 py-2 text-sm text-app-danger-contrast">
            {errorMessage}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-5 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Menyimpan..." : isUpdateMode ? "Update Dojo" : "Simpan Dojo"}
          </button>
        </div>
      </form>
    </section>
  );
}
