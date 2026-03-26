import { KelasTandingPage } from "@/features/kelas-tanding/kelas-tanding-page";
import { getKelasTandingPageData } from "@/features/kelas-tanding/page-data";

export const dynamic = "force-dynamic";

export default async function KelasTandingPageRoute({ searchParams }) {
  const pageData = await getKelasTandingPageData({ searchParams });

  return <KelasTandingPage pageData={pageData} />;
}
