# EO Karate Frontend Starter

Starter frontend berbasis Next.js (JavaScript) + Tailwind CSS dengan struktur feature-based yang ringan untuk solo development.

## Persiapan

1. Copy environment file:

	cp .env.example .env.local

2. Pastikan backend berjalan di base URL yang sama dengan nilai NEXT_PUBLIC_API_BASE_URL.

## Menjalankan Project

1. Install dependency:

	npm install

2. Jalankan mode development:

	npm run dev

3. Buka http://localhost:3000.

## Struktur Arsitektur

- app: route page Next.js yang tipis
- features: folder per fitur seperti home, users, events, health
- shared/components: komponen reusable lintas fitur
- shared/config: env, endpoint, konten UI, route, dan theme
- shared/services: API client reusable
- shared/utils: formatter dan helper pagination/resource page

## Alur Data

1. Route page di folder app menerima request.
2. Route memanggil page-data builder di folder feature.
3. Feature page-data memakai service fitur yang sesuai.
4. Service fitur mengambil data melalui shared API client.
5. Components merender hasil page data.

## Endpoint yang Sudah Dipetakan

- GET /api/v1/health
- GET /api/v1/users
- POST /api/v1/users
- GET /api/v1/users/:id
- GET /api/v1/events
- POST /api/v1/events
- GET /api/v1/events/:id

## Prinsip Implementasi

- JavaScript only (tanpa TypeScript)
- React files memakai JSX
- Struktur utama: app -> features -> shared
- Data fetching dikelompokkan per fitur
- Value warna dipusatkan pada theme variables
- Copy teks UI dipusatkan di konfigurasi
- JSX tetap menghindari hardcode value yang berulang
