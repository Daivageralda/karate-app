import { API_ENDPOINTS } from "@/shared/config/api";
import { apiClient } from "@/shared/services/api-client";

export const getHealthStatus = async () => {
  const envelope = await apiClient.get(API_ENDPOINTS.health);

  return {
    healthy: Boolean(envelope?.data?.healthy),
  };
};