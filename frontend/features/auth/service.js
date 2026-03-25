const parseEnvelopeResponse = async (response, fallbackErrorMessage) => {
  const responseText = await response.text();
  let envelope = null;

  if (responseText) {
    try {
      envelope = JSON.parse(responseText);
    } catch {
      envelope = {
        message: fallbackErrorMessage,
        data: null,
      };
    }
  }

  if (!response.ok) {
    const message = typeof envelope?.message === "string"
      ? envelope.message
      : fallbackErrorMessage;

    throw new Error(message);
  }

  return envelope;
};

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value;
};

const normalizeUser = (rawValue = {}) => {
  return {
    id: normalizeText(rawValue.uuid || rawValue.id),
    name: normalizeText(rawValue.name),
    email: normalizeText(rawValue.email),
    role: normalizeText(rawValue.role),
    dojoName: normalizeText(rawValue.dojo_name),
    dojoId: rawValue.dojo_id || "",
    isActive: Boolean(rawValue.is_active),
    isVerified: Boolean(rawValue.is_verified),
    createdAt: normalizeText(rawValue.created_at),
    updatedAt: normalizeText(rawValue.updated_at),
    lastLogin: normalizeText(rawValue.last_login),
  };
};

export const registerAuthUser = async (payload) => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to register");
  return normalizeUser(envelope?.data);
};

export const loginAuthUser = async (payload) => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const envelope = await parseEnvelopeResponse(response, "Failed to login");
  return normalizeUser(envelope?.data?.user);
};
