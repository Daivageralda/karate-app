"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createUser, updateUser } from "@/features/users/service";
import { useToast } from "@/shared/components/toast-provider";

const USER_ROLE_OPTIONS = Object.freeze([
  {
    value: "super_admin",
    label: "Super Admin",
  },
  {
    value: "dojo_admin",
    label: "Dojo Admin",
  },
]);

const initialFormValues = Object.freeze({
  name: "",
  email: "",
  password: "",
  role: "dojo_admin",
  dojoId: "",
  isActive: true,
  lastLogin: "",
  isVerified: false,
  verifiedAt: "",
  resetToken: "",
  resetTokenExpiry: "",
  createdBy: "",
  updatedBy: "",
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

const createInitialValuesFromUser = (user) => {
  if (!user || typeof user !== "object") {
    return initialFormValues;
  }

  return {
    name: typeof user.name === "string" ? user.name : "",
    email: typeof user.email === "string" ? user.email : "",
    password: "",
    role: typeof user.role === "string" && user.role.length > 0 ? user.role : "dojo_admin",
    dojoId: typeof user.dojoId === "string" ? user.dojoId : "",
    isActive: Boolean(user.isActive),
    lastLogin: toLocalDateTimeValue(user.lastLogin),
    isVerified: Boolean(user.isVerified),
    verifiedAt: toLocalDateTimeValue(user.verifiedAt),
    resetToken: typeof user.resetToken === "string" ? user.resetToken : "",
    resetTokenExpiry: toLocalDateTimeValue(user.resetTokenExpiry),
    createdBy: typeof user.createdBy === "string" ? user.createdBy : "",
    updatedBy: typeof user.updatedBy === "string" ? user.updatedBy : "",
  };
};

const normalizeUuidInput = (value) => {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  return normalizedValue.length > 0 ? normalizedValue : "";
};

const normalizePayload = (formValues, isUpdateMode) => {
  const role = formValues.role === "super_admin" ? "super_admin" : "dojo_admin";
  const dojoId = role === "dojo_admin" ? normalizeUuidInput(formValues.dojoId) : "";

  return {
    name: formValues.name,
    email: formValues.email,
    password: isUpdateMode ? formValues.password : formValues.password,
    role,
    dojo_id: dojoId || null,
    is_active: Boolean(formValues.isActive),
    last_login: toIsoString(formValues.lastLogin) || null,
    is_verified: Boolean(formValues.isVerified),
    verified_at: toIsoString(formValues.verifiedAt) || null,
    reset_token: formValues.resetToken,
    reset_token_expiry: toIsoString(formValues.resetTokenExpiry) || null,
    created_by: normalizeUuidInput(formValues.createdBy) || null,
    updated_by: normalizeUuidInput(formValues.updatedBy) || null,
  };
};

export function CreateUserForm({
  mode = "create",
  userId = "",
  initialUser = null,
  dojoOptions = [],
  redirectTo = "",
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formValues, setFormValues] = useState(() => createInitialValuesFromUser(initialUser));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isUpdateMode = mode === "update";

  const resolvedDojoOptions = useMemo(() => {
    if (!Array.isArray(dojoOptions)) {
      return [];
    }

    return dojoOptions.filter((item) => {
      return typeof item?.id === "string" && item.id.length > 0;
    });
  }, [dojoOptions]);

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormValues((previousValue) => {
      const nextValue = {
        ...previousValue,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "role" && value === "super_admin") {
        nextValue.dojoId = "";
      }

      return nextValue;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!isUpdateMode && formValues.password.trim().length < 8) {
      const message = "Password minimal 8 karakter.";
      setErrorMessage(message);
      showToast({
        tone: "error",
        title: "Validasi Gagal",
        message,
      });
      return;
    }

    if (formValues.role === "dojo_admin" && normalizeUuidInput(formValues.dojoId).length === 0) {
      const message = "Dojo wajib dipilih untuk role dojo_admin.";
      setErrorMessage(message);
      showToast({
        tone: "error",
        title: "Validasi Gagal",
        message,
      });
      return;
    }

    const payload = normalizePayload(formValues, isUpdateMode);

    setIsSubmitting(true);

    try {
      const savedUser = isUpdateMode
        ? await updateUser(userId, payload)
        : await createUser(payload);

      const successToast = {
        tone: "success",
        title: isUpdateMode ? "User Diperbarui" : "User Dibuat",
        message: isUpdateMode
          ? `User ${savedUser.name} berhasil diperbarui.`
          : `User ${savedUser.name} berhasil dibuat.`,
      };

      if (redirectTo) {
        showToast(successToast);
        router.push(redirectTo);
        return;
      }

      showToast(successToast);
      router.refresh();
    } catch (error) {
      const fallbackMessage = isUpdateMode ? "Gagal memperbarui user." : "Gagal membuat user.";
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
          {isUpdateMode ? "Update User" : "Create User"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-app-text-secondary">
          {isUpdateMode
            ? "Perbarui profil user admin dojo termasuk role, status, dan metadata verifikasi."
            : "Buat user admin baru dengan role super admin atau dojo admin, lalu atur metadata keamanan sesuai kebutuhan."}
        </p>
      </header>

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm text-app-text-secondary">
          Nama
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
          Email
          <input
            type="email"
            name="email"
            value={formValues.email}
            onChange={handleFieldChange}
            required
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Password {isUpdateMode ? "(opsional)" : ""}
          <input
            type="password"
            name="password"
            value={formValues.password}
            onChange={handleFieldChange}
            required={!isUpdateMode}
            placeholder={isUpdateMode ? "Isi hanya jika ingin ganti password" : "Minimal 8 karakter"}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Role
          <select
            name="role"
            value={formValues.role}
            onChange={handleFieldChange}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          >
            {USER_ROLE_OPTIONS.map((option) => {
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              );
            })}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Dojo
          <select
            name="dojoId"
            value={formValues.dojoId}
            onChange={handleFieldChange}
            disabled={formValues.role !== "dojo_admin"}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value="">Pilih dojo</option>
            {resolvedDojoOptions.map((dojo) => {
              return (
                <option key={dojo.id} value={dojo.id}>
                  {dojo.name}
                </option>
              );
            })}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-secondary">
          <input
            type="checkbox"
            name="isActive"
            checked={formValues.isActive}
            onChange={handleFieldChange}
            className="h-4 w-4"
          />
          User aktif
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-secondary">
          <input
            type="checkbox"
            name="isVerified"
            checked={formValues.isVerified}
            onChange={handleFieldChange}
            className="h-4 w-4"
          />
          User terverifikasi
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Last Login
          <input
            type="datetime-local"
            name="lastLogin"
            value={formValues.lastLogin}
            onChange={handleFieldChange}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Verified At
          <input
            type="datetime-local"
            name="verifiedAt"
            value={formValues.verifiedAt}
            onChange={handleFieldChange}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Reset Token
          <input
            type="text"
            name="resetToken"
            value={formValues.resetToken}
            onChange={handleFieldChange}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Reset Token Expiry
          <input
            type="datetime-local"
            name="resetTokenExpiry"
            value={formValues.resetTokenExpiry}
            onChange={handleFieldChange}
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Created By (UUID)
          <input
            type="text"
            name="createdBy"
            value={formValues.createdBy}
            onChange={handleFieldChange}
            placeholder="opsional"
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
        </label>

        <label className="grid gap-2 text-sm text-app-text-secondary">
          Updated By (UUID)
          <input
            type="text"
            name="updatedBy"
            value={formValues.updatedBy}
            onChange={handleFieldChange}
            placeholder="opsional"
            className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
          />
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
            {isSubmitting ? "Menyimpan..." : isUpdateMode ? "Update User" : "Simpan User"}
          </button>
        </div>
      </form>
    </section>
  );
}
