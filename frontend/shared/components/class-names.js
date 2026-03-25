export const APP_CLASS_NAMES = Object.freeze({
  page: "min-h-screen bg-app-bg text-app-text-primary",
  shellRoot: "flex min-h-screen flex-col",
  shellHeader:
    "border-b border-app-border bg-[color:color-mix(in_srgb,var(--app-color-surface)_92%,transparent)] backdrop-blur-sm",
  shellHeaderInner:
    "flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8",
  shellHeaderLeft: "flex items-center gap-3",
  shellHeaderRight: "flex items-center gap-2",
  shellViewport: "relative flex min-h-0 flex-1",
  sidebarOverlay:
    "fixed inset-0 z-30 bg-[color:color-mix(in_srgb,var(--app-color-text-primary)_24%,transparent)] backdrop-blur-[1px] lg:hidden",
  sidebar:
    "fixed inset-y-0 left-0 z-40 w-72 border-r border-app-border bg-app-surface px-4 py-5 shadow-xl transition-transform duration-200 ease-out lg:static lg:z-0 lg:shadow-none",
  sidebarDesktopExpanded: "lg:translate-x-0 lg:w-72",
  sidebarDesktopCollapsed: "lg:-translate-x-full lg:w-0 lg:border-r-0 lg:p-0 lg:opacity-0 lg:overflow-hidden",
  sidebarMobileOpen: "translate-x-0",
  sidebarMobileClosed: "-translate-x-full lg:translate-x-0",
  sidebarInner: "flex h-full flex-col gap-6",
  sidebarTop: "flex items-center justify-between gap-3",
  sidebarBrand: "font-display text-lg font-semibold tracking-tight text-app-text-primary",
  sidebarNav: "flex flex-col",
  sidebarNavItem: "w-full",
  sidebarLink:
    "flex w-full items-center rounded-xl border border-transparent px-4 py-2.5 text-sm leading-5 font-medium text-app-text-secondary transition hover:border-app-border hover:bg-app-surface-muted hover:text-app-text-primary",
  sidebarLinkActive:
    "border-app-border bg-app-surface-muted text-app-text-primary shadow-sm",
  sidebarFooter:
    "mt-auto rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4 text-sm text-app-text-secondary",
  wrapper: "flex-1 overflow-y-auto",
  pageContent: "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8",
  brand: "font-display text-xl font-semibold tracking-tight text-app-text-primary",
  iconButton:
    "inline-flex h-11 w-11 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-text-primary transition hover:border-app-accent hover:text-app-accent",
  iconButtonMuted:
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-surface-muted text-app-text-secondary transition hover:border-app-accent hover:text-app-accent",
  heroCard: "rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-8",
  heroTitle: "font-display text-3xl font-semibold tracking-tight sm:text-4xl",
  heroSubtitle: "mt-3 max-w-3xl text-sm leading-relaxed text-app-text-secondary sm:text-base",
  heroNote: "mt-3 text-sm font-medium text-app-text-primary",
  actionGroup: "mt-6 flex flex-wrap gap-3",
  actionLink:
    "inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90",
  secondaryActionLink:
    "inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent",
  metaGrid: "mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
  metaItem: "rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3",
  metaLabel: "text-xs uppercase tracking-wide text-app-text-secondary",
  metaValue: "mt-1 block break-all text-sm font-semibold text-app-text-primary",
  sectionGrid: "grid gap-4 lg:grid-cols-2",
  sectionCard:
    "flex h-full flex-col rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm",
  sectionHeader: "flex flex-wrap items-start justify-between gap-3",
  sectionTitle: "font-display text-xl font-semibold tracking-tight text-app-text-primary",
  sectionDescription: "mt-2 text-sm leading-relaxed text-app-text-secondary",
  sectionBody: "mt-4",
  detailList: "grid gap-3",
  detailItem: "grid gap-1 rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3",
  detailLabel: "text-xs uppercase tracking-wide text-app-text-secondary",
  detailValue: "break-words text-sm font-medium text-app-text-primary",
  emptyState:
    "rounded-2xl border border-dashed border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text-secondary",
  tableShell: "overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-sm",
  tableHeader: "border-b border-app-border px-6 py-5",
  tableTitle: "font-display text-2xl font-semibold tracking-tight text-app-text-primary",
  tableSubtitle: "mt-2 max-w-3xl text-sm leading-relaxed text-app-text-secondary",
  tableMetaGrid: "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
  tableMetaItem: "rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3",
  tableWrap: "overflow-x-auto",
  table: "min-w-full border-separate border-spacing-0",
  tableHead: "bg-app-surface-muted",
  tableHeadCell:
    "border-b border-app-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-text-secondary",
  tableRow: "bg-app-surface",
  tableBodyCell:
    "border-b border-app-border px-4 py-4 align-top text-sm text-app-text-primary",
  tableBodyCellMuted: "text-app-text-secondary",
  tableEmpty: "px-6 py-12 text-center text-sm text-app-text-secondary",
  pager: "flex flex-wrap items-center justify-between gap-3 border-t border-app-border px-6 py-5",
  pagerGroup: "flex flex-wrap items-center gap-3",
  pagerLink:
    "inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent",
  pagerLinkDisabled:
    "inline-flex cursor-not-allowed items-center justify-center rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-secondary",
  statusPillBase:
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
  srOnly:
    "sr-only",
});

export const STATUS_TONE_CLASS_NAMES = Object.freeze({
  positive: "border-app-accent bg-app-accent text-app-accent-contrast",
  neutral: "border-app-border bg-app-surface-muted text-app-text-secondary",
  negative: "border-app-danger bg-app-danger text-app-danger-contrast",
});