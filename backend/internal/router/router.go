package router

import (
	"net/http"

	"github.com/axywe/distributed-benchmarks/internal/handlers"
	"github.com/axywe/distributed-benchmarks/internal/middleware"
	"github.com/gorilla/mux"
)

func NewRouter() *mux.Router {
	r := mux.NewRouter()

	// API v1
	api := r.PathPrefix("/api/v1").Subrouter()
	api.Use(middleware.LoggingMiddleware)

	// Authentication
	api.HandleFunc("/login", handlers.LoginHandler).Methods("POST")
	api.HandleFunc("/register", handlers.RegisterHandler).Methods("POST")

	// Public API
	api.HandleFunc("/optimization", handlers.OptimizationPostHandler).Methods("POST")
	api.HandleFunc("/optimization/results/{id}", handlers.OptimizationResultHandler).Methods("GET")
	api.HandleFunc("/optimization/results/{id}/download", handlers.OptimizationDownloadHandler).Methods("GET")
	api.HandleFunc("/optimization/logs", handlers.ContainerLogsHandler).Methods("GET")
	api.HandleFunc("/optimization/search", handlers.SearchOptimizationResultsHandler).Methods("GET")

	api.HandleFunc("/methods", handlers.GetAllOptimizationMethodsHandler).Methods("GET")

	// Authenticated API
	auth := api.PathPrefix("").Subrouter()
	auth.Use(middleware.AuthMiddleware)

	auth.HandleFunc("/user", handlers.UserHandler).Methods("GET")

	auth.HandleFunc("/optimization/results", handlers.OptimizationResultsHandler).Methods("GET")

	// Admin API
	admin := auth.PathPrefix("").Subrouter()
	admin.Use(middleware.AuthMiddleware)
	admin.HandleFunc("/files", handlers.ListFilesHandler).Methods("GET")
	admin.HandleFunc("/files/upload", handlers.UploadFileHandler).Methods("POST")
	admin.HandleFunc("/files/{path:.*}", handlers.DeleteFileHandler).Methods("DELETE")
	admin.HandleFunc("/folders", handlers.CreateFolderHandler).Methods("POST")
	admin.HandleFunc("/files/raw", handlers.RawFileHandler).Methods("GET")

	admin.HandleFunc("/methods", handlers.CreateOptimizationMethodHandler).Methods("POST")
	admin.HandleFunc("/methods/{id}", handlers.DeleteOptimizationMethodHandler).Methods("DELETE")

	// Static files
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("web"))))

	return r
}
