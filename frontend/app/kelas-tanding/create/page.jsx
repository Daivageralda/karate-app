import Link from "next/link";

import { CreateKelasTandingForm } from "@/features/kelas-tanding/create-kelas-tanding-form";
import { SiteShell } from "@/shared/components/site-shell";
import { PAGE_COPY } from "@/shared/config/content";
import { ROUTES } from "@/shared/config/routes";

export const dynamic = "force-dynamic";

export default function KelasTandingCreatePageRoute() {
  return (
    <SiteShell navigation={PAGE_COPY.navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-app-text-primary">
              Tambah Kelas Tanding
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-app-text-secondary">
              Tambahkan master data kelas tanding baru untuk kata atau kumite.
            </p>
          </div>

          <Link
            href={ROUTES.kelasTanding}
            className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
          >
            Kembali
          </Link>
        </header>
      </section>

      <CreateKelasTandingForm mode="create" />
    </SiteShell>
  );
}
