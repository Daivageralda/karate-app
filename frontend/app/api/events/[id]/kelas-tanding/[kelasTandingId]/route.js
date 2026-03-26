import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendEventKelasTandingItemUrl = (id, kelasTandingId) => {
  return new URL(`${API_ENDPOINTS.eventById(id)}/kelas-tanding/${kelasTandingId}`, ENV.apiBaseUrl).toString();
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
  const { id, kelasTandingId } = await context.params;

  const backendResponse = await fetch(buildBackendEventKelasTandingItemUrl(id, kelasTandingId), {
    method: "DELETE",
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
