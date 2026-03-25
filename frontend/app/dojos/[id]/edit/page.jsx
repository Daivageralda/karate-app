import { notFound } from "next/navigation";

import { EditDojoPage } from "@/features/dojos/edit-dojo-page";
import { getDojoById } from "@/features/dojos/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default async function DojosEditPageRoute({ params }) {
  const { id } = await params;

  try {
    const dojo = await getDojoById(id);
    if (!dojo?.id) {
      notFound();
    }

    return <EditDojoPage navigation={PAGE_COPY.navigation} dojo={dojo} />;
  } catch {
    notFound();
  }
}
