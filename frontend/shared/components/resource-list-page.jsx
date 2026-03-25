import Link from "next/link";

import { APP_CLASS_NAMES } from "@/shared/components/class-names";
import { SiteShell } from "@/shared/components/site-shell";
import { StatusPill } from "@/shared/components/status-pill";

const PagerLink = ({ item }) => {
  if (item.disabled) {
    return <span className={APP_CLASS_NAMES.pagerLinkDisabled}>{item.label}</span>;
  }

  return (
    <Link href={item.href} className={APP_CLASS_NAMES.pagerLink}>
      {item.label}
    </Link>
  );
};

export function ResourceListPage({ pageData, topSection = null, hidePageHeading = false }) {
  const hasSummaryCards = Array.isArray(pageData.summaryCards) && pageData.summaryCards.length > 0;
  const shouldRenderHeader = !hidePageHeading || hasSummaryCards;
  const shouldMuteFirstColumn = pageData?.table?.muteFirstColumn !== false;

  return (
    <SiteShell navigation={pageData.navigation}>
      {topSection}

      <section className={APP_CLASS_NAMES.tableShell}>
        {shouldRenderHeader ? (
          <header className={APP_CLASS_NAMES.tableHeader}>
            {hidePageHeading ? null : (
              <div className={APP_CLASS_NAMES.sectionHeader}>
                <div>
                  <h1 className={APP_CLASS_NAMES.tableTitle}>{pageData.page.title}</h1>
                  <p className={APP_CLASS_NAMES.tableSubtitle}>{pageData.page.description}</p>
                </div>
                <StatusPill label={pageData.badge.label} tone={pageData.badge.tone} />
              </div>
            )}

            {hasSummaryCards ? (
              <div className={APP_CLASS_NAMES.tableMetaGrid}>
                {pageData.summaryCards.map((summaryCard) => {
                  return (
                    <div key={summaryCard.id} className={APP_CLASS_NAMES.tableMetaItem}>
                      <span className={APP_CLASS_NAMES.metaLabel}>{summaryCard.label}</span>
                      <strong className={APP_CLASS_NAMES.metaValue}>{summaryCard.value}</strong>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </header>
        ) : null}

        <div className={APP_CLASS_NAMES.tableWrap}>
          <table className={APP_CLASS_NAMES.table}>
            <thead className={APP_CLASS_NAMES.tableHead}>
              <tr>
                {pageData.table.columns.map((column) => {
                  return (
                    <th key={column.id} className={APP_CLASS_NAMES.tableHeadCell}>
                      {column.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageData.table.rows.length > 0 ? (
                pageData.table.rows.map((row) => {
                  return (
                    <tr key={row.id} className={APP_CLASS_NAMES.tableRow}>
                      {row.cells.map((cell, index) => {
                        const cellClassName = index === 0 && shouldMuteFirstColumn
                          ? `${APP_CLASS_NAMES.tableBodyCell} ${APP_CLASS_NAMES.tableBodyCellMuted}`
                          : APP_CLASS_NAMES.tableBodyCell;

                        return (
                          <td key={`${row.id}-cell-${index}`} className={cellClassName}>
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={pageData.table.columns.length} className={APP_CLASS_NAMES.tableEmpty}>
                    {pageData.table.emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className={APP_CLASS_NAMES.pager}>
          <div className={APP_CLASS_NAMES.pagerGroup}>
            <PagerLink item={pageData.pager.previous} />
            <PagerLink item={pageData.pager.next} />
          </div>

          <div className={APP_CLASS_NAMES.pagerGroup}>
            <PagerLink item={pageData.pager.reset} />
          </div>
        </footer>
      </section>
    </SiteShell>
  );
}