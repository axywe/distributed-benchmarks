package handlers

import (
	"net/http"

	"gitlab.com/Taleh/distributed-benchmarks/internal/db"
	"gitlab.com/Taleh/distributed-benchmarks/internal/helpers"
)

// GET /api/v1/methods
func GetAllOptimizationMethodsHandler(w http.ResponseWriter, r *http.Request) {
	methods, err := db.GetAllOptimizationMethods()
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка получения методов: "+err.Error(), http.StatusInternalServerError)
		return
	}
	helpers.WriteJSONResponse(w, methods, http.StatusOK)
}
