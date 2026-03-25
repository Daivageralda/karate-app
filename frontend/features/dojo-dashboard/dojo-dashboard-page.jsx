"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";
import { getCurrentUser } from "@/shared/services/current-user";
import { useToast } from "@/shared/components/toast-provider";

const resolveRegistrationState = (event) => {
  const status = event?.config?.status || "";
  const isRegistrationOpen = Boolean(event?.config?.isRegistrationOpen);

  if (status === "ongoing") {
    return {
      label: "Sedang Berlangsung",
      className: "bg-sky-500 text-white",
      canRegister: false,
      actionLabel: "Event Berlangsung",
    };
  }

  if (status === "closed") {
    return {
      label: "Pendaftaran Ditutup",
      className: "bg-red-500 text-white",
      canRegister: false,
      actionLabel: "Pendaftaran Ditutup",
    };
  }

  if (status === "draft") {
    if (isRegistrationOpen) {
      return {
        label: "Pendaftaran Dibuka",
        className: "bg-green-500 text-white",
        canRegister: true,
        actionLabel: "Daftar Sekarang",
      };
    }

    return {
      label: "Draft",
      className: "border border-app-border bg-app-surface text-app-text-primary",
      canRegister: false,
      actionLabel: "Belum Dibuka",
    };
  }

  if (isRegistrationOpen) {
    return {
      label: "Pendaftaran Dibuka",
      className: "bg-green-500 text-white",
      canRegister: true,
      actionLabel: "Daftar Sekarang",
    };
  }

  return {
    label: status || "Belum Dibuka",
    className: "border border-app-border bg-app-surface text-app-text-primary",
    canRegister: false,
    actionLabel: "Belum Dibuka",
  };
};

const StatusPill = ({ event }) => {
  const registrationState = resolveRegistrationState(event);

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${registrationState.className}`}>
      {registrationState.label}
    </span>
  );
};

const EventCard = ({ event }) => {
  const eventId = event.id;
  const registrationState = resolveRegistrationState(event);
  const bannerUrl = event.bannerUrl;

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-app-border bg-app-surface shadow-sm transition hover:shadow-md">
      <div className="relative min-h-64 border-b border-app-border bg-app-surface-muted">
        {bannerUrl ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bannerUrl})` }} />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-[rgba(13,18,24,0.82)] via-[rgba(13,18,24,0.42)] to-[rgba(13,18,24,0.12)]" />

        <div className="relative flex min-h-64 flex-col justify-end px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <StatusPill event={event} />
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
              {event.location?.city || "Lokasi belum tersedia"}
            </span>
          </div>

          <div className="mt-4">
            <h3 className="font-display text-2xl font-semibold text-white">{event.name || "Untitled Event"}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/80">
              {event.description || "Detail event belum tersedia."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-secondary">Mulai</p>
            <p className="mt-1 text-sm font-medium text-app-text-primary">
              {event.time?.startAt ? new Date(event.time.startAt).toLocaleDateString("id-ID") : "Belum ada jadwal"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-secondary">Batas Registrasi</p>
            <p className="mt-1 text-sm font-medium text-app-text-primary">
              {event.time?.registrationDeadline ? new Date(event.time.registrationDeadline).toLocaleDateString("id-ID") : "Belum tersedia"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-secondary">Kuota</p>
            <p className="mt-1 text-sm font-medium text-app-text-primary">{event.config?.maxParticipants ?? 0} peserta</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            href={ROUTES.dashboardDojoEvent(eventId)}
            className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
          >
            Detail
          </Link>
          <Link
            href={ROUTES.dashboardDojoEventRegister(eventId)}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              registrationState.canRegister
                ? "bg-app-accent text-app-accent-contrast hover:opacity-90"
                : "cursor-not-allowed border border-app-border bg-app-surface-muted text-app-text-secondary opacity-70"
            }`}
            onClick={(eventObject) => {
              if (!registrationState.canRegister) {
                eventObject.preventDefault();
              }
            }}
          >
            {registrationState.actionLabel}
          </Link>
        </div>
      </div>
    </article>
  );
};

export function DojoDashboardPage({ navigation, events = [] }) {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      showToast({
        tone: "error",
        title: "Authentication Required",
        message: "Please log in first",
      });
      return;
    }
    setCurrentUser(user);
  }, [showToast]);

  const userGreeting = currentUser?.name || currentUser?.email || "User";
  const dojoName = currentUser?.dojoName || "Your Dojo";

  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-8">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-semibold text-app-text-primary">
            Selamat Datang, {userGreeting}
          </h1>
          <p className="mt-2 text-app-text-secondary">
            Dojo: <span className="font-semibold">{dojoName}</span>
          </p>
        </header>

        <div className="mb-8">
          <h2 className="mb-4 font-display text-2xl font-semibold text-app-text-primary">
            Event Tersedia
          </h2>

          {events && events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-app-border bg-app-surface-muted p-8 text-center">
              <p className="text-app-text-secondary">Belum ada event yang tersedia saat ini.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
