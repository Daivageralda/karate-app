import { notFound } from "next/navigation";

import { listDojos } from "@/features/dojos/service";
import { EditUserPage } from "@/features/users/edit-user-page";
import { getUserById } from "@/features/users/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default async function UsersEditPageRoute({ params }) {
  const { id } = await params;

  try {
    const [user, dojoResult] = await Promise.all([
      getUserById(id),
      listDojos({ direction: "next", limit: 100 }).catch(() => ({ items: [] })),
    ]);

    if (!user?.id) {
      notFound();
    }

    return <EditUserPage navigation={PAGE_COPY.navigation} user={user} dojoOptions={dojoResult.items} />;
  } catch {
    notFound();
  }
}
