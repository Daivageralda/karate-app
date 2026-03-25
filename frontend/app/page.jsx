import { HomePage } from "@/features/home/home-page";
import { getHomePageData } from "@/features/home/page-data";

export const dynamic = "force-dynamic";

export default async function HomePageRoute() {
  const pageData = await getHomePageData();

  return <HomePage pageData={pageData} />;
}