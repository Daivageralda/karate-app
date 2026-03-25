APP_NAME=eo-karate

.PHONY: run build test tidy migrate-up docker-up docker-down

run:
	go run ./cmd/api

build:
	mkdir -p bin
	go build -o ./bin/$(APP_NAME) ./cmd/api

test:
	go test ./...

tidy:
	go mod tidy

migrate-up:
	go run ./cmd/migrate

docker-up:
	docker compose up -d postgres

docker-down:
	docker compose down