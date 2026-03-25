const navigationSuperAdmin = {
  brand: "EO Karate",
  brandHref: "/",
  ariaLabels: {
    openSidebar: "Buka sidebar",
    closeSidebar: "Tutup sidebar",
    notifications: "Buka notifikasi",
    profile: "Buka profil",
    primaryNavigation: "Navigasi utama",
  },
  groups: [
    {
      id: "nav-group-main",
      label: "Main Menu",
      items: [
        {
          id: "nav-home",
          label: "Dashboard",
          href: "/",
        },
        {
          id: "nav-users",
          label: "Users",
          href: "/users",
        },
        {
          id: "nav-events",
          label: "Events",
          href: "/events",
        },
      ],
    },
    {
      id: "nav-group-master-data",
      label: "Master Data",
      items: [
        {
          id: "nav-dojos",
          label: "Dojos",
          href: "/dojos",
        },
      ],
    },
  ],
};

const navigationDojoAdmin = {
  brand: "EO Karate",
  brandHref: "/dashboard/dojo",
  ariaLabels: {
    openSidebar: "Buka sidebar",
    closeSidebar: "Tutup sidebar",
    notifications: "Buka notifikasi",
    profile: "Buka profil",
    primaryNavigation: "Navigasi utama",
  },
  groups: [
    {
      id: "nav-group-main",
      label: "Menu Utama",
      items: [
        {
          id: "nav-dashboard",
          label: "Dashboard",
          href: "/dashboard/dojo",
        },
      ],
    },
  ],
};

const getNavigationByRole = (role) => {
  if (role === "dojo_admin") {
    return navigationDojoAdmin;
  }
  // Default to super_admin
  return navigationSuperAdmin;
};

export const PAGE_COPY = Object.freeze({
  navigation: navigationSuperAdmin,
  navigationByRole: getNavigationByRole,
  hero: {
    title: "EO Karate API Starter Dashboard",
    subtitle:
      "Starter frontend berbasis Next.js + Tailwind dengan struktur feature-based yang ringan dan mudah diikuti.",
    note: "Alurnya sederhana: app route -> feature page-data -> feature service -> API client -> component.",
    actions: [
      {
        id: "hero-action-users",
        label: "Buka Users",
        href: "/users",
      },
      {
        id: "hero-action-events",
        label: "Buka Events",
        href: "/events",
      },
      {
        id: "hero-action-dojos",
        label: "Buka Dojos",
        href: "/dojos",
      },
      {
        id: "hero-action-auth",
        label: "Buka Auth",
        href: "/auth",
      },
    ],
  },
  labels: {
    apiBaseUrl: "API Base URL",
    architecture: "Arsitektur",
    fetchMode: "Mode Fetch",
    serviceStatus: "Kondisi Service",
    itemCount: "Jumlah Data",
    direction: "Arah Cursor",
    nextCursor: "Next Cursor",
    prevCursor: "Prev Cursor",
    createdAt: "Dibuat",
    startAt: "Mulai",
    updatedAt: "Diubah",
    id: "ID",
    name: "Nama",
    email: "Email",
    title: "Judul",
    description: "Deskripsi",
    location: "Lokasi",
    limit: "Limit",
    route: "Route",
    endpointMethod: "Method",
    endpointPath: "Path",
    endpointPurpose: "Kegunaan",
  },
  actions: {
    previous: "Sebelumnya",
    next: "Berikutnya",
    reset: "Reset Cursor",
    openUsers: "Buka Users",
    openEvents: "Buka Events",
    openDojos: "Buka Dojos",
    openAuth: "Buka Auth",
  },
  status: {
    online: "Online",
    offline: "Offline",
    unknown: "Unknown",
    healthy: "Healthy",
    unhealthy: "Unhealthy",
  },
  fallback: {
    fetchFailed: "Gagal mengambil data dari API.",
    noUsers: "Belum ada user untuk ditampilkan.",
    noEvents: "Belum ada event untuk ditampilkan.",
    noDojos: "Belum ada dojo untuk ditampilkan.",
    noEndpointData: "Daftar endpoint belum tersedia.",
    noTableData: "Belum ada data untuk tabel ini.",
    notAvailable: "-",
  },
  sections: {
    health: {
      title: "Health Check",
      description: "Memantau status service backend secara langsung.",
    },
    users: {
      title: "Users Preview",
      description: "Preview data users menggunakan cursor pagination.",
    },
    events: {
      title: "Events Preview",
      description: "Preview data events menggunakan cursor pagination.",
    },
    endpoints: {
      title: "Endpoint Registry",
      description:
        "Ringkasan endpoint yang sudah disiapkan pada feature service frontend.",
    },
  },
  architectureMeta: {
    structure: "app -> features -> shared",
    fetchMode: "Server Component (SSR)",
  },
  resourcePages: {
    users: {
      title: "Users Directory",
      description:
        "Daftar user admin dari backend ditampilkan dalam tabel server-rendered dengan cursor pagination.",
      route: "/users",
      endpoint: "GET /api/v1/users",
      emptyMessage: "Belum ada user dari backend.",
      columns: [
        {
          id: "users-column-name",
          label: "User",
          key: "user",
        },
        {
          id: "users-column-role",
          label: "Role",
          key: "role",
        },
        {
          id: "users-column-dojo",
          label: "Dojo",
          key: "dojo",
        },
        {
          id: "users-column-status",
          label: "Status",
          key: "status",
        },
        {
          id: "users-column-last-login",
          label: "Last Login",
          key: "lastLogin",
        },
        {
          id: "users-column-created-at",
          label: "Dibuat",
          key: "createdAt",
        },
        {
          id: "users-column-actions",
          label: "Aksi",
          key: "actions",
        },
      ],
    },
    dojos: {
      title: "Dojos Directory",
      description:
        "Daftar dojo/perguruan master data dengan dukungan upload logo.",
      route: "/dojos",
      endpoint: "GET /api/v1/dojos",
      emptyMessage: "Belum ada dojo dari backend.",
      columns: [
        {
          id: "dojos-column-name",
          label: "Nama Dojo",
          key: "name",
        },
        {
          id: "dojos-column-logo",
          label: "Logo",
          key: "logo",
        },
        {
          id: "dojos-column-created-at",
          label: "Dibuat",
          key: "createdAt",
        },
        {
          id: "dojos-column-updated-at",
          label: "Diubah",
          key: "updatedAt",
        },
        {
          id: "dojos-column-actions",
          label: "Aksi",
          key: "actions",
        },
      ],
    },
    events: {
      title: "Events Directory",
      description:
        "Daftar event dari backend ditampilkan dalam tabel server-rendered dengan cursor pagination.",
      route: "/events",
      endpoint: "GET /api/v1/events",
      emptyMessage: "Belum ada event dari backend.",
      columns: [
        {
          id: "events-column-name",
          label: "Nama Event",
          key: "name",
        },
        {
          id: "events-column-schedule",
          label: "Jadwal",
          key: "schedule",
        },
        {
          id: "events-column-organizer",
          label: "Penyelenggara",
          key: "organizer",
        },
        {
          id: "events-column-location",
          label: "Lokasi",
          key: "location",
        },
        {
          id: "events-column-status",
          label: "Status",
          key: "status",
        },
        {
          id: "events-column-actions",
          label: "Aksi",
          key: "actions",
        },
      ],
    },
  },
  endpointRegistry: [
    {
      id: "health-get",
      method: "GET",
      path: "/api/v1/health",
      purpose: "Cek status service",
    },
    {
      id: "users-list",
      method: "GET",
      path: "/api/v1/users",
      purpose: "List users",
    },
    {
      id: "users-create",
      method: "POST",
      path: "/api/v1/users",
      purpose: "Create user",
    },
    {
      id: "users-detail",
      method: "GET",
      path: "/api/v1/users/:id",
      purpose: "Get user by id",
    },
    {
      id: "users-update",
      method: "PUT",
      path: "/api/v1/users/:id",
      purpose: "Update user",
    },
    {
      id: "users-delete",
      method: "DELETE",
      path: "/api/v1/users/:id",
      purpose: "Delete user",
    },
    {
      id: "auth-register",
      method: "POST",
      path: "/api/v1/auth/register",
      purpose: "Register user",
    },
    {
      id: "auth-login",
      method: "POST",
      path: "/api/v1/auth/login",
      purpose: "Login user",
    },
    {
      id: "dojos-list",
      method: "GET",
      path: "/api/v1/dojos",
      purpose: "List dojos",
    },
    {
      id: "dojos-create",
      method: "POST",
      path: "/api/v1/dojos",
      purpose: "Create dojo",
    },
    {
      id: "dojos-detail",
      method: "GET",
      path: "/api/v1/dojos/:id",
      purpose: "Get dojo by id",
    },
    {
      id: "dojos-update",
      method: "PUT",
      path: "/api/v1/dojos/:id",
      purpose: "Update dojo",
    },
    {
      id: "dojos-delete",
      method: "DELETE",
      path: "/api/v1/dojos/:id",
      purpose: "Delete dojo",
    },
    {
      id: "events-list",
      method: "GET",
      path: "/api/v1/events",
      purpose: "List events",
    },
    {
      id: "events-create",
      method: "POST",
      path: "/api/v1/events",
      purpose: "Create event",
    },
    {
      id: "events-detail",
      method: "GET",
      path: "/api/v1/events/:id",
      purpose: "Get event by id",
    },
  ],
});
