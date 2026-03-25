"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { APP_CLASS_NAMES } from "@/shared/components/class-names";
import { ROUTES } from "@/shared/config/routes";

const ToggleIcon = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5">
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M4 12h16" strokeLinecap="round" />
      <path d="M4 17h16" strokeLinecap="round" />
    </svg>
  );
};

const BellIcon = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5">
      <path d="M12 4a4 4 0 0 0-4 4v2.2c0 .7-.2 1.4-.6 2L6 14.5V16h12v-1.5l-1.4-2.3a3.8 3.8 0 0 1-.6-2V8a4 4 0 0 0-4-4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
};

const ProfileIcon = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5">
      <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export function SiteShell({ navigation, children }) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleSidebarToggle = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setIsDesktopSidebarCollapsed((previousValue) => !previousValue);
      return;
    }

    setIsMobileSidebarOpen((previousValue) => !previousValue);
  };

  const sidebarVisibilityClassName = isMobileSidebarOpen
    ? APP_CLASS_NAMES.sidebarMobileOpen
    : APP_CLASS_NAMES.sidebarMobileClosed;

  const sidebarDesktopClassName = isDesktopSidebarCollapsed
    ? APP_CLASS_NAMES.sidebarDesktopCollapsed
    : APP_CLASS_NAMES.sidebarDesktopExpanded;

  const navigationGroups = Array.isArray(navigation.groups)
    ? navigation.groups
    : [
        {
          id: "default-navigation-group",
          label: "",
          items: Array.isArray(navigation.items) ? navigation.items : [],
        },
      ];

  return (
    <div className={APP_CLASS_NAMES.page}>
      <div className={APP_CLASS_NAMES.shellRoot}>
        <header className={APP_CLASS_NAMES.shellHeader}>
          <div className={APP_CLASS_NAMES.shellHeaderInner}>
            <div className={APP_CLASS_NAMES.shellHeaderLeft}>
              <button
                type="button"
                className={APP_CLASS_NAMES.iconButton}
                onClick={handleSidebarToggle}
                aria-label={isMobileSidebarOpen ? navigation.ariaLabels.closeSidebar : navigation.ariaLabels.openSidebar}
                aria-expanded={isMobileSidebarOpen === true || isDesktopSidebarCollapsed === false}
                aria-controls="primary-sidebar"
              >
                <ToggleIcon />
              </button>

              <Link href={navigation.brandHref} className={APP_CLASS_NAMES.brand}>
                {navigation.brand}
              </Link>
            </div>

            <div className={APP_CLASS_NAMES.shellHeaderRight}>
              <button
                type="button"
                className={APP_CLASS_NAMES.iconButtonMuted}
                aria-label={navigation.ariaLabels.notifications}
              >
                <BellIcon />
              </button>

              <button
                type="button"
                className={APP_CLASS_NAMES.iconButtonMuted}
                aria-label={navigation.ariaLabels.profile}
              >
                <ProfileIcon />
              </button>
            </div>
          </div>
        </header>

        <div className={APP_CLASS_NAMES.shellViewport}>
          {isMobileSidebarOpen ? <button type="button" aria-label={navigation.ariaLabels.closeSidebar} className={APP_CLASS_NAMES.sidebarOverlay} onClick={closeMobileSidebar} /> : null}

          <aside id="primary-sidebar" className={`${APP_CLASS_NAMES.sidebar} ${sidebarVisibilityClassName} ${sidebarDesktopClassName}`}>
            <div className={APP_CLASS_NAMES.sidebarInner}>
              <div className={APP_CLASS_NAMES.sidebarTop}>
                <span className={APP_CLASS_NAMES.sidebarBrand}>{navigation.brand}</span>
              </div>

              <nav aria-label={navigation.ariaLabels.primaryNavigation}>
                <div className="grid gap-4">
                  {navigationGroups.map((group) => {
                    const groupItems = Array.isArray(group.items) ? group.items : [];

                    return (
                      <div key={group.id} className="grid gap-2">
                        {group.label ? (
                          <span className="px-4 text-xs font-semibold uppercase tracking-wide text-app-text-secondary">
                            {group.label}
                          </span>
                        ) : null}

                        <ul className={APP_CLASS_NAMES.sidebarNav}>
                          {groupItems.map((item) => {
                            const isRootItem = item.href === "/";
                            const isActive = isRootItem
                              ? pathname === item.href
                              : pathname === item.href || pathname.startsWith(`${item.href}/`);
                            const itemClassName = isActive
                              ? `${APP_CLASS_NAMES.sidebarLink} ${APP_CLASS_NAMES.sidebarLinkActive}`
                              : APP_CLASS_NAMES.sidebarLink;

                            return (
                              <li key={item.id} className={APP_CLASS_NAMES.sidebarNavItem}>
                                <Link href={item.href} className={itemClassName} onClick={closeMobileSidebar}>
                                  {item.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </nav>

              <div className={APP_CLASS_NAMES.sidebarFooter}>
                <Link
                  href={ROUTES.auth}
                  className="inline-flex w-full items-center justify-center rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
                >
                  Logout
                </Link>
              </div>
            </div>
          </aside>

          <main className={APP_CLASS_NAMES.wrapper}>
            <div className={APP_CLASS_NAMES.pageContent}>{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}