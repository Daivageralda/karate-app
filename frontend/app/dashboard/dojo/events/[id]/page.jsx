import { DojoEventOverviewPage } from "@/features/dojo-dashboard/dojo-event-overview-page";
import { getDojoEventDetailPageData } from "@/features/dojo-dashboard/dojo-event-detail-page-data";

export const dynamic = "force-dynamic";

export default async function DojoEventDetailPageRoute({ params }) {
  const { id: eventId } = await params;
  const pageData = await getDojoEventDetailPageData(eventId);

  if (!pageData.event) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text-primary">
        <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4">
          <p>Event not found</p>
        </main>
      </div>
    );
  }

  return <DojoEventOverviewPage navigation={pageData.navigation} event={pageData.event} />;
}
