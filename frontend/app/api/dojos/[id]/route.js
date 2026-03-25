import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendDojoUrl = (id) => {
  return new URL(API_ENDPOINTS.dojoById(id), ENV.apiBaseUrl).toString();
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
  const { id } = await context.params;
  const formData = await request.formData();

  const backendResponse = await fetch(buildBackendDojoUrl(id), {
    method: "PUT",
    body: formData,
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}

export async function DELETE(_request, context) {
  const { id } = await context.params;

  const backendResponse = await fetch(buildBackendDojoUrl(id), {
    method: "DELETE",
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
