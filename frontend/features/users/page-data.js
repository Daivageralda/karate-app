import Link from "next/link";

import { listUsers } from "@/features/users/service";
import { UserTableActions } from "@/features/users/user-table-actions";
import { PAGE_COPY } from "@/shared/config/content";
import { ROUTES } from "@/shared/config/routes";
import {
  createPager,
  resolveResourceQuery,
} from "@/shared/utils/resource-page";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

const resolveRoleLabel = (role) => {
  if (role === "super_admin") {
    return "Super Admin";
  }

  if (role === "dojo_admin") {
    return "Dojo Admin";
  }

  return formatText(role);
};

const mapRows = (items) => {
  return items.map((item, index) => {
    const userCell = (
      <div className="grid gap-0.5">
        <Link href={ROUTES.usersDetail(item.id)} className="font-medium text-app-text-primary hover:text-app-accent">
          {formatText(item.name)}
        </Link>
        <span className="text-xs text-app-text-secondary">{formatText(item.email)}</span>
      </div>
    );

    const statusCell = (
      <div className="grid gap-0.5">
        <span>{item.isActive ? "Aktif" : "Nonaktif"}</span>
        <span className="text-xs text-app-text-secondary">{item.isVerified ? "Terverifikasi" : "Belum Verifikasi"}</span>
      </div>
    );

    return {
      id: item.id || `user-row-${index}`,
      cells: [
        userCell,
        resolveRoleLabel(item.role),
        formatText(item.dojoName || item.dojoId),
        statusCell,
        formatDateTime(item.lastLogin),
        formatDateTime(item.createdAt),
        <UserTableActions key={`user-actions-${item.id}`} userId={item.id} userName={item.name} />,
      ],
    };
  });
};

export const getUsersPageData = async ({ searchParams }) => {
  const query = await resolveResourceQuery(searchParams);

  try {
    const result = await listUsers(query);

    return {
      navigation: PAGE_COPY.navigation,
      page: {
        title: PAGE_COPY.resourcePages.users.title,
        description: PAGE_COPY.resourcePages.users.description,
      },
      table: {
        columns: PAGE_COPY.resourcePages.users.columns,
        rows: mapRows(result.items),
        emptyMessage: PAGE_COPY.resourcePages.users.emptyMessage,
        muteFirstColumn: false,
      },
      summaryCards: [],
      pager: createPager({
        route: ROUTES.users,
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
        title: PAGE_COPY.resourcePages.users.title,
        description: PAGE_COPY.resourcePages.users.description,
      },
      table: {
        columns: PAGE_COPY.resourcePages.users.columns,
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
          href: ROUTES.users,
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