import { notFound } from "next/navigation";

import { UserDetailPage } from "@/features/users/user-detail-page";
import { getUserById } from "@/features/users/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default async function UserDetailPageRoute({ params }) {
  const { id } = await params;

  try {
    const user = await getUserById(id);
    if (!user?.id) {
      notFound();
    }

    return <UserDetailPage navigation={PAGE_COPY.navigation} user={user} />;
  } catch {
    notFound();
  }
}
