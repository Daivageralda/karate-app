import { DojosPage } from "@/features/dojos/dojos-page";
import { getDojosPageData } from "@/features/dojos/page-data";

export const dynamic = "force-dynamic";

export default async function DojosPageRoute({ searchParams }) {
  const pageData = await getDojosPageData({ searchParams });

  return <DojosPage pageData={pageData} />;
}
