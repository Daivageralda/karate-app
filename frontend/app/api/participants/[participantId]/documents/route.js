import { ENV } from "@/shared/config/env";

const API_VERSION_PREFIX = "/api/v1";

const buildBackendParticipantDocumentsUrl = (participantId) => {
  return new URL(`${API_VERSION_PREFIX}/participants/${participantId}/documents`, ENV.apiBaseUrl).toString();
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

export async function POST(request, context) {
  const { participantId } = await context.params;
  const formData = await request.formData();

  const backendResponse = await fetch(buildBackendParticipantDocumentsUrl(participantId), {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
