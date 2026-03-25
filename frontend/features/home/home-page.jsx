import Link from "next/link";

import { ResourceCard } from "@/shared/components/resource-card";
import { APP_CLASS_NAMES } from "@/shared/components/class-names";
import { SiteShell } from "@/shared/components/site-shell";

export function HomePage({ pageData }) {
  return (
    <SiteShell navigation={pageData.navigation}>
      <section className={APP_CLASS_NAMES.heroCard}>
        <h1 className={APP_CLASS_NAMES.heroTitle}>{pageData.hero.title}</h1>
        <p className={APP_CLASS_NAMES.heroSubtitle}>{pageData.hero.subtitle}</p>
        <p className={APP_CLASS_NAMES.heroNote}>{pageData.hero.note}</p>

        <div className={APP_CLASS_NAMES.actionGroup}>
          {pageData.hero.actions.map((action, index) => {
            const linkClassName = index === 0
              ? APP_CLASS_NAMES.actionLink
              : APP_CLASS_NAMES.secondaryActionLink;

            return (
              <Link key={action.id} href={action.href} className={linkClassName}>
                {action.label}
              </Link>
            );
          })}
        </div>

        <div className={APP_CLASS_NAMES.metaGrid}>
          {pageData.metaRows.map((metaRow) => {
            return (
              <div key={metaRow.id} className={APP_CLASS_NAMES.metaItem}>
                <span className={APP_CLASS_NAMES.metaLabel}>{metaRow.label}</span>
                <strong className={APP_CLASS_NAMES.metaValue}>{metaRow.value}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className={APP_CLASS_NAMES.sectionGrid}>
        {pageData.sections.map((section) => {
          return <ResourceCard key={section.id} section={section} />;
        })}
      </section>
    </SiteShell>
  );
}