import {
  APP_CLASS_NAMES,
  STATUS_TONE_CLASS_NAMES,
} from "@/shared/components/class-names";

const resolveToneClassName = (tone) => {
  if (typeof tone !== "string") {
    return STATUS_TONE_CLASS_NAMES.neutral;
  }

  return STATUS_TONE_CLASS_NAMES[tone] || STATUS_TONE_CLASS_NAMES.neutral;
};

export function StatusPill({ label, tone }) {
  return (
    <span className={`${APP_CLASS_NAMES.statusPillBase} ${resolveToneClassName(tone)}`}>
      {label}
    </span>
  );
}