# EO Karate Frontend

Frontend untuk operasional event karate, dibangun dengan Next.js App Router dan arsitektur feature-based.

## Ringkasan

- Framework: Next.js
- UI: React + CSS global
- Bahasa: JavaScript (tanpa TypeScript)
- Fokus: admin panel users, dojos, events, dan dashboard dojo

## Menjalankan Lokal

### Prasyarat

- Node.js LTS
- Backend eo-karate berjalan di lokal

### Setup

1. Install dependencies:

```bash
npm install
```

2. (Opsional) Buat `.env.local` jika ingin override API base URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

3. Jalankan development server:

```bash
npm run dev
```

4. Buka `http://localhost:3000`.

## Environment Variables

| Variable | Wajib | Default | Keterangan |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Tidak | `http://localhost:8080` | Base URL backend API |

Catatan: fallback URL dikonfigurasi di `shared/config/env.js`.

## Scripts

| Command | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server development |
| `npm run build` | Build production |
| `npm run start` | Menjalankan hasil build production |
| `npm run lint` | Menjalankan ESLint |

## Struktur Folder

```text
frontend/
├── app/                  # Route pages dan API route Next.js
├── features/             # Modul per fitur (users, events, dojos, dashboard)
├── shared/
│   ├── components/       # Reusable components lintas fitur
│   ├── config/           # Env, routes, app config, theme
│   ├── services/         # API client umum
│   └── utils/            # Formatter dan utilitas umum
└── public/               # Static assets
```

## Pola Arsitektur

Alur utama data pada halaman:

1. Route di `app/` menjadi entry point halaman.
2. Halaman memanggil page-data/service di `features/<nama-fitur>/`.
3. Service fitur menggunakan API client dari `shared/services/`.
4. Data dipresentasikan oleh komponen fitur atau komponen reusable.

Pola ini menjaga route tetap tipis dan logic domain tetap terisolasi per fitur.

## Integrasi API yang Dipakai

Contoh endpoint backend yang sudah terpakai:

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `GET /api/v1/dojos`
- `POST /api/v1/dojos`
- `GET /api/v1/events`
- `POST /api/v1/events`
- `GET /api/v1/events/:id`

## Prinsip Pengembangan

- Utamakan pemisahan concern: route -> feature -> shared.
- Simpan logic API di service, bukan di komponen presentasi.
- Gunakan konfigurasi terpusat untuk env, route, dan konten statis.
- Hindari hardcoded string berulang di banyak file.

## Troubleshooting Cepat

- Data halaman kosong: cek backend aktif dan nilai `NEXT_PUBLIC_API_BASE_URL`.
- Error CORS/API: pastikan base URL backend sesuai port yang berjalan.
- Route API frontend gagal: validasi path di `app/api/.../route.js`.
