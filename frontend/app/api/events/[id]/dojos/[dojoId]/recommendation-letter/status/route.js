import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendUrl = (id, dojoId) => {
  return new URL(
    `${API_ENDPOINTS.eventById(id)}/dojos/${dojoId}/recommendation-letter/status`,
    ENV.apiBaseUrl,
  ).toString();
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

export async function PUT(request, context) {
  const { id, dojoId } = await context.params;

  const rawBody = await request.text();

  const backendResponse = await fetch(buildBackendUrl(id, dojoId), {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: rawBody,
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
