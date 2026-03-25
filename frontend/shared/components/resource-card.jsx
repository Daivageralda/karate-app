import { APP_CLASS_NAMES } from "@/shared/components/class-names";
import { StatusPill } from "@/shared/components/status-pill";

export function ResourceCard({ section }) {
  return (
    <article className={APP_CLASS_NAMES.sectionCard}>
      <header className={APP_CLASS_NAMES.sectionHeader}>
        <div>
          <h2 className={APP_CLASS_NAMES.sectionTitle}>{section.title}</h2>
          <p className={APP_CLASS_NAMES.sectionDescription}>{section.description}</p>
        </div>
        <StatusPill label={section.badge.label} tone={section.badge.tone} />
      </header>

      <div className={APP_CLASS_NAMES.sectionBody}>
        {section.entries.length > 0 ? (
          <dl className={APP_CLASS_NAMES.detailList}>
            {section.entries.map((entry) => {
              return (
                <div key={entry.id} className={APP_CLASS_NAMES.detailItem}>
                  <dt className={APP_CLASS_NAMES.detailLabel}>{entry.label}</dt>
                  <dd className={APP_CLASS_NAMES.detailValue}>{entry.value}</dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className={APP_CLASS_NAMES.emptyState}>{section.emptyMessage}</p>
        )}
      </div>
    </article>
  );
}