import { APP_CONFIG } from "@/shared/config/app";
import { PAGE_COPY } from "@/shared/config/content";

const dateTimeFormatter = new Intl.DateTimeFormat(APP_CONFIG.locale, {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatDateTime = (value) => {
  if (typeof value !== "string" || value.length === 0) {
    return PAGE_COPY.fallback.notAvailable;
  }

  const dateObject = new Date(value);

  if (Number.isNaN(dateObject.getTime())) {
    return PAGE_COPY.fallback.notAvailable;
  }

  return dateTimeFormatter.format(dateObject);
};

export const formatText = (value) => {
  if (typeof value !== "string" || value.length === 0) {
    return PAGE_COPY.fallback.notAvailable;
  }

  return value;
};