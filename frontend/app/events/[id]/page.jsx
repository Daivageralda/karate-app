import { notFound } from "next/navigation";

import { EventDetailPage } from "@/features/events/event-detail-page";
import { getEventById } from "@/features/events/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default async function EventDetailRoute({ params }) {
  const { id } = await params;

  try {
    const event = await getEventById(id);
    if (!event?.id) {
      notFound();
    }

    return <EventDetailPage navigation={PAGE_COPY.navigation} event={event} />;
  } catch {
    notFound();
  }
}
