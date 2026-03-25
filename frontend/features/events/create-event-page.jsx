import Link from "next/link";

import { CreateEventForm } from "@/features/events/create-event-form";
import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";

export function CreateEventPage({ navigation }) {
  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-app-text-primary">
              Create New Event
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-app-text-secondary">
              Isi data event lengkap beserta banner dan attachment. Setelah berhasil disimpan, kamu akan diarahkan
              kembali ke halaman daftar events.
            </p>
          </div>

          <Link
            href={ROUTES.events}
            className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
          >
            Kembali ke Events
          </Link>
        </header>
      </section>

      <CreateEventForm redirectTo={ROUTES.events} />
    </SiteShell>
  );
}
