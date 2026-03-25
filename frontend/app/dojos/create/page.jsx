import { CreateDojoPage } from "@/features/dojos/create-dojo-page";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

export default function DojosCreatePageRoute() {
  return <CreateDojoPage navigation={PAGE_COPY.navigation} />;
}
