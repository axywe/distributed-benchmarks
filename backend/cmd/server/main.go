package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/handlers"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"gitlab.com/Taleh/distributed-benchmarks/internal/db"
	"gitlab.com/Taleh/distributed-benchmarks/internal/router"
	"gitlab.com/Taleh/distributed-benchmarks/sessions"
)

var RedisClient *redis.Client

func main() {
	_ = godotenv.Load(".env")

	if err := sessions.Init(); err != nil {
		log.Fatalf("Ошибка подключения к Redis: %v", err)
	}

	postgresUser := os.Getenv("POSTGRES_USER")
	postgresPassword := os.Getenv("POSTGRES_PASSWORD")
	postgresDB := os.Getenv("POSTGRES_DB")
	postgresHost := os.Getenv("POSTGRES_HOST")
	postgresPort := os.Getenv("POSTGRES_PORT")
	connStr := fmt.Sprintf(
		"postgresql://%s:%s@%s:%s/%s?sslmode=disable",
		postgresUser, postgresPassword, postgresHost, postgresPort, postgresDB,
	)
	if err := db.InitDB(connStr); err != nil {
		log.Fatalf("Ошибка подключения к БД: %v", err)
	}

	resultsDir := "results"
	db.StartCronTask(resultsDir, time.Minute/6)

	r := router.NewRouter()

	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)

	server := &http.Server{
		Addr:    ":8080",
		Handler: corsHandler(r),
	}

	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Println("Запуск сервера на :8080")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Ошибка запуска сервера: %v", err)
		}
	}()

	<-stopChan
	log.Println("Получен сигнал остановки, завершаем работу сервера...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Ошибка при завершении работы сервера: %v", err)
	}
	log.Println("Сервер остановлен.")
}
