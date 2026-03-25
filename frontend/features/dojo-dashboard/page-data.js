import { PAGE_COPY } from "@/shared/config/content";
import { listDojoEvents } from "@/features/dojo-dashboard/service";

export const getDojoDashboardPageData = async () => {
  try {
    const eventsResult = await listDojoEvents({
      direction: "next",
      limit: 20,
    });

    return {
      navigation: PAGE_COPY.navigationByRole("dojo_admin"),
      events: eventsResult?.items || [],
    };
  } catch (error) {
    console.error("Error fetching dojo dashboard data:", error);
    return {
      navigation: PAGE_COPY.navigationByRole("dojo_admin"),
      events: [],
    };
  }
};
