import { APP_CONFIG } from "@/shared/config/app";
import { PAGE_COPY } from "@/shared/config/content";
import { formatText } from "@/shared/utils/formatters";

const DEFAULT_DIRECTION = "next";
const MAX_LIMIT = 50;

const resolveSearchParamValue = (value) => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
};

export const resolveResourceQuery = async (searchParams) => {
  const resolvedSearchParams = (await searchParams) || {};
  const parsedLimit = Number.parseInt(resolveSearchParamValue(resolvedSearchParams.limit), 10);

  return {
    cursor: resolveSearchParamValue(resolvedSearchParams.cursor),
    direction:
      resolveSearchParamValue(resolvedSearchParams.direction) === "prev"
        ? "prev"
        : DEFAULT_DIRECTION,
    limit:
      Number.isNaN(parsedLimit) || parsedLimit <= 0
        ? APP_CONFIG.tablePageLimit
        : Math.min(parsedLimit, MAX_LIMIT),
  };
};

const buildHref = ({ route, cursor, direction, limit }) => {
  const searchParams = new URLSearchParams();

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  if (direction) {
    searchParams.set("direction", direction);
  }

  if (limit) {
    searchParams.set("limit", String(limit));
  }

  const queryString = searchParams.toString();

  return queryString.length > 0 ? `${route}?${queryString}` : route;
};

export const createSummaryCards = ({ route, endpoint, query, meta, items }) => {
  return [
    {
      id: `${route}-summary-route`,
      label: PAGE_COPY.labels.route,
      value: route,
    },
    {
      id: `${route}-summary-endpoint`,
      label: PAGE_COPY.labels.endpointPath,
      value: endpoint,
    },
    {
      id: `${route}-summary-count`,
      label: PAGE_COPY.labels.itemCount,
      value: String(items.length),
    },
    {
      id: `${route}-summary-direction`,
      label: PAGE_COPY.labels.direction,
      value: formatText(query.direction || meta.direction),
    },
    {
      id: `${route}-summary-limit`,
      label: PAGE_COPY.labels.limit,
      value: String(query.limit),
    },
    {
      id: `${route}-summary-next-cursor`,
      label: PAGE_COPY.labels.nextCursor,
      value: formatText(meta.nextCursor),
    },
    {
      id: `${route}-summary-prev-cursor`,
      label: PAGE_COPY.labels.prevCursor,
      value: formatText(meta.prevCursor),
    },
  ];
};

export const createPager = ({ route, query, meta }) => {
  const previousHref = meta.hasPrev && meta.prevCursor
    ? buildHref({
        route,
        cursor: meta.prevCursor,
        direction: "prev",
        limit: query.limit,
      })
    : "";

  const nextHref = meta.hasNext && meta.nextCursor
    ? buildHref({
        route,
        cursor: meta.nextCursor,
        direction: "next",
        limit: query.limit,
      })
    : "";

  return {
    previous: {
      label: PAGE_COPY.actions.previous,
      href: previousHref,
      disabled: previousHref.length === 0,
    },
    next: {
      label: PAGE_COPY.actions.next,
      href: nextHref,
      disabled: nextHref.length === 0,
    },
    reset: {
      label: PAGE_COPY.actions.reset,
      href: route,
      disabled: query.cursor.length === 0,
    },
  };
};