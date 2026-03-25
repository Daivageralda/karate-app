import Link from "next/link";

import { CreateDojoForm } from "@/features/dojos/create-dojo-form";
import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";

export function EditDojoPage({ navigation, dojo }) {
  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-app-text-primary">
              Update Dojo
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-app-text-secondary">
              Perbarui identitas dojo dan ganti logo bila diperlukan.
            </p>
          </div>

          <Link
            href={ROUTES.dojos}
            className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
          >
            Kembali ke Dojos
          </Link>
        </header>
      </section>

      <CreateDojoForm mode="update" dojoId={dojo.id} initialDojo={dojo} redirectTo={ROUTES.dojos} />
    </SiteShell>
  );
}
