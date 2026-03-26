import { API_ENDPOINTS } from "@/shared/config/api";
import { ENV } from "@/shared/config/env";

const buildBackendUrl = () => {
  return new URL(API_ENDPOINTS.kelasTanding, ENV.apiBaseUrl).toString();
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const backendUrl = new URL(API_ENDPOINTS.kelasTanding, ENV.apiBaseUrl);

  for (const [key, value] of searchParams.entries()) {
    backendUrl.searchParams.set(key, value);
  }

  const backendResponse = await fetch(backendUrl.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  return buildResponse(backendResponse);
}

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
