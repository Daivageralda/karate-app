package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"eo-karate/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	pool, err := initDB(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer pool.Close()

	if err := ensureMigrationsTable(context.Background(), pool); err != nil {
		log.Fatalf("ensure schema_migrations table: %v", err)
	}

	applied, err := appliedVersions(context.Background(), pool)
	if err != nil {
		log.Fatalf("load applied versions: %v", err)
	}

	entries, err := os.ReadDir(filepath.Join("db", "migrations"))
	if err != nil {
		log.Fatalf("read migrations directory: %v", err)
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		version := entry.Name()
		if applied[version] {
			log.Printf("skip migration %s", version)
			continue
		}

		path := filepath.Join("db", "migrations", version)
		query, err := os.ReadFile(path)
		if err != nil {
			log.Fatalf("read migration %s: %v", version, err)
		}

		tx, err := pool.Begin(context.Background())
		if err != nil {
			log.Fatalf("begin migration %s: %v", version, err)
		}

		if _, err := tx.Exec(context.Background(), string(query)); err != nil {
			_ = tx.Rollback(context.Background())
			log.Fatalf("execute migration %s: %v", version, err)
		}

		if _, err := tx.Exec(context.Background(), "INSERT INTO schema_migrations (version) VALUES ($1)", version); err != nil {
			_ = tx.Rollback(context.Background())
			log.Fatalf("register migration %s: %v", version, err)
		}

		if err := tx.Commit(context.Background()); err != nil {
			log.Fatalf("commit migration %s: %v", version, err)
		}

		log.Printf("applied migration %s", version)
	}
}

func ensureMigrationsTable(ctx context.Context, db *pgxpool.Pool) error {
	_, err := db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func appliedVersions(ctx context.Context, db *pgxpool.Pool) (map[string]bool, error) {
	rows, err := db.Query(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	versions := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		versions[version] = true
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate migration rows: %w", err)
	}

	return versions, nil
}

func initDB(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	dbConfig, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	dbConfig.MaxConns = 10
	dbConfig.MinConns = 2
	dbConfig.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, dbConfig)
	if err != nil {
		return nil, fmt.Errorf("create database pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}
