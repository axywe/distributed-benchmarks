// Добавьте в main.go обработку маршрута /results/{resultID}:
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"gitlab.com/Taleh/distributed-benchmarks/internal/db"
	"gitlab.com/Taleh/distributed-benchmarks/internal/handlers"
	"gitlab.com/Taleh/distributed-benchmarks/internal/utils"
)

func main() {
	indexTmpl, err := utils.LoadTemplate("web/templates/index.html")
	if err != nil {
		log.Fatalf("Не удалось загрузить шаблон index.html: %v", err)
	}
	handlers.SetTemplate(indexTmpl)

	submitLogsTmpl, err := utils.LoadTemplate("web/templates/submit_and_logs.html")
	if err != nil {
		log.Fatalf("Не удалось загрузить шаблон submit_and_logs.html: %v", err)
	}
	handlers.SetSubmitTemplate(submitLogsTmpl)

	connStr := "postgresql://boela_user:boela_password@localhost:5432/boela_db?sslmode=disable"
	if connStr == "" {
		log.Fatal("Переменная окружения DATABASE_URL не задана")
	}
	if err := db.InitDB(connStr); err != nil {
		log.Fatalf("Ошибка подключения к БД: %v", err)
	}

	resultsDir := "results"
	db.StartCronTask(resultsDir, time.Minute)

	mux := http.NewServeMux()
	mux.HandleFunc("/", handlers.HomeHandler)
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("web"))))
	mux.HandleFunc("/submit", handlers.SubmitHandler)
	mux.HandleFunc("/api/logs/stream", handlers.ContainerLogsHandler)
	mux.HandleFunc("/results/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/download") {
			handlers.ResultDownloadHandler(w, r)
		} else {
			handlers.ResultPageHandler(w, r)
		}
	})

	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
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
