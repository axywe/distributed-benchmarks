package router

import (
	"net/http"

	"github.com/gorilla/mux"
	"gitlab.com/Taleh/distributed-benchmarks/internal/handlers"
	"gitlab.com/Taleh/distributed-benchmarks/internal/middleware"
)

func NewRouter() *mux.Router {
	r := mux.NewRouter()

	// API v1
	api := r.PathPrefix("/api/v1").Subrouter()
	api.Use(middleware.LoggingMiddleware)

	// POST /api/v1/optimization - запускает процесс оптимизации
	api.HandleFunc("/optimization", handlers.OptimizationPostHandler).Methods("POST")

	// GET /api/v1/optimization/results/{id} - получение результата оптимизации
	api.HandleFunc("/optimization/results/{id}", handlers.OptimizationResultHandler).Methods("GET")

	// GET /api/v1/optimization/results/{id}/download - скачивание results.csv
	api.HandleFunc("/optimization/results/{id}/download", handlers.OptimizationDownloadHandler).Methods("GET")

	// GET /api/v1/optimization/logs - поток логов контейнера (query параметр ?container=)
	api.HandleFunc("/optimization/logs", handlers.ContainerLogsHandler).Methods("GET")

	api.HandleFunc("/methods", handlers.GetAllOptimizationMethodsHandler).Methods("GET")

	// Authenticated API
	auth := api.PathPrefix("").Subrouter()
	auth.Use(middleware.AuthMiddleware)

	auth.HandleFunc("/files", handlers.ListFilesHandler).Methods("GET")
	auth.HandleFunc("/files/upload", handlers.UploadFileHandler).Methods("POST")
	auth.HandleFunc("/files/{path:.*}", handlers.DeleteFileHandler).Methods("DELETE")
	auth.HandleFunc("/folders", handlers.CreateFolderHandler).Methods("POST")
	auth.HandleFunc("/files/raw", handlers.RawFileHandler).Methods("GET")

	auth.HandleFunc("/methods", handlers.CreateOptimizationMethodHandler).Methods("POST")
	auth.HandleFunc("/methods/{id}", handlers.DeleteOptimizationMethodHandler).Methods("DELETE")

	// Static files
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("web"))))

	return r
}
