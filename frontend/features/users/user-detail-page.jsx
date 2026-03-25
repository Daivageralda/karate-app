import Link from "next/link";

import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

const resolveRoleLabel = (role) => {
  if (role === "super_admin") {
    return "Super Admin";
  }

  if (role === "dojo_admin") {
    return "Dojo Admin";
  }

  return formatText(role);
};

const resolveBooleanLabel = (value, trueLabel, falseLabel) => {
  return value ? trueLabel : falseLabel;
};

export function UserDetailPage({ navigation, user }) {
  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-app-text-primary">
              {formatText(user.name)}
            </h1>
            <p className="mt-2 text-sm text-app-text-secondary">{formatText(user.email)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={ROUTES.users}
              className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
            >
              Kembali
            </Link>
            <Link
              href={ROUTES.usersEdit(user.id)}
              className="inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90"
            >
              Update User
            </Link>
          </div>
        </header>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Profil</h2>
          <dl className="mt-4 grid gap-3">
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">ID</dt>
              <dd className="mt-1 break-all text-sm font-medium text-app-text-primary">{formatText(user.id)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Role</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{resolveRoleLabel(user.role)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Dojo</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatText(user.dojoName || user.dojoId)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Status Aktif</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{resolveBooleanLabel(user.isActive, "Aktif", "Nonaktif")}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Verifikasi</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{resolveBooleanLabel(user.isVerified, "Terverifikasi", "Belum Terverifikasi")}</dd>
              <dd className="mt-0.5 text-xs text-app-text-secondary">Verified at: {formatDateTime(user.verifiedAt)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Last Login</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatDateTime(user.lastLogin)}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Security & Audit</h2>
          <dl className="mt-4 grid gap-3">
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Reset Token</dt>
              <dd className="mt-1 break-all text-sm font-medium text-app-text-primary">{formatText(user.resetToken)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Reset Token Expiry</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatDateTime(user.resetTokenExpiry)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Created By</dt>
              <dd className="mt-1 break-all text-sm font-medium text-app-text-primary">{formatText(user.createdBy)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Updated By</dt>
              <dd className="mt-1 break-all text-sm font-medium text-app-text-primary">{formatText(user.updatedBy)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Dibuat</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatDateTime(user.createdAt)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Diubah</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatDateTime(user.updatedAt)}</dd>
            </div>
          </dl>
        </article>
      </section>
    </SiteShell>
  );
}
