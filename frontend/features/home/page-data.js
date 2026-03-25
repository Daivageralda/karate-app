import { listDojos } from "@/features/dojos/service";
import { listEvents } from "@/features/events/service";
import { getHealthStatus } from "@/features/health/service";
import { listUsers } from "@/features/users/service";
import { APP_CONFIG } from "@/shared/config/app";
import { PAGE_COPY } from "@/shared/config/content";
import { ENV } from "@/shared/config/env";
import { formatDateTime, formatText } from "@/shared/utils/formatters";

const createMetaRows = () => {
  return [
    {
      id: "meta-api-base-url",
      label: PAGE_COPY.labels.apiBaseUrl,
      value: ENV.apiBaseUrl,
    },
    {
      id: "meta-architecture",
      label: PAGE_COPY.labels.architecture,
      value: PAGE_COPY.architectureMeta.structure,
    },
    {
      id: "meta-fetch-mode",
      label: PAGE_COPY.labels.fetchMode,
      value: PAGE_COPY.architectureMeta.fetchMode,
    },
  ];
};

const mapUsersToEntries = (items) => {
  return items.slice(0, APP_CONFIG.previewLimit).map((item, index) => {
    return {
      id: `user-entry-${item.id || index}`,
      label: formatText(item.name),
      value: `${formatText(item.email)} | ${PAGE_COPY.labels.createdAt}: ${formatDateTime(item.createdAt)}`,
    };
  });
};

const mapEventsToEntries = (items) => {
  return items.slice(0, APP_CONFIG.previewLimit).map((item, index) => {
    return {
      id: `event-entry-${item.id || index}`,
      label: formatText(item.name),
      value: `${formatText(item.location?.name)} | ${PAGE_COPY.labels.startAt}: ${formatDateTime(item.time?.startAt)}`,
    };
  });
};

const mapDojosToEntries = (items) => {
  return items.slice(0, APP_CONFIG.previewLimit).map((item, index) => {
    return {
      id: `dojo-entry-${item.id || index}`,
      label: formatText(item.name),
      value: `${PAGE_COPY.labels.createdAt}: ${formatDateTime(item.createdAt)}`,
    };
  });
};

const createHealthSection = async () => {
  try {
    const healthResult = await getHealthStatus();
    const isHealthy = healthResult.healthy === true;

    return {
      id: "section-health",
      title: PAGE_COPY.sections.health.title,
      description: PAGE_COPY.sections.health.description,
      badge: {
        label: isHealthy ? PAGE_COPY.status.online : PAGE_COPY.status.offline,
        tone: isHealthy ? "positive" : "negative",
      },
      entries: [
        {
          id: "health-entry-service-status",
          label: PAGE_COPY.labels.serviceStatus,
          value: isHealthy ? PAGE_COPY.status.healthy : PAGE_COPY.status.unhealthy,
        },
      ],
      emptyMessage: PAGE_COPY.fallback.fetchFailed,
    };
  } catch (error) {
    return {
      id: "section-health",
      title: PAGE_COPY.sections.health.title,
      description: PAGE_COPY.sections.health.description,
      badge: {
        label: PAGE_COPY.status.unknown,
        tone: "negative",
      },
      entries: [],
      emptyMessage: error?.message || PAGE_COPY.fallback.fetchFailed,
    };
  }
};

const createUsersSection = async () => {
  try {
    const usersResult = await listUsers({
      direction: "next",
      limit: APP_CONFIG.previewLimit,
    });

    return {
      id: "section-users",
      title: PAGE_COPY.sections.users.title,
      description: PAGE_COPY.sections.users.description,
      badge: {
        label: String(usersResult.items.length),
        tone: "neutral",
      },
      entries: [
        {
          id: "users-entry-count",
          label: PAGE_COPY.labels.itemCount,
          value: String(usersResult.items.length),
        },
        {
          id: "users-entry-direction",
          label: PAGE_COPY.labels.direction,
          value: formatText(usersResult.meta.direction),
        },
        {
          id: "users-entry-next-cursor",
          label: PAGE_COPY.labels.nextCursor,
          value: formatText(usersResult.meta.nextCursor),
        },
        {
          id: "users-entry-prev-cursor",
          label: PAGE_COPY.labels.prevCursor,
          value: formatText(usersResult.meta.prevCursor),
        },
        ...mapUsersToEntries(usersResult.items),
      ],
      emptyMessage: PAGE_COPY.fallback.noUsers,
    };
  } catch (error) {
    return {
      id: "section-users",
      title: PAGE_COPY.sections.users.title,
      description: PAGE_COPY.sections.users.description,
      badge: {
        label: PAGE_COPY.status.unknown,
        tone: "negative",
      },
      entries: [],
      emptyMessage: error?.message || PAGE_COPY.fallback.fetchFailed,
    };
  }
};

const createEventsSection = async () => {
  try {
    const eventsResult = await listEvents({
      direction: "next",
      limit: APP_CONFIG.previewLimit,
    });

    return {
      id: "section-events",
      title: PAGE_COPY.sections.events.title,
      description: PAGE_COPY.sections.events.description,
      badge: {
        label: String(eventsResult.items.length),
        tone: "neutral",
      },
      entries: [
        {
          id: "events-entry-count",
          label: PAGE_COPY.labels.itemCount,
          value: String(eventsResult.items.length),
        },
        {
          id: "events-entry-direction",
          label: PAGE_COPY.labels.direction,
          value: formatText(eventsResult.meta.direction),
        },
        {
          id: "events-entry-next-cursor",
          label: PAGE_COPY.labels.nextCursor,
          value: formatText(eventsResult.meta.nextCursor),
        },
        {
          id: "events-entry-prev-cursor",
          label: PAGE_COPY.labels.prevCursor,
          value: formatText(eventsResult.meta.prevCursor),
        },
        ...mapEventsToEntries(eventsResult.items),
      ],
      emptyMessage: PAGE_COPY.fallback.noEvents,
    };
  } catch (error) {
    return {
      id: "section-events",
      title: PAGE_COPY.sections.events.title,
      description: PAGE_COPY.sections.events.description,
      badge: {
        label: PAGE_COPY.status.unknown,
        tone: "negative",
      },
      entries: [],
      emptyMessage: error?.message || PAGE_COPY.fallback.fetchFailed,
    };
  }
};

const createDojosSection = async () => {
  try {
    const dojosResult = await listDojos({
      direction: "next",
      limit: APP_CONFIG.previewLimit,
    });

    return {
      id: "section-dojos",
      title: "Dojos Preview",
      description: "Preview data master dojo menggunakan cursor pagination.",
      badge: {
        label: String(dojosResult.items.length),
        tone: "neutral",
      },
      entries: [
        {
          id: "dojos-entry-count",
          label: PAGE_COPY.labels.itemCount,
          value: String(dojosResult.items.length),
        },
        {
          id: "dojos-entry-direction",
          label: PAGE_COPY.labels.direction,
          value: formatText(dojosResult.meta.direction),
        },
        {
          id: "dojos-entry-next-cursor",
          label: PAGE_COPY.labels.nextCursor,
          value: formatText(dojosResult.meta.nextCursor),
        },
        {
          id: "dojos-entry-prev-cursor",
          label: PAGE_COPY.labels.prevCursor,
          value: formatText(dojosResult.meta.prevCursor),
        },
        ...mapDojosToEntries(dojosResult.items),
      ],
      emptyMessage: PAGE_COPY.fallback.noDojos,
    };
  } catch (error) {
    return {
      id: "section-dojos",
      title: "Dojos Preview",
      description: "Preview data master dojo menggunakan cursor pagination.",
      badge: {
        label: PAGE_COPY.status.unknown,
        tone: "negative",
      },
      entries: [],
      emptyMessage: error?.message || PAGE_COPY.fallback.fetchFailed,
    };
  }
};

const createEndpointSection = () => {
  const endpointEntries = PAGE_COPY.endpointRegistry.map((item) => {
    return {
      id: item.id,
      label: `${item.method} ${item.path}`,
      value: item.purpose,
    };
  });

  return {
    id: "section-endpoints",
    title: PAGE_COPY.sections.endpoints.title,
    description: PAGE_COPY.sections.endpoints.description,
    badge: {
      label: String(endpointEntries.length),
      tone: "positive",
    },
    entries: endpointEntries,
    emptyMessage: PAGE_COPY.fallback.noEndpointData,
  };
};

export const getHomePageData = async () => {
  const [healthSection, usersSection, eventsSection, dojosSection] = await Promise.all([
    createHealthSection(),
    createUsersSection(),
    createEventsSection(),
    createDojosSection(),
  ]);

  return {
    navigation: PAGE_COPY.navigation,
    hero: {
      title: PAGE_COPY.hero.title,
      subtitle: PAGE_COPY.hero.subtitle,
      note: PAGE_COPY.hero.note,
      actions: PAGE_COPY.hero.actions,
    },
    metaRows: createMetaRows(),
    sections: [
      healthSection,
      usersSection,
      eventsSection,
      dojosSection,
      createEndpointSection(),
    ],
  };
};