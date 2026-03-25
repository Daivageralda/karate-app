import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendParticipantUrl = (id, dojoId, participantId) => {
  return new URL(`${API_ENDPOINTS.eventById(id)}/dojos/${dojoId}/participants/${participantId}`, ENV.apiBaseUrl).toString();
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

export async function DELETE(_request, context) {
  const { id, dojoId, participantId } = await context.params;

  const backendResponse = await fetch(buildBackendParticipantUrl(id, dojoId, participantId), {
    method: "DELETE",
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
