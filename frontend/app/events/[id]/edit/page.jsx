import { notFound } from "next/navigation";

import { EditEventPage } from "@/features/events/edit-event-page";
import { getEventById } from "@/features/events/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default async function EventsEditPageRoute({ params }) {
  const { id } = await params;

  try {
    const event = await getEventById(id);
    if (!event?.id) {
      notFound();
    }

    return <EditEventPage navigation={PAGE_COPY.navigation} event={event} />;
  } catch {
    notFound();
  }
}
