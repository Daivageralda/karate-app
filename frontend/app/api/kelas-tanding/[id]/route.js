import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendUrl = (id) => {
  return new URL(API_ENDPOINTS.kelasTandingById(id), ENV.apiBaseUrl).toString();
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

  const backendResponse = await fetch(buildBackendUrl(id), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}

export async function PUT(request, context) {
  const { id } = await context.params;
  const bodyText = await request.text();

  const backendResponse = await fetch(buildBackendUrl(id), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyText,
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}

export async function DELETE(_request, context) {
  const { id } = await context.params;

  const backendResponse = await fetch(buildBackendUrl(id), {
    method: "DELETE",
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
