import { UsersPage } from "@/features/users/users-page";
import { getUsersPageData } from "@/features/users/page-data";

export const dynamic = "force-dynamic";

export default async function UsersPageRoute({ searchParams }) {
  const pageData = await getUsersPageData({ searchParams });

  return <UsersPage pageData={pageData} />;
}