import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendParticipantsUploadUrl = (id, dojoId) => {
  return new URL(`${API_ENDPOINTS.eventById(id)}/dojos/${dojoId}/participants/upload`, ENV.apiBaseUrl).toString();
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
  const { id, dojoId } = await context.params;
  const formData = await request.formData();

  const backendResponse = await fetch(buildBackendParticipantsUploadUrl(id, dojoId), {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
