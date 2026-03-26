import { notFound } from "next/navigation";
import Link from "next/link";

import { CreateKelasTandingForm } from "@/features/kelas-tanding/create-kelas-tanding-form";
import { SiteShell } from "@/shared/components/site-shell";
import { PAGE_COPY } from "@/shared/config/content";
import { ROUTES } from "@/shared/config/routes";
import { getKelasTandingById } from "@/features/kelas-tanding/service";

export const dynamic = "force-dynamic";

export default async function KelasTandingEditPageRoute({ params }) {
  const { id } = await params;

  try {
    const item = await getKelasTandingById(id);
    if (!item?.id) {
      notFound();
    }

    return (
      <SiteShell navigation={PAGE_COPY.navigation}>
        <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-app-text-primary">
                Edit Kelas Tanding
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-app-text-secondary">
                Perbarui data kelas tanding.
              </p>
            </div>

            <Link
              href={ROUTES.kelasTandingDetail(id)}
              className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
            >
              Kembali ke Detail
            </Link>
          </header>
        </section>

        <CreateKelasTandingForm mode="update" itemId={id} initialItem={item} />
      </SiteShell>
    );
  } catch {
    notFound();
  }
}
