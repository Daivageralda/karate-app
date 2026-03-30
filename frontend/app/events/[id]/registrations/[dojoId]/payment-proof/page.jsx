import { notFound } from "next/navigation";

import { EventRegistrationPaymentProofPage } from "@/features/events/event-registration-payment-proof-page";
import { getEventById } from "@/features/events/service";
import { PAGE_COPY } from "@/shared/config/content";

export const dynamic = "force-dynamic";

const resolveReturnTab = async (searchParams) => {
  const resolvedSearchParams = (await searchParams) || {};
  const rawReturnTab = typeof resolvedSearchParams.return_tab === "string"
    ? resolvedSearchParams.return_tab
    : Array.isArray(resolvedSearchParams.return_tab)
      ? resolvedSearchParams.return_tab[0]
      : "";

  const allowedTabs = ["athletes", "payment", "recommendation"];
  return allowedTabs.includes(rawReturnTab) ? rawReturnTab : "athletes";
};

export default async function EventRegistrationDojoPaymentProofRoute({ params, searchParams }) {
  const { id, dojoId } = await params;

  if (!id || !dojoId) {
    notFound();
  }

  try {
    const event = await getEventById(id);
    const returnTab = await resolveReturnTab(searchParams);
    if (!event?.id) {
      notFound();
    }

    return (
      <EventRegistrationPaymentProofPage
        navigation={PAGE_COPY.navigation}
        event={event}
        dojoId={dojoId}
        returnTab={returnTab}
      />
    );
  } catch {
    notFound();
  }
}
