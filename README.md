# eo-karate

Monorepo untuk backend dan frontend.

## Struktur

```text
.
├── backend
└── frontend
```

## Backend

Backend Go + Gin + PostgreSQL ada di folder `backend`.

Menjalankan backend:

```bash
cd backend
make tidy
make migrate-up
make run
```

Dokumentasi pagination endpoint:

```bash
curl http://localhost:8080/api/v1/docs/pagination
```
