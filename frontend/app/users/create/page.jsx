import { CreateUserPage } from "@/features/users/create-user-page";
import { listDojos } from "@/features/dojos/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default async function UsersCreatePageRoute() {
  let dojoOptions = [];

  try {
    const dojoResult = await listDojos({ direction: "next", limit: 100 });
    dojoOptions = dojoResult.items;
  } catch {
    dojoOptions = [];
  }

  return <CreateUserPage navigation={PAGE_COPY.navigation} dojoOptions={dojoOptions} />;
}
