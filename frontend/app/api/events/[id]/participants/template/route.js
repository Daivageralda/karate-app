import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendTemplateUrl = (id) => {
  return new URL(`${API_ENDPOINTS.eventById(id)}/participants/template`, ENV.apiBaseUrl).toString();
};

export async function GET(_request, context) {
  const { id } = await context.params;

  const backendResponse = await fetch(buildBackendTemplateUrl(id), {
    method: "GET",
    cache: "no-store",
  });

  const payload = await backendResponse.arrayBuffer();
  const contentType = backendResponse.headers.get("content-type") || "application/octet-stream";
  const contentDisposition = backendResponse.headers.get("content-disposition") || "attachment; filename=peserta-template.xlsx";

  return new Response(payload, {
    status: backendResponse.status,
    headers: {
      "content-type": contentType,
      "content-disposition": contentDisposition,
    },
  });
}
