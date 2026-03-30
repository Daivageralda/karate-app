package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"eo-karate/internal/config"
	"eo-karate/internal/db"
	"eo-karate/internal/handler"
	"eo-karate/internal/service"
)

// InitDB initializes a database connection
func InitDB(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
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

// App represents the application
type App struct {
	server *http.Server
	db     *pgxpool.Pool
}

// NewApp creates and initializes the application
func NewApp(cfg config.Config) (*App, error) {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	dbPool, err := InitDB(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("init database: %w", err)
	}

	// Initialize DB layer
	userDB := db.NewUserDB(dbPool)
	dojoDB := db.NewDojoDB(dbPool)
	eventDB := db.NewEventDB(dbPool)
	eventKelasTandingDB := db.NewEventKelasTandingDB(dbPool)
	participantDB := db.NewParticipantDB(dbPool)
	kelasTandingDB := db.NewKelasTandingDB(dbPool)

	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		return nil, fmt.Errorf("create upload directory: %w", err)
	}

	// Initialize service layer
	userService := service.NewUserService(userDB, dojoDB)
	dojoService := service.NewDojoService(dojoDB, cfg.UploadDir)
	eventService := service.NewEventService(eventDB, cfg.UploadDir)
	eventKelasTandingService := service.NewEventKelasTandingService(eventKelasTandingDB)
	participantService := service.NewParticipantService(
		participantDB,
		eventDB,
		dojoDB,
		eventKelasTandingDB,
		cfg.UploadDir,
		cfg.XenditSecretKey,
		cfg.XenditWebhookToken,
		cfg.XenditBaseURL,
		cfg.XenditInvoiceDurationHour,
	)
	kelasTandingService := service.NewKelasTandingService(kelasTandingDB)

	// Initialize handler layer
	healthHandler := handler.NewHealthHandler()
	userHandler := handler.NewUserHandler(userService)
	dojoHandler := handler.NewDojoHandler(dojoService)
	eventHandler := handler.NewEventHandler(eventService, eventKelasTandingService)
	participantHandler := handler.NewParticipantHandler(participantService)
	kelasTandingHandler := handler.NewKelasTandingHandler(kelasTandingService)
	docsHandler := handler.NewDocsHandler()

	// Create router
	engine := handler.New(healthHandler, userHandler, dojoHandler, eventHandler, participantHandler, kelasTandingHandler, docsHandler)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           engine,
		ReadHeaderTimeout: 5 * time.Second,
	}

	return &App{
		server: server,
		db:     dbPool,
	}, nil
}

// Run starts the application
func (a *App) Run() error {
	defer a.db.Close()

	errCh := make(chan error, 1)
	go func() {
		log.Printf("HTTP server listening on %s", a.server.Addr)
		if err := a.server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	signalCh := make(chan os.Signal, 1)
	signal.Notify(signalCh, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(signalCh)

	select {
	case err := <-errCh:
		return err
	case sig := <-signalCh:
		log.Printf("received signal %s, shutting down", sig.String())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := a.server.Shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown server: %w", err)
	}

	return nil
}
