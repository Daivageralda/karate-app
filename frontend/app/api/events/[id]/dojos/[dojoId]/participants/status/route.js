import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendParticipantsStatusUrl = (id, dojoId) => {
  return new URL(`${API_ENDPOINTS.eventById(id)}/dojos/${dojoId}/participants/status`, ENV.apiBaseUrl).toString();
};

const buildResponse = async (backendResponse) => {
  const payload = await backendResponse.text();
  const contentType = backendResponse.headers.get("content-type") || "application/json";

  return new Response(payload, {
    status: backendResponse.status,
    headers: {
      "content-type": contentType,
    },
  });
};

export async function GET(_request, context) {
  const { id, dojoId } = await context.params;

  const backendResponse = await fetch(buildBackendParticipantsStatusUrl(id, dojoId), {
    method: "GET",
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
