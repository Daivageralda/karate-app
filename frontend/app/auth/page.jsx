import { AuthPage } from "@/features/auth/auth-page";
import { listDojos } from "@/features/dojos/service";

export const dynamic = "force-dynamic";

export default async function AuthPageRoute() {
  let dojoOptions = [];

  try {
    const dojosResult = await listDojos({ direction: "next", limit: 100 });
    dojoOptions = dojosResult.items;
  } catch {
    dojoOptions = [];
  }

  return <AuthPage dojoOptions={dojoOptions} />;
}
