import Link from "next/link";

import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";
import { formatText } from "@/shared/utils/formatters";

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

const resolveRegistrationState = (event) => {
  const status = event?.config?.status || "";
  const isRegistrationOpen = Boolean(event?.config?.isRegistrationOpen);

  if (status === "ongoing") {
    return { label: "Sedang Berlangsung", tone: "info", canRegister: false };
  }

  if (status === "closed") {
    return { label: "Ditutup", tone: "danger", canRegister: false };
  }

  if (status === "draft") {
    return {
      label: isRegistrationOpen ? "Pendaftaran Dibuka" : "Draft",
      tone: isRegistrationOpen ? "success" : "muted",
      canRegister: isRegistrationOpen,
    };
  }

  if (isRegistrationOpen) {
    return { label: "Pendaftaran Dibuka", tone: "success", canRegister: true };
  }

  return { label: formatText(status), tone: "muted", canRegister: false };
};

const toneClassNames = {
  success: "bg-green-500 text-white",
  info: "bg-sky-500 text-white",
  danger: "bg-red-500 text-white",
  muted: "bg-app-surface-muted text-app-text-primary border border-app-border",
};

const readableDateOnlyFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatReadableDateOnly = (value) => {
  if (typeof value !== "string" || value.length === 0) {
    return "Belum ditentukan";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Belum ditentukan";
  }

  return readableDateOnlyFormatter.format(parsedDate);
};

const AttachmentPreviewCard = ({ attachment }) => {
  const fileName = formatText(attachment?.fileName);
  const fileUrl = attachment?.fileUrl;
  const contentType = formatText(attachment?.contentType);

  return (
    <article className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-app-text-primary">{fileName}</h3>
          <p className="mt-1 text-xs text-app-text-secondary">{contentType} | {toMegabytes(attachment?.size)}</p>
        </div>

        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
          >
            Open
          </a>
        ) : null}
      </div>

      {fileUrl && isImageType(attachment?.contentType) ? (
        <div className="mt-3 h-40 rounded-xl border border-app-border bg-app-surface-muted bg-cover bg-center" style={{ backgroundImage: `url(${fileUrl})` }} />
      ) : null}

      {fileUrl && isPdfType(attachment?.contentType) ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-app-border">
          <iframe title={`preview-${fileName}`} src={fileUrl} className="h-48 w-full" />
        </div>
      ) : null}

      {fileUrl && !isImageType(attachment?.contentType) && !isPdfType(attachment?.contentType) ? (
        <div className="mt-3 rounded-xl border border-dashed border-app-border bg-app-surface-muted px-3 py-6 text-center text-xs text-app-text-secondary">
          Preview tidak tersedia untuk tipe file ini.
        </div>
      ) : null}
    </article>
  );
};

const getEventDescriptionParagraphs = (description) => {
  if (typeof description !== "string") {
    return [];
  }

  return description
    .split(/\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const RegistrationActionLink = ({ href, canRegister, children, variant = "hero" }) => {
  const enabledClassName = variant === "hero"
    ? "bg-app-accent text-app-accent-contrast hover:opacity-90"
    : "bg-app-accent text-app-accent-contrast hover:opacity-90";
  const disabledClassName = variant === "hero"
    ? "cursor-not-allowed border border-app-border bg-app-surface text-app-text-secondary"
    : "cursor-not-allowed border border-app-border bg-app-surface-muted text-app-text-secondary";
  const baseClassName = variant === "hero"
    ? "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition"
    : "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition";

  if (!canRegister) {
    return <span className={`${baseClassName} ${disabledClassName}`}>{children}</span>;
  }

  return (
    <Link href={href} className={`${baseClassName} ${enabledClassName}`}>
      {children}
    </Link>
  );
};

export function DojoEventOverviewPage({ navigation, event }) {
  const registrationState = resolveRegistrationState(event);
  const bannerUrl = event?.bannerUrl;
  const descriptionParagraphs = getEventDescriptionParagraphs(event?.description);
  const maxParticipants = Number(event?.config?.maxParticipants ?? 0);
  const registeredParticipants = Number(
    event?.config?.registeredParticipants
      ?? event?.config?.currentParticipants
      ?? event?.summary?.registeredParticipants
      ?? 0
  );

  return (
    <SiteShell navigation={navigation}>
      <article className="overflow-hidden rounded-4xl border border-app-border bg-app-surface shadow-sm">
        <div className="relative min-h-88 border-b border-app-border bg-app-surface-muted">
          {bannerUrl ? (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bannerUrl})` }} />
          ) : null}
          <div className="absolute inset-0 bg-linear-to-t from-[rgba(13,18,24,0.82)] via-[rgba(13,18,24,0.45)] to-[rgba(13,18,24,0.18)]" />

          <div className="relative flex min-h-88 items-end justify-end px-6 py-8 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href={ROUTES.dashboardDojo}
                className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
              >
                Kembali
              </Link>
              <RegistrationActionLink href={ROUTES.dashboardDojoEventRegister(event.id)} canRegister={registrationState.canRegister}>
                Daftar Event
              </RegistrationActionLink>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.35fr_0.9fr] lg:px-10">
          <section>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-app-text-primary sm:text-5xl">
              {formatText(event?.name)}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1.5 text-app-text-primary">
                Batas pendaftaran: {formatReadableDateOnly(event?.time?.registrationDeadline)}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${toneClassNames[registrationState.tone] || toneClassNames.muted}`}>
                {registrationState.label}
              </span>
              <span className="inline-flex items-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1.5 text-app-text-primary">
                Pelaksanaan: {formatReadableDateOnly(event?.time?.startAt)} - {formatReadableDateOnly(event?.time?.endAt)}
              </span>
              <span className="inline-flex items-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1.5 text-app-text-primary">
                {`${registeredParticipants}/${maxParticipants} peserta`}
              </span>
            </div>

            <div className="mt-6 max-w-none text-sm leading-7 text-app-text-secondary">
              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.map((paragraph, index) => (
                  <p key={`${event?.id || "event"}-description-${index}`} className={index > 0 ? "mt-4" : ""}>
                    {paragraph}
                  </p>
                ))
              ) : (
                <p>Deskripsi event belum tersedia.</p>
              )}
            </div>

            <div className="mt-8 rounded-3xl border border-app-border bg-app-surface-muted p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-app-text-primary">Attachment Event</h2>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-secondary">
                  {Array.isArray(event?.attachments) ? event.attachments.length : 0} file
                </span>
              </div>

              {Array.isArray(event?.attachments) && event.attachments.length > 0 ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {event.attachments.map((attachment, index) => {
                    const key = `${attachment?.fileUrl || attachment?.fileName || "attachment"}-${index}`;
                    return <AttachmentPreviewCard key={key} attachment={attachment} />;
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-6 text-sm text-app-text-secondary">
                  Belum ada attachment tambahan untuk event ini.
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-app-border bg-app-surface-muted p-5">
              <h2 className="font-display text-xl font-semibold text-app-text-primary">Informasi Event</h2>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-secondary">Lokasi</dt>
                  <dd className="mt-2 text-sm text-app-text-primary">{formatText(event?.location?.name)}</dd>
                  <dd className="mt-1 text-sm text-app-text-secondary">{formatText(event?.location?.address)}</dd>
                  <dd className="mt-1 text-sm text-app-text-secondary">{formatText(event?.location?.city)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-secondary">Penyelenggara</dt>
                  <dd className="mt-2 text-sm text-app-text-primary">{formatText(event?.organizer?.name)}</dd>
                  <dd className="mt-1 text-sm text-app-text-secondary">{formatText(event?.organizer?.email)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-secondary">Status Sistem</dt>
                  <dd className="mt-2 text-sm text-app-text-primary">{registrationState.label}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </article>
    </SiteShell>
  );
}
