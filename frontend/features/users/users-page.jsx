import Link from "next/link";

import { ResourceListPage } from "@/shared/components/resource-list-page";
import { APP_CLASS_NAMES } from "@/shared/components/class-names";
import { ROUTES } from "@/shared/config/routes";

export function UsersPage({ pageData }) {
  const topSection = (
    <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-app-text-primary">
            Kelola User Admin
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-app-text-secondary">
            Kelola akun super admin dan dojo admin, lengkap dengan status aktif, verifikasi, dan metadata keamanan.
          </p>
        </div>

        <Link href={ROUTES.usersCreate} className={APP_CLASS_NAMES.actionLink}>
          Create User
        </Link>
      </div>
    </section>
  );

  return <ResourceListPage pageData={pageData} topSection={topSection} hidePageHeading />;
}