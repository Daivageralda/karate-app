import { notFound } from "next/navigation";

import { EventRegistrationDojoDetailPage } from "@/features/events/event-registration-dojo-detail-page";
import { getEventById } from "@/features/events/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

const resolveInitialActiveTab = async (searchParams) => {
  const resolvedSearchParams = (await searchParams) || {};
  const rawActiveTab = typeof resolvedSearchParams.active_tab === "string"
    ? resolvedSearchParams.active_tab
    : Array.isArray(resolvedSearchParams.active_tab)
      ? resolvedSearchParams.active_tab[0]
      : "";

  const allowedTabs = ["athletes", "payment", "recommendation"];
  return allowedTabs.includes(rawActiveTab) ? rawActiveTab : "athletes";
};

export default async function EventRegistrationDojoDetailRoute({ params, searchParams }) {
  const { id, dojoId } = await params;

  if (!id || !dojoId) {
    notFound();
  }

  try {
    const event = await getEventById(id);
    const initialActiveTab = await resolveInitialActiveTab(searchParams);
    if (!event?.id) {
      notFound();
    }

    return (
      <EventRegistrationDojoDetailPage
        navigation={PAGE_COPY.navigation}
        event={event}
        dojoId={dojoId}
        initialActiveTab={initialActiveTab}
      />
    );
  } catch {
    notFound();
  }
}
