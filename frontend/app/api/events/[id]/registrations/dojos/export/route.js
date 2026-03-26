import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendRegistrationDojosExportUrl = (id) => {
  return new URL(`${API_ENDPOINTS.eventById(id)}/registrations/dojos/export`, ENV.apiBaseUrl).toString();
};

const buildResponse = async (backendResponse) => {
  const payload = await backendResponse.arrayBuffer();
  const contentType = backendResponse.headers.get("content-type") || "application/octet-stream";
  const contentDisposition = backendResponse.headers.get("content-disposition") || "attachment; filename=pendaftaran-dojo.xlsx";

  return new Response(payload, {
    status: backendResponse.status,
    headers: {
      "content-type": contentType,
      "content-disposition": contentDisposition,
    },
  });
};

export async function GET(_request, context) {
  const { id } = await context.params;

  const backendResponse = await fetch(buildBackendRegistrationDojosExportUrl(id), {
    method: "GET",
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
