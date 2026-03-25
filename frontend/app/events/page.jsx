import { EventsPage } from "@/features/events/events-page";
import { getEventsPageData } from "@/features/events/page-data";

export const dynamic = "force-dynamic";

export default async function EventsPageRoute({ searchParams }) {
  const pageData = await getEventsPageData({ searchParams });

  return <EventsPage pageData={pageData} />;
}