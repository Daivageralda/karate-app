import { notFound } from "next/navigation";

import { DojoDetailPage } from "@/features/dojos/dojo-detail-page";
import { getDojoById } from "@/features/dojos/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default async function DojoDetailPageRoute({ params }) {
  const { id } = await params;

  try {
    const dojo = await getDojoById(id);
    if (!dojo?.id) {
      notFound();
    }

    return <DojoDetailPage navigation={PAGE_COPY.navigation} dojo={dojo} />;
  } catch {
    notFound();
  }
}
