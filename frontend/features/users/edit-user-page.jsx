import Link from "next/link";

import { CreateUserForm } from "@/features/users/create-user-form";
import { SiteShell } from "@/shared/components/site-shell";
import { ROUTES } from "@/shared/config/routes";

export function EditUserPage({ navigation, user, dojoOptions }) {
  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-app-text-primary">
              Update User
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-app-text-secondary">
              Perbarui profil user admin dojo, role, status akun, dan metadata verifikasi/reset password.
            </p>
          </div>

          <Link
            href={ROUTES.users}
            className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
          >
            Kembali ke Users
          </Link>
        </header>
      </section>

      <CreateUserForm mode="update" userId={user.id} initialUser={user} dojoOptions={dojoOptions} redirectTo={ROUTES.users} />
    </SiteShell>
  );
}
