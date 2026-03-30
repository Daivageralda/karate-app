# eo-karate

Backend project Go + Gin + PostgreSQL dengan simple layered architecture.

## Struktur (Simple Layered Architecture)

```text
.
├── cmd
│   ├── api           # Application entry point
│   └── migrate       # Database migration runner
├── db
│   └── migrations    # SQL migration files
├── internal
│   ├── bootstrap     # Application bootstrap & DI
│   ├── config        # Configuration management
│   ├── handler       # HTTP request handlers & routing
│   ├── service       # Business logic layer
│   ├── db            # Database query layer
│   ├── models        # Data models & types
│   ├── response      # HTTP response formatting
│   ├── utils         # Utilities (pagination, helpers)
├── Dockerfile
├── Makefile
└── docker-compose.yml
```

## Layer Responsibilities

- **handler/**: HTTP request handling, parameter validation, routing
- **service/**: Business logic, validation rules, transaction coordination
- **db/**: Database queries, data persistence operations
- **models/**: Domain entities, input/output types, error definitions
- **response/**: JSON response formatting, status codes
- **utils/**: Shared utilities (pagination, encoding, helpers)

## Architecture Benefits

- **Flat & Clear**: Direct file structure makes code navigation simple
- **Easy to Scale**: Add new features by creating `service/feature.go` and `db/feature.go`
- **Min Boilerplate**: No excessive interfaces or abstractions - just business logic
- **Solo Dev Friendly**: Easy to understand flow and make quick changes
- **Maintains Best Practices**: Clear separation of concerns without overcomplication

## Menjalankan lokal

1. Copy `.env.example` menjadi `.env`.
2. Jalankan PostgreSQL:

```bash
make docker-up
```

3. Install dependency:

```bash
make tidy
```

4. Jalankan migration:

```bash
make migrate-up
```

5. Jalankan API:

```bash
make run
```

## Endpoint contoh

```bash
curl http://localhost:8080/api/v1/health
```

```bash
curl http://localhost:8080/api/v1/docs/pagination
```

```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com"}'
```

```bash
curl "http://localhost:8080/api/v1/users?limit=2&direction=next"
```

```bash
curl -X POST http://localhost:8080/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Karate Camp 2026",
    "description":"Sparring and kata intensive",
    "location":"Jakarta",
    "start_at":"2026-12-01T09:00:00Z"
  }'
```

```bash
curl "http://localhost:8080/api/v1/events?limit=2&direction=next"
```

### Cursor based pagination

Contoh alur standar untuk users:

1. Request pertama:

```bash
curl "http://localhost:8080/api/v1/users?limit=2&direction=next"
```

2. Ambil nilai `data.meta.next_cursor` dari response pertama.

3. Request halaman berikutnya:

```bash
curl "http://localhost:8080/api/v1/users?limit=2&direction=next&cursor=ISI_NEXT_CURSOR"
```

4. Untuk kembali ke halaman sebelumnya, ambil `data.meta.prev_cursor` lalu panggil:

```bash
curl "http://localhost:8080/api/v1/users?limit=2&direction=prev&cursor=ISI_PREV_CURSOR"
```

Alur yang sama berlaku untuk events melalui endpoint `/api/v1/events`.

Contoh response list dengan metadata pagination:

```json
{
  "status": "success",
  "message": "user list",
  "data": {
    "items": [],
    "meta": {
      "limit": 2,
      "direction": "next",
      "next_cursor": "...",
      "prev_cursor": "...",
      "has_next": true,
      "has_prev": false
    }
  }
}
```

Semua response API menggunakan format resource seragam:

```json
{
  "status": "success",
  "message": "user created",
  "data": {
    "id": "..."
  }
}
```

## Catatan

- Module saat ini diinisialisasi sebagai `eo-karate`.
- Jika nanti repo ini akan dipublish, ubah module path dengan `go mod edit -module your/module/path`.

## Integrasi Xendit (Hosted Payment Page)

Flow pembayaran dojo sekarang mendukung invoice hosted dari Xendit (sandbox/production sesuai key yang dipakai).

### Environment Variables

Tambahkan ke `.env`:

```bash
XENDIT_SECRET_KEY=xnd_development_xxx
XENDIT_WEBHOOK_TOKEN=your_callback_token
XENDIT_BASE_URL=https://api.xendit.co
XENDIT_INVOICE_DURATION_HOUR=24
```

### Endpoint API

- Buat/refresh invoice pembayaran dojo:
  - `POST /api/v1/events/:id/dojos/:dojoId/registration-payment/invoice`
- Callback webhook invoice Xendit:
  - `POST /api/v1/webhooks/xendit/invoice`
  - Wajib header: `x-callback-token: <XENDIT_WEBHOOK_TOKEN>`

### Setup Webhook di Xendit

Set callback URL invoice ke endpoint backend kamu, contoh:

```text
https://your-domain.com/api/v1/webhooks/xendit/invoice
```

Set callback verification token sama dengan `XENDIT_WEBHOOK_TOKEN`.