import { notFound } from "next/navigation";

import { KelasTandingDetailPage } from "@/features/kelas-tanding/kelas-tanding-detail-page";
import { getKelasTandingById } from "@/features/kelas-tanding/service";

export const dynamic = "force-dynamic";

export default async function KelasTandingDetailPageRoute({ params }) {
  const { id } = await params;

  try {
    const item = await getKelasTandingById(id);
    if (!item?.id) {
      notFound();
    }

    return <KelasTandingDetailPage item={item} />;
  } catch {
    notFound();
  }
}
