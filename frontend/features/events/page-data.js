import Link from "next/link";
import { listEvents } from "@/features/events/service";
import { EventTableActions } from "@/features/events/event-table-actions";
import { PAGE_COPY } from "@/shared/config/content";
import { ROUTES } from "@/shared/config/routes";
import {
  createPager,
  resolveResourceQuery,
} from "@/shared/utils/resource-page";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

const createScheduleCell = (item) => {
  return `${formatDateTime(item.time?.startAt)} - ${formatDateTime(item.time?.endAt)}`;
};

const createOrganizerCell = (item) => {
  const name = formatText(item.organizer?.name);
  const email = formatText(item.organizer?.email);
  return `${name} (${email})`;
};

const createLocationCell = (item) => {
  const locationName = formatText(item.location?.name);
  const city = formatText(item.location?.city);
  return `${locationName} - ${city}`;
};

const createStatusCell = (item) => {
  const status = formatText(item.config?.status);
  const registration = item.config?.isRegistrationOpen ? "Registrasi Buka" : "Registrasi Tutup";
  const maxParticipants = typeof item.config?.maxParticipants === "number"
    ? item.config.maxParticipants
    : 0;

  return `${status} | ${registration} | Max ${maxParticipants}`;
};

const mapRows = (items) => {
  return items.map((item, index) => {
    const nameCell = (
      <div className="grid gap-0.5">
        <Link href={ROUTES.eventsDetail(item.id)} className="font-medium text-app-text-primary hover:text-app-accent">
          {formatText(item.name)}
        </Link>
        <span className="text-xs text-app-text-secondary">{formatText(item.slug)}</span>
      </div>
    );

    return {
      id: item.uuid || item.id || `event-row-${index}`,
      cells: [
        nameCell,
        createScheduleCell(item),
        createOrganizerCell(item),
        createLocationCell(item),
        createStatusCell(item),
        <EventTableActions key={`event-actions-${item.id}`} eventId={item.id} eventName={item.name} />,
      ],
    };
  });
};

export const getEventsPageData = async ({ searchParams }) => {
  const query = await resolveResourceQuery(searchParams);

  try {
    const result = await listEvents(query);

    return {
      navigation: PAGE_COPY.navigation,
      page: {
        title: PAGE_COPY.resourcePages.events.title,
        description: PAGE_COPY.resourcePages.events.description,
      },
      table: {
        columns: PAGE_COPY.resourcePages.events.columns,
        rows: mapRows(result.items),
        emptyMessage: PAGE_COPY.resourcePages.events.emptyMessage,
        muteFirstColumn: false,
      },
      summaryCards: [],
      pager: createPager({
        route: ROUTES.events,
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
        title: PAGE_COPY.resourcePages.events.title,
        description: PAGE_COPY.resourcePages.events.description,
      },
      table: {
        columns: PAGE_COPY.resourcePages.events.columns,
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
          href: ROUTES.events,
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