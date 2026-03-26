import Link from "next/link";

import { SiteShell } from "@/shared/components/site-shell";
import { PAGE_COPY } from "@/shared/config/content";
import { ROUTES } from "@/shared/config/routes";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

const JENIS_LABELS = {
  kata: "Kata",
  kumite: "Kumite",
};

const KATEGORI_LABELS = {
  pra_usia_dini: "Pra Usia Dini",
  usia_dini: "Usia Dini",
  pra_pemula: "Pra Pemula",
  pemula: "Pemula",
  kadet: "Kadet",
  junior: "Junior",
  under_21: "Under 21",
  senior: "Senior",
  veteran: "Veteran",
};

const JENIS_KELAMIN_LABELS = {
  "laki-laki": "Laki-laki",
  perempuan: "Perempuan",
};

const formatBatasBerat = (batasBerat) => {
  if (!batasBerat) return "-";
  const { bawah, atas } = batasBerat;
  if (bawah === 0) return `s/d ${atas} kg`;
  return `${bawah} – ${atas} kg`;
};

export function KelasTandingDetailPage({ item }) {
  const navigation = PAGE_COPY.navigation;

  return (
    <SiteShell navigation={navigation}>
      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-app-text-primary">
              {formatText(item.nama)}
            </h1>
            <p className="mt-2 text-sm text-app-text-secondary">ID: {formatText(item.id)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={ROUTES.kelasTanding}
              className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
            >
              Kembali
            </Link>
            <Link
              href={ROUTES.kelasTandingEdit(item.id)}
              className="inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90"
            >
              Edit Kelas Tanding
            </Link>
          </div>
        </header>
      </section>

      <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold tracking-tight text-app-text-primary">
          Detail Kelas Tanding
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Nama</dt>
            <dd className="mt-1 text-sm font-medium text-app-text-primary">{formatText(item.nama)}</dd>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Jenis</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  item.jenis === "kumite"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {JENIS_LABELS[item.jenis] ?? formatText(item.jenis)}
              </span>
            </dd>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Kategori</dt>
            <dd className="mt-1 text-sm font-medium text-app-text-primary">
              {KATEGORI_LABELS[item.kategori] ?? formatText(item.kategori)}
            </dd>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Jenis Kelamin</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  item.jenisKelamin === "laki-laki"
                    ? "bg-sky-100 text-sky-800"
                    : "bg-pink-100 text-pink-800"
                }`}
              >
                {JENIS_KELAMIN_LABELS[item.jenisKelamin] ?? formatText(item.jenisKelamin)}
              </span>
            </dd>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Batas Berat</dt>
            <dd className="mt-1 text-sm font-medium text-app-text-primary">
              {formatBatasBerat(item.batasBerat)}
            </dd>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Dibuat</dt>
            <dd className="mt-1 text-sm font-medium text-app-text-primary">
              {formatDateTime(item.createdAt)}
            </dd>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Diubah</dt>
            <dd className="mt-1 text-sm font-medium text-app-text-primary">
              {formatDateTime(item.updatedAt)}
            </dd>
          </div>
        </dl>
      </section>
    </SiteShell>
  );
}
