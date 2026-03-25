import { DojoDashboardPage } from "@/features/dojo-dashboard/dojo-dashboard-page";
import { getDojoDashboardPageData } from "@/features/dojo-dashboard/page-data";

export const dynamic = "force-dynamic";

export default async function DojoDashboardPageRoute() {
  const pageData = await getDojoDashboardPageData();

  return <DojoDashboardPage navigation={pageData.navigation} events={pageData.events} />;
}
