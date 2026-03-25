const API_VERSION_PREFIX = "/api/v1";

const RESOURCE_PATHS = Object.freeze({
  health: "/health",
  authLogin: "/auth/login",
  authRegister: "/auth/register",
  users: "/users",
  dojos: "/dojos",
  events: "/events",
});

export const API_ENDPOINTS = Object.freeze({
  health: `${API_VERSION_PREFIX}${RESOURCE_PATHS.health}`,
  authLogin: `${API_VERSION_PREFIX}${RESOURCE_PATHS.authLogin}`,
  authRegister: `${API_VERSION_PREFIX}${RESOURCE_PATHS.authRegister}`,
  users: `${API_VERSION_PREFIX}${RESOURCE_PATHS.users}`,
  userById: (id) => `${API_VERSION_PREFIX}${RESOURCE_PATHS.users}/${id}`,
  dojos: `${API_VERSION_PREFIX}${RESOURCE_PATHS.dojos}`,
  dojoById: (id) => `${API_VERSION_PREFIX}${RESOURCE_PATHS.dojos}/${id}`,
  events: `${API_VERSION_PREFIX}${RESOURCE_PATHS.events}`,
  eventById: (id) => `${API_VERSION_PREFIX}${RESOURCE_PATHS.events}/${id}`,
});