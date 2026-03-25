import { CreateEventPage } from "@/features/events/create-event-page";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default function EventsCreatePageRoute() {
  return <CreateEventPage navigation={PAGE_COPY.navigation} />;
}
