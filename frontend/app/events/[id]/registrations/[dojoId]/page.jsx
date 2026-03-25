import { notFound } from "next/navigation";

import { EventRegistrationDojoDetailPage } from "@/features/events/event-registration-dojo-detail-page";
import { getEventById } from "@/features/events/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default async function EventRegistrationDojoDetailRoute({ params }) {
  const { id, dojoId } = await params;

  if (!id || !dojoId) {
    notFound();
  }

  try {
    const event = await getEventById(id);
    if (!event?.id) {
      notFound();
    }

    return (
      <EventRegistrationDojoDetailPage
        navigation={PAGE_COPY.navigation}
        event={event}
        dojoId={dojoId}
      />
    );
  } catch {
    notFound();
  }
}
