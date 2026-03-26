import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendEventKelasTandingUrl = (id) => {
  return new URL(`${API_ENDPOINTS.eventById(id)}/kelas-tanding`, ENV.apiBaseUrl).toString();
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
  const { id } = await context.params;

  const backendResponse = await fetch(buildBackendEventKelasTandingUrl(id), {
    method: "GET",
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}

export async function POST(request, context) {
  const { id } = await context.params;
  const payload = await request.text();

  const backendResponse = await fetch(buildBackendEventKelasTandingUrl(id), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: payload,
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
