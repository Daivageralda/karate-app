import Image from "next/image";
import Link from "next/link";

import { DojoTableActions } from "@/features/dojos/dojo-table-actions";
import { listDojos } from "@/features/dojos/service";
import { PAGE_COPY } from "@/shared/config/content";
import { ROUTES } from "@/shared/config/routes";
import {
  createPager,
  resolveResourceQuery,
} from "@/shared/utils/resource-page";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

const mapRows = (items) => {
  return items.map((item, index) => {
    const dojoNameCell = (
      <div className="grid gap-0.5">
        <Link href={ROUTES.dojosDetail(item.id)} className="font-medium text-app-text-primary hover:text-app-accent">
          {formatText(item.name)}
        </Link>
        <span className="text-xs text-app-text-secondary">{formatText(item.id)}</span>
      </div>
    );

    const logoCell = item.logoUrl ? (
      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-app-border bg-app-surface-muted">
        <Image
          src={item.logoUrl}
          alt={formatText(item.name)}
          fill
          unoptimized
          sizes="40px"
          className="object-cover"
        />
      </div>
    ) : (
      <span className="text-app-text-secondary">-</span>
    );

    return {
      id: item.uuid || item.id || `dojo-row-${index}`,
      cells: [
        dojoNameCell,
        logoCell,
        formatDateTime(item.createdAt),
        formatDateTime(item.updatedAt),
        <DojoTableActions key={`dojo-actions-${item.id}`} dojoId={item.id} dojoName={item.name} />,
      ],
    };
  });
};

export const getDojosPageData = async ({ searchParams }) => {
  const query = await resolveResourceQuery(searchParams);

  try {
    const result = await listDojos(query);

    return {
      navigation: PAGE_COPY.navigation,
      page: {
        title: PAGE_COPY.resourcePages.dojos.title,
        description: PAGE_COPY.resourcePages.dojos.description,
      },
      table: {
        columns: PAGE_COPY.resourcePages.dojos.columns,
        rows: mapRows(result.items),
        emptyMessage: PAGE_COPY.resourcePages.dojos.emptyMessage,
        muteFirstColumn: false,
      },
      summaryCards: [],
      pager: createPager({
        route: ROUTES.dojos,
        query,
        meta: result.meta,
      }),
      badge: {
        label: String(result.items.length),
        tone: "neutral",
      },
    };
  } catch (error) {
    return {
      navigation: PAGE_COPY.navigation,
      page: {
        title: PAGE_COPY.resourcePages.dojos.title,
        description: PAGE_COPY.resourcePages.dojos.description,
      },
      table: {
        columns: PAGE_COPY.resourcePages.dojos.columns,
        rows: [],
        emptyMessage: error?.message || PAGE_COPY.fallback.fetchFailed,
        muteFirstColumn: false,
      },
      summaryCards: [],
      pager: {
        previous: {
          label: PAGE_COPY.actions.previous,
          href: "",
          disabled: true,
        },
        next: {
          label: PAGE_COPY.actions.next,
          href: "",
          disabled: true,
        },
        reset: {
          label: PAGE_COPY.actions.reset,
          href: ROUTES.dojos,
          disabled: false,
        },
      },
      badge: {
        label: PAGE_COPY.status.unknown,
        tone: "negative",
      },
    };
  }
};
