import Link from "next/link";

import { KelasTandingTableActions } from "@/features/kelas-tanding/kelas-tanding-table-actions";
import { listKelasTanding } from "@/features/kelas-tanding/service";
import { PAGE_COPY } from "@/shared/config/content";
import { ROUTES } from "@/shared/config/routes";
import { createPager, resolveResourceQuery } from "@/shared/utils/resource-page";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

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

const JENIS_LABELS = {
  kata: "Kata",
  kumite: "Kumite",
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

const mapRows = (items) => {
  return items.map((item, index) => {
    const namaCell = (
      <div className="grid gap-0.5">
        <Link
          href={ROUTES.kelasTandingDetail(item.id)}
          className="font-medium text-app-text-primary hover:text-app-accent"
        >
          {formatText(item.nama)}
        </Link>
        <span className="text-xs text-app-text-secondary">{formatText(item.id)}</span>
      </div>
    );

    const jenisCell = (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          item.jenis === "kumite"
            ? "bg-blue-100 text-blue-800"
            : "bg-purple-100 text-purple-800"
        }`}
      >
        {JENIS_LABELS[item.jenis] ?? formatText(item.jenis)}
      </span>
    );

    const jenisKelaminCell = (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          item.jenisKelamin === "laki-laki"
            ? "bg-sky-100 text-sky-800"
            : "bg-pink-100 text-pink-800"
        }`}
      >
        {JENIS_KELAMIN_LABELS[item.jenisKelamin] ?? formatText(item.jenisKelamin)}
      </span>
    );

    return {
      id: item.uuid || item.id || `kt-row-${index}`,
      cells: [
        namaCell,
        jenisCell,
        KATEGORI_LABELS[item.kategori] ?? formatText(item.kategori),
        jenisKelaminCell,
        formatBatasBerat(item.batasBerat),
        <KelasTandingTableActions
          key={`kt-actions-${item.id}`}
          itemId={item.id}
          itemNama={item.nama}
        />,
      ],
    };
  });
};

export const getKelasTandingPageData = async ({ searchParams }) => {
  const query = await resolveResourceQuery(searchParams);

  try {
    const result = await listKelasTanding(query);

    return {
      navigation: PAGE_COPY.navigation,
      page: {
        title: PAGE_COPY.resourcePages.kelasTanding.title,
        description: PAGE_COPY.resourcePages.kelasTanding.description,
      },
      table: {
        columns: PAGE_COPY.resourcePages.kelasTanding.columns,
        rows: mapRows(result.items),
        emptyMessage: PAGE_COPY.resourcePages.kelasTanding.emptyMessage,
        muteFirstColumn: false,
      },
      summaryCards: [],
      pager: createPager({
        route: ROUTES.kelasTanding,
        query,
        meta: result.meta,
      }),
      badge: {
        label: String(result.items.length),
        tone: "neutral",
      },
    };
  } catch {
    return {
      navigation: PAGE_COPY.navigation,
      page: {
        title: PAGE_COPY.resourcePages.kelasTanding.title,
        description: PAGE_COPY.resourcePages.kelasTanding.description,
      },
      table: {
        columns: PAGE_COPY.resourcePages.kelasTanding.columns,
        rows: [],
        emptyMessage: PAGE_COPY.fallback.fetchFailed,
        muteFirstColumn: false,
      },
      summaryCards: [],
      pager: null,
      badge: { label: "0", tone: "neutral" },
    };
  }
};
