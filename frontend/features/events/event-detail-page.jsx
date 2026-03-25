import Link from "next/link";

import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

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
  return (
    <SiteShell navigation={navigation}>
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
    </SiteShell>
  );
}
