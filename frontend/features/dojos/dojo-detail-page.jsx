import Image from "next/image";
import Link from "next/link";

import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

export function DojoDetailPage({ navigation, dojo }) {
  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-app-text-primary">
              {formatText(dojo.name)}
            </h1>
            <p className="mt-2 text-sm text-app-text-secondary">ID: {formatText(dojo.id)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={ROUTES.dojos}
              className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
            >
              Kembali
            </Link>
            <Link
              href={ROUTES.dojosEdit(dojo.id)}
              className="inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90"
            >
              Update Dojo
            </Link>
          </div>
        </header>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Informasi Dojo</h2>
          <dl className="mt-4 grid gap-3">
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Nama</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatText(dojo.name)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Dibuat</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatDateTime(dojo.createdAt)}</dd>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Diubah</dt>
              <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatDateTime(dojo.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">Logo</h2>
          {dojo.logoUrl ? (
            <>
              <div className="relative mt-4 h-64 overflow-hidden rounded-2xl border border-app-border bg-app-surface-muted">
                <Image
                  src={dojo.logoUrl}
                  alt={formatText(dojo.name)}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                />
              </div>
              <a
                href={dojo.logoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
              >
                Open Original
              </a>
            </>
          ) : (
            <p className="mt-4 text-sm text-app-text-secondary">Logo belum tersedia.</p>
          )}
        </article>
      </section>
    </SiteShell>
  );
}
