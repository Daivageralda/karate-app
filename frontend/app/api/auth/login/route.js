import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendUrl = () => {
  return new URL(API_ENDPOINTS.authLogin, ENV.apiBaseUrl).toString();
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

export async function POST(request) {
  const bodyText = await request.text();

  const backendResponse = await fetch(buildBackendUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyText,
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}
