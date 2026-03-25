import { ResourceListPage } from "@/shared/components/resource-list-page";
import Link from "next/link";

import { APP_CLASS_NAMES } from "@/shared/components/class-names";
import { ROUTES } from "@/shared/config/routes";

export function EventsPage({ pageData }) {
  const topSection = (
    <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-app-text-primary">
            Kelola Data Event
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-app-text-secondary">
            Lihat daftar event dan buat event baru lewat halaman form terpisah agar tampilan lebih fokus dan rapi.
          </p>
        </div>

        <Link href={ROUTES.eventsCreate} className={APP_CLASS_NAMES.actionLink}>
          Create Event
        </Link>
      </div>
    </section>
  );

  return <ResourceListPage pageData={pageData} topSection={topSection} hidePageHeading />;
}