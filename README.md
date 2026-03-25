# eo-karate

Monorepo aplikasi event organizer karate dengan dua aplikasi utama:

- `backend`: REST API (Go + Gin + PostgreSQL)
- `frontend`: Web app admin/operasional (Next.js)

## Kenapa Monorepo Ini

- Alur pengembangan backend dan frontend berada dalam satu repository.
- Kontrak API dan integrasi fitur lebih mudah dijaga tetap sinkron.
- Onboarding anggota tim baru lebih cepat karena setup ada di satu tempat.

## Tech Stack

| Layer | Stack |
|---|---|
| Backend API | Go, Gin, PostgreSQL |
| Frontend Web | Next.js (App Router), React |
| Local DB | Docker Compose (PostgreSQL) |

## Struktur Repository

```text
.
├── backend/
│   ├── cmd/
│   ├── db/
│   ├── internal/
│   └── uploads/
├── frontend/
│   ├── app/
│   ├── features/
│   └── shared/
└── README.md
```

## Quick Start (Lokal)

### 1) Jalankan Backend

```bash
cd backend
cp .env.example .env
make docker-up
make tidy
make migrate-up
make run
```

Backend aktif di `http://localhost:8080`.

### 2) Jalankan Frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Frontend aktif di `http://localhost:3000`.

Jika `NEXT_PUBLIC_API_BASE_URL` tidak diisi, frontend otomatis fallback ke `http://localhost:8080`.

## Endpoints Dasar untuk Cek Koneksi

```bash
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/api/v1/docs/pagination
```

## Dokumentasi Per Aplikasi

- Backend lengkap: `backend/README.md`
- Frontend lengkap: `frontend/README.md`

## Workflow Harian (Rekomendasi)

1. Jalankan backend dan frontend bersamaan saat develop fitur.
2. Tambahkan endpoint di backend terlebih dulu, lalu mapping ke service frontend.
3. Validasi alur UI dari list -> detail -> create/edit/delete.
4. Commit per scope kecil agar review lebih cepat.

## Catatan Keamanan Repository

- Folder upload runtime tidak didorong ke repo publik.
- Data contoh untuk demo sebaiknya gunakan dokumen dummy/anonymized.
- Jangan commit `.env` berisi kredensial asli.
