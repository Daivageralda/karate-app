import { PAGE_COPY } from "@/shared/config/content";
import { getDojoEventDetail } from "@/features/dojo-dashboard/service";

export const getDojoEventDetailPageData = async (eventId) => {
  try {
    const event = await getDojoEventDetail(eventId);
    return {
      navigation: PAGE_COPY.navigationByRole("dojo_admin"),
      event,
    };
  } catch (error) {
    console.error("Error fetching event detail:", error);
    return {
      navigation: PAGE_COPY.navigationByRole("dojo_admin"),
      event: null,
    };
  }
};
