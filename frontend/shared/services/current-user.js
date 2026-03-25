// Service to manage current user state and role
// Uses localStorage to persist state since no session is required

const CURRENT_USER_KEY = "eo-karate-current-user";

const normalizeUser = (rawValue = {}) => {
  const resolvedDojo = rawValue.dojo && typeof rawValue.dojo === "object"
    ? rawValue.dojo
    : null;

  return {
    id: rawValue.uuid || rawValue.id || "",
    name: rawValue.name || "",
    email: rawValue.email || "",
    role: rawValue.role || "",
    dojoId: rawValue.dojoId || rawValue.dojo_id || resolvedDojo?.uuid || resolvedDojo?.id || "",
    dojoName: rawValue.dojoName || rawValue.dojo_name || resolvedDojo?.name || "",
    isActive: Boolean(rawValue.is_active),
    isVerified: Boolean(rawValue.is_verified),
    createdAt: rawValue.created_at || "",
    updatedAt: rawValue.updated_at || "",
    lastLogin: rawValue.last_login || "",
  };
};

export const setCurrentUser = (user) => {
  if (!user || !user.id) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }

  const normalizedUser = normalizeUser(user);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizedUser));
};

export const getCurrentUser = () => {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) {
      return null;
    }

    const parsedUser = JSON.parse(stored);
    const normalizedUser = normalizeUser(parsedUser);

    // Keep storage shape consistent if previous sessions stored snake_case or partial user data.
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizedUser));

    return normalizedUser;
  } catch {
    return null;
  }
};

export const clearCurrentUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUserRole = () => {
  const user = getCurrentUser();
  return user?.role || null;
};

export const isUserLoggedIn = () => {
  return getCurrentUser() !== null;
};

export const isSuperAdmin = () => {
  return getCurrentUserRole() === "super_admin";
};

export const isDojoAdmin = () => {
  return getCurrentUserRole() === "dojo_admin";
};
